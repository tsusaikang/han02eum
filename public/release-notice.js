export const RELEASE_STORAGE_KEY = "han02eum:last-seen-release";

const RELEASE_URL = "/release.json";
const RELEASE_KEYS = ["changes", "releasedAt", "schemaVersion", "title", "version"];
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const defaultPageSession = createReleaseNoticeSession();
const documentInitializations = new WeakMap();

function hasExactKeys(value, expectedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === expectedKeys[index]);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateReleaseMetadata(value) {
  if (!hasExactKeys(value, RELEASE_KEYS)) return null;
  if (value.schemaVersion !== 1) return null;
  if (typeof value.version !== "string" || !VERSION_PATTERN.test(value.version)) return null;
  if (!isCalendarDate(value.releasedAt)) return null;
  if (!isNonEmptyString(value.title)) return null;
  if (!Array.isArray(value.changes) || value.changes.length === 0) return null;
  if (!value.changes.every(isNonEmptyString)) return null;

  return Object.freeze({
    schemaVersion: value.schemaVersion,
    version: value.version,
    releasedAt: value.releasedAt,
    title: value.title,
    changes: Object.freeze([...value.changes])
  });
}

export function createReleaseNoticeSession() {
  return { autoOpenedVersions: new Set() };
}

export function createReleaseLoader({ fetchImpl, url = RELEASE_URL } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");

  return async function loadRelease() {
    const response = await fetchImpl(url, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    if (!response || response.ok !== true || typeof response.json !== "function") {
      throw new Error("Release metadata request failed");
    }

    const metadata = validateReleaseMetadata(await response.json());
    if (!metadata) throw new Error("Release metadata is invalid");
    return metadata;
  };
}

function readLastSeenVersion(storage, key) {
  try {
    const value = storage?.getItem?.(key);
    return typeof value === "string" && VERSION_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLastSeenVersion(storage, key, version) {
  try {
    storage?.setItem?.(key, version);
  } catch {
    // Storage is an optional enhancement; private mode and quotas must not break the page.
  }
}

export function createReleaseNoticeController({
  loadRelease,
  storage,
  view,
  session = defaultPageSession,
  storageKey = RELEASE_STORAGE_KEY
}) {
  if (typeof loadRelease !== "function") throw new TypeError("loadRelease must be a function");
  if (!view || typeof view.render !== "function" || typeof view.open !== "function") {
    throw new TypeError("view must implement the release notice interface");
  }
  if (!(session?.autoOpenedVersions instanceof Set)) {
    throw new TypeError("session must contain an autoOpenedVersions Set");
  }

  let currentRelease = null;
  let initialization = null;

  const openManually = () => {
    if (!currentRelease) return false;
    try {
      return view.open({ automatic: false }) !== false;
    } catch {
      return false;
    }
  };

  view.onManualOpen?.(openManually);
  view.onClose?.(() => {
    if (currentRelease) writeLastSeenVersion(storage, storageKey, currentRelease.version);
  });

  const initialize = () => {
    if (initialization) return initialization;

    initialization = (async () => {
      try {
        if (!currentRelease) {
          const metadata = validateReleaseMetadata(await loadRelease());
          if (!metadata) throw new Error("Release metadata is invalid");
          view.render(metadata);
          currentRelease = metadata;
        } else {
          view.render(currentRelease);
        }

        const lastSeen = readLastSeenVersion(storage, storageKey);
        const alreadyAutoOpened = session.autoOpenedVersions.has(currentRelease.version);
        let automaticOpen = false;
        if (lastSeen !== currentRelease.version && !alreadyAutoOpened) {
          try {
            automaticOpen = view.open({ automatic: true }) === true;
          } catch {
            automaticOpen = false;
          }
          if (automaticOpen) session.autoOpenedVersions.add(currentRelease.version);
        }

        return { status: "ready", metadata: currentRelease, automaticOpen };
      } catch {
        currentRelease = null;
        try {
          view.hide?.();
        } catch {
          // The release UI is optional and remains isolated from dictionary search.
        }
        return { status: "unavailable", metadata: null, automaticOpen: false };
      } finally {
        initialization = null;
      }
    })();

    return initialization;
  };

  return {
    initialize,
    openManually,
    getCurrentRelease: () => currentRelease
  };
}

export function createReleaseNoticeView({ documentRef = globalThis.document } = {}) {
  if (!documentRef) return null;

  const trigger = documentRef.querySelector("#release-notice-trigger");
  const dialog = documentRef.querySelector("#release-notice-dialog");
  const version = documentRef.querySelector("#release-notice-version");
  const title = documentRef.querySelector("#release-notice-title");
  const changes = documentRef.querySelector("#release-notice-changes");
  const closeButton = documentRef.querySelector("#release-notice-close");
  if (!trigger || !dialog || !version || !title || !changes || !closeButton) return null;

  const supportsNativeDialog = typeof dialog.showModal === "function" && typeof dialog.close === "function";
  if (!supportsNativeDialog) {
    trigger.hidden = true;
    return null;
  }

  let closeHandler = () => {};
  let manualOpenHandler = () => {};
  let isOpen = false;
  let returnFocusTarget = null;

  function restoreFocus() {
    const target = returnFocusTarget;
    returnFocusTarget = null;
    if (target && target.isConnected !== false && typeof target.focus === "function") {
      target.focus();
    }
  }

  function finishClose() {
    if (!isOpen) return;
    isOpen = false;
    try {
      closeHandler();
    } finally {
      restoreFocus();
    }
  }

  function close() {
    if (!isOpen) return;
    if (dialog.open) {
      try {
        dialog.close();
      } catch {
        // Keep the dialog open and retryable without recording a false close.
      }
      return;
    }
    finishClose();
  }

  function dismissWithKeyboard(event) {
    if (!isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  }

  trigger.addEventListener("click", () => manualOpenHandler());
  closeButton.addEventListener("click", close);
  dialog.addEventListener("close", finishClose);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismissWithKeyboard(event);
    else if (isOpen && event.key === "/") event.stopPropagation();
  });
  dialog.addEventListener("cancel", dismissWithKeyboard);

  return {
    render(metadata) {
      trigger.textContent = `v${metadata.version} 업데이트 내용`;
      version.textContent = `v${metadata.version} · ${metadata.releasedAt}`;
      title.textContent = metadata.title;
      changes.replaceChildren();
      for (const change of metadata.changes) {
        const item = documentRef.createElement("li");
        item.textContent = change;
        changes.append(item);
      }
      trigger.hidden = false;
    },
    hide() {
      trigger.hidden = true;
      close();
    },
    open() {
      if (isOpen || dialog.open) return false;
      returnFocusTarget = documentRef.activeElement;
      isOpen = true;
      try {
        dialog.showModal();
      } catch {
        isOpen = false;
        returnFocusTarget = null;
        trigger.hidden = true;
        return false;
      }
      closeButton.focus();
      return true;
    },
    onManualOpen(handler) {
      manualOpenHandler = typeof handler === "function" ? handler : () => {};
    },
    onClose(handler) {
      closeHandler = typeof handler === "function" ? handler : () => {};
    }
  };
}

export function initializeReleaseNotice({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  storage,
  documentRef = globalThis.document,
  session = defaultPageSession
} = {}) {
  const unavailable = { status: "unavailable", metadata: null, automaticOpen: false };
  if (!documentRef || (typeof documentRef !== "object" && typeof documentRef !== "function")) {
    return Promise.resolve(unavailable);
  }

  const existing = documentInitializations.get(documentRef);
  if (existing?.promise) return existing.promise;

  if (existing) {
    const promise = existing.controller.initialize().catch(() => unavailable);
    existing.promise = promise;
    promise.finally(() => {
      if (existing.promise === promise) existing.promise = null;
    });
    return promise;
  }

  if (typeof fetchImpl !== "function") {
    return Promise.resolve(unavailable);
  }

  const view = createReleaseNoticeView({ documentRef });
  if (!view) {
    return Promise.resolve(unavailable);
  }

  let resolvedStorage = storage;
  if (resolvedStorage === undefined) {
    try {
      resolvedStorage = globalThis.localStorage;
    } catch {
      resolvedStorage = null;
    }
  }

  const controller = createReleaseNoticeController({
    loadRelease: createReleaseLoader({ fetchImpl }),
    storage: resolvedStorage,
    view,
    session
  });
  const entry = { controller, promise: null };
  documentInitializations.set(documentRef, entry);
  const promise = controller.initialize().catch(() => unavailable);
  entry.promise = promise;
  promise.finally(() => {
    if (entry.promise === promise) entry.promise = null;
  });
  return promise;
}
