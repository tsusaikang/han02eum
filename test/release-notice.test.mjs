import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RELEASE_STORAGE_KEY,
  createReleaseLoader,
  createReleaseNoticeController,
  createReleaseNoticeSession,
  createReleaseNoticeView,
  initializeReleaseNotice,
  validateReleaseMetadata
} from "../public/release-notice.js";

const RELEASE_RAW = JSON.parse(await readFile("public/release.json", "utf8"));
const RELEASE = validateReleaseMetadata(RELEASE_RAW);

function createStorage(initialValue = null) {
  let value = initialValue;
  const writes = [];
  return {
    writes,
    getItem(key) {
      assert.equal(key, RELEASE_STORAGE_KEY);
      return value;
    },
    setItem(key, nextValue) {
      assert.equal(key, RELEASE_STORAGE_KEY);
      value = nextValue;
      writes.push(nextValue);
    }
  };
}

function createView() {
  let manualOpenHandler = () => {};
  let closeHandler = () => {};
  return {
    rendered: null,
    hidden: false,
    opens: [],
    render(metadata) {
      this.rendered = metadata;
    },
    hide() {
      this.hidden = true;
    },
    open(options) {
      this.opens.push(options);
      return true;
    },
    onManualOpen(handler) {
      manualOpenHandler = handler;
    },
    onClose(handler) {
      closeHandler = handler;
    },
    triggerManualOpen() {
      return manualOpenHandler();
    },
    triggerClose() {
      closeHandler();
    }
  };
}

function createController({ seen = null, storage = createStorage(seen), view = createView(), session } = {}) {
  const controller = createReleaseNoticeController({
    loadRelease: async () => RELEASE,
    storage,
    view,
    session: session || createReleaseNoticeSession()
  });
  return { controller, storage, view };
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(documentRef, id = "") {
    this.documentRef = documentRef;
    this.id = id;
    this.listeners = new Map();
    this.attributes = new Map();
    this.children = [];
    this.classList = new FakeClassList();
    this.hidden = true;
    this.isConnected = true;
    this.textContent = "";
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) || []) handler({ type, ...event });
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  append(child) {
    this.children.push(child);
  }

  focus() {
    this.documentRef.activeElement = this;
  }
}

function createFakeDocument({ nativeDialog = false } = {}) {
  const listeners = new Map();
  const documentRef = {
    activeElement: null,
    elements: new Map(),
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    dispatch(type, event = {}) {
      for (const handler of listeners.get(type) || []) handler({ type, ...event });
    },
    querySelector(selector) {
      return this.elements.get(selector) || null;
    },
    createElement() {
      return new FakeElement(this);
    }
  };
  documentRef.body = new FakeElement(documentRef, "body");

  for (const id of [
    "release-notice-trigger",
    "release-notice-dialog",
    "release-notice-version",
    "release-notice-title",
    "release-notice-changes",
    "release-notice-close"
  ]) {
    documentRef.elements.set(`#${id}`, new FakeElement(documentRef, id));
  }

  const dialog = documentRef.elements.get("#release-notice-dialog");
  if (nativeDialog) {
    dialog.open = false;
    dialog.showModal = () => {
      dialog.open = true;
      dialog.setAttribute("open", "");
    };
    dialog.close = () => {
      dialog.open = false;
      dialog.removeAttribute("open");
      dialog.dispatch("close");
    };
  }

  return documentRef;
}

test("release.json is the strict 0.3.0 source and package mirrors match", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));

  assert.deepEqual(Object.keys(RELEASE_RAW).sort(), ["changes", "releasedAt", "schemaVersion", "title", "version"]);
  assert.equal(RELEASE_RAW.schemaVersion, 1);
  assert.equal(RELEASE_RAW.version, "0.3.0");
  assert.equal(RELEASE_RAW.releasedAt, "2026-08-24");
  assert.equal(RELEASE_RAW.title, "한영이음 v0.3.0 업데이트");
  assert.deepEqual(RELEASE_RAW.changes, [
    "페이지 하단에서 현재 버전을 확인할 수 있어요.",
    "새 버전을 처음 만날 때 업데이트 내용을 한 번 안내해요.",
    "버전 버튼을 눌러 업데이트 내용을 언제든 다시 열 수 있어요.",
    "단어 검색과 사전 데이터는 기존과 동일하게 유지돼요."
  ]);
  assert.deepEqual(RELEASE, RELEASE_RAW);
  assert.equal(packageJson.version, RELEASE.version);
  assert.equal(packageLock.version, RELEASE.version);
  assert.equal(packageLock.packages[""].version, RELEASE.version);
});

test("metadata validator rejects open shapes and malformed fields", () => {
  assert.equal(validateReleaseMetadata({ ...RELEASE, extra: true }), null);
  assert.equal(validateReleaseMetadata({ ...RELEASE, schemaVersion: 2 }), null);
  assert.equal(validateReleaseMetadata({ ...RELEASE, version: "v0.3.0" }), null);
  assert.equal(validateReleaseMetadata({ ...RELEASE, releasedAt: "2026-02-30" }), null);
  assert.equal(validateReleaseMetadata({ ...RELEASE, title: " padded " }), null);
  assert.equal(validateReleaseMetadata({ ...RELEASE, changes: [] }), null);
  assert.equal(validateReleaseMetadata({ ...RELEASE, changes: ["ok", ""] }), null);
});

test("loader requests same-origin metadata without cache", async () => {
  const calls = [];
  const loader = createReleaseLoader({
    fetchImpl: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => RELEASE };
    }
  });

  assert.equal((await loader()).version, "0.3.0");
  assert.deepEqual(calls, [["/release.json", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  }]]);
});

test("first visit auto-opens once and close persists the current version", async () => {
  const { controller, storage, view } = createController();
  const result = await controller.initialize();

  assert.equal(result.status, "ready");
  assert.equal(result.automaticOpen, true);
  assert.deepEqual(view.opens, [{ automatic: true }]);
  assert.equal(view.rendered.version, "0.3.0");
  view.triggerClose();
  assert.deepEqual(storage.writes, ["0.3.0"]);

  await controller.initialize();
  assert.equal(view.opens.length, 1);
});

test("same version stays quiet while manual reopen always works", async () => {
  const { controller, view } = createController({ seen: "0.3.0" });
  const result = await controller.initialize();
  assert.equal(result.automaticOpen, false);
  assert.deepEqual(view.opens, []);

  assert.equal(view.triggerManualOpen(), true);
  assert.equal(view.triggerManualOpen(), true);
  assert.deepEqual(view.opens, [{ automatic: false }, { automatic: false }]);
});

test("manual open failures stay isolated", async () => {
  const view = createView();
  view.open = () => { throw new Error("dialog unavailable"); };
  const { controller } = createController({ seen: "0.3.0", view });
  assert.equal((await controller.initialize()).status, "ready");
  assert.equal(controller.openManually(), false);
});

test("a changed stored version auto-opens", async () => {
  const { controller, view } = createController({ seen: "0.2.0" });
  await controller.initialize();
  assert.deepEqual(view.opens, [{ automatic: true }]);
});

test("automatic open is recorded only after explicit success and can retry on the same page", async (t) => {
  for (const firstResult of [false, new Error("showModal failed")]) {
    await t.test(firstResult === false ? "open returns false" : "open throws", async () => {
      const view = createView();
      let attempts = 0;
      view.open = (options) => {
        view.opens.push(options);
        attempts += 1;
        if (attempts === 1 && firstResult instanceof Error) throw firstResult;
        return attempts > 1;
      };
      const session = createReleaseNoticeSession();
      const controller = createReleaseNoticeController({
        loadRelease: async () => RELEASE,
        storage: createStorage(),
        view,
        session
      });

      const first = await controller.initialize();
      assert.equal(first.automaticOpen, false);
      assert.equal(session.autoOpenedVersions.has(RELEASE.version), false);

      const second = await controller.initialize();
      assert.equal(second.automaticOpen, true);
      assert.equal(session.autoOpenedVersions.has(RELEASE.version), true);
      assert.deepEqual(view.opens, [{ automatic: true }, { automatic: true }]);
    });
  }
});

test("native showModal failure hides the trigger and a rerendered retry can recover", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const dialog = documentRef.elements.get("#release-notice-dialog");
  let triggerWasVisibleAtOpen = false;
  dialog.showModal = () => {
    triggerWasVisibleAtOpen = !trigger.hidden;
    throw new Error("native dialog failed");
  };

  const view = createReleaseNoticeView({ documentRef });
  const controller = createReleaseNoticeController({
    loadRelease: async () => RELEASE,
    storage: createStorage(),
    view,
    session: createReleaseNoticeSession()
  });

  const failed = await controller.initialize();
  assert.equal(triggerWasVisibleAtOpen, true);
  assert.equal(failed.automaticOpen, false);
  assert.equal(trigger.hidden, true);
  assert.equal(dialog.open, false);

  dialog.showModal = () => {
    dialog.open = true;
    dialog.setAttribute("open", "");
  };
  const recovered = await controller.initialize();
  assert.equal(recovered.automaticOpen, true);
  assert.equal(trigger.hidden, false);
  assert.equal(trigger.textContent, "v0.3.0 업데이트 내용");
  assert.equal(dialog.open, true);
});

test("storage get, set, and corrupt values fail soft", async (t) => {
  await t.test("getItem throws", async () => {
    const view = createView();
    const controller = createReleaseNoticeController({
      loadRelease: async () => RELEASE,
      storage: { getItem() { throw new Error("denied"); } },
      view,
      session: createReleaseNoticeSession()
    });
    assert.equal((await controller.initialize()).status, "ready");
    assert.equal(view.opens.length, 1);
  });

  await t.test("setItem throws", async () => {
    const view = createView();
    const controller = createReleaseNoticeController({
      loadRelease: async () => RELEASE,
      storage: { getItem: () => null, setItem() { throw new Error("quota"); } },
      view,
      session: createReleaseNoticeSession()
    });
    await controller.initialize();
    assert.doesNotThrow(() => view.triggerClose());
    assert.equal(view.triggerManualOpen(), true);
  });

  await t.test("corrupt value is treated as unseen", async () => {
    const { controller, view } = createController({ seen: "{not-a-version}" });
    await controller.initialize();
    assert.equal(view.opens.length, 1);
  });
});

test("fetch, non-ok, JSON, and schema failures hide only the release UI", async (t) => {
  const cases = [
    async () => { throw new Error("offline"); },
    async () => ({ ok: false, json: async () => RELEASE }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError("bad json"); } }),
    async () => ({ ok: true, json: async () => ({ ...RELEASE, unexpected: true }) })
  ];

  for (const [index, fetchImpl] of cases.entries()) {
    await t.test(`failure ${index + 1}`, async () => {
      const view = createView();
      const controller = createReleaseNoticeController({
        loadRelease: createReleaseLoader({ fetchImpl }),
        storage: createStorage(),
        view,
        session: createReleaseNoticeSession()
      });
      assert.deepEqual(await controller.initialize(), {
        status: "unavailable",
        metadata: null,
        automaticOpen: false
      });
      assert.equal(view.hidden, true);
      assert.equal(view.opens.length, 0);
    });
  }
});

test("a shared page session prevents duplicate automatic opens", async () => {
  const session = createReleaseNoticeSession();
  const first = createController({ session });
  const second = createController({ session });

  await first.controller.initialize();
  await second.controller.initialize();
  assert.equal(first.view.opens.length, 1);
  assert.equal(second.view.opens.length, 0);
  assert.equal(second.controller.openManually(), true);
  assert.equal(second.view.opens.length, 1);
});

test("unsupported dialog keeps the release UI hidden without fetch or storage access", async () => {
  const documentRef = createFakeDocument();
  const trigger = documentRef.elements.get("#release-notice-trigger");
  trigger.hidden = false;
  let fetchCalls = 0;
  let storageCalls = 0;

  const result = await initializeReleaseNotice({
    documentRef,
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true, json: async () => RELEASE_RAW };
    },
    storage: {
      getItem() {
        storageCalls += 1;
        return null;
      }
    },
    session: createReleaseNoticeSession()
  });

  assert.deepEqual(result, { status: "unavailable", metadata: null, automaticOpen: false });
  assert.equal(trigger.hidden, true);
  assert.equal(fetchCalls, 0);
  assert.equal(storageCalls, 0);
});

test("document initialization is idempotent and binds one close persistence path", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const dialog = documentRef.elements.get("#release-notice-dialog");
  const closeButton = documentRef.elements.get("#release-notice-close");
  const storage = createStorage();
  const session = createReleaseNoticeSession();
  let fetchCalls = 0;
  const options = {
    documentRef,
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true, json: async () => RELEASE_RAW };
    },
    storage,
    session
  };

  const first = initializeReleaseNotice(options);
  const second = initializeReleaseNotice(options);
  assert.equal(first, second);
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(firstResult, secondResult);
  assert.equal(firstResult.automaticOpen, true);
  assert.equal(fetchCalls, 1);
  assert.equal(trigger.listeners.get("click").length, 1);
  assert.equal(closeButton.listeners.get("click").length, 1);
  assert.equal(dialog.listeners.get("close").length, 1);
  assert.equal(dialog.listeners.get("keydown").length, 1);
  assert.equal(dialog.listeners.get("cancel").length, 1);

  dialog.close();
  assert.deepEqual(storage.writes, ["0.3.0"]);

  const third = await initializeReleaseNotice(options);
  assert.equal(third.automaticOpen, false);
  assert.equal(fetchCalls, 1);
  assert.deepEqual(storage.writes, ["0.3.0"]);
});

test("failed document initialization is retryable without rebinding listeners", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const dialog = documentRef.elements.get("#release-notice-dialog");
  let fetchCalls = 0;
  const options = {
    documentRef,
    fetchImpl: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) throw new Error("offline");
      return { ok: true, json: async () => RELEASE_RAW };
    },
    storage: createStorage(),
    session: createReleaseNoticeSession()
  };

  assert.equal((await initializeReleaseNotice(options)).status, "unavailable");
  const retried = await initializeReleaseNotice(options);
  assert.equal(retried.status, "ready");
  assert.equal(retried.automaticOpen, true);
  assert.equal(fetchCalls, 2);
  assert.equal(trigger.listeners.get("click").length, 1);
  assert.equal(dialog.listeners.get("close").length, 1);
});

test("Escape closes exactly once, persists, restores focus, and is a closed-state no-op", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const dialog = documentRef.elements.get("#release-notice-dialog");
  documentRef.activeElement = trigger;
  const storage = createStorage();
  const nativeClose = dialog.close;
  let closeCalls = 0;
  dialog.close = () => {
    closeCalls += 1;
    nativeClose();
  };
  const view = createReleaseNoticeView({ documentRef });
  const controller = createReleaseNoticeController({
    loadRelease: async () => RELEASE,
    storage,
    view,
    session: createReleaseNoticeSession()
  });
  await controller.initialize();

  let prevented = 0;
  let stopped = 0;
  dialog.dispatch("keydown", {
    key: "/",
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; }
  });
  assert.equal(dialog.open, true);
  assert.equal(prevented, 0);
  assert.equal(stopped, 1);

  dialog.dispatch("keydown", {
    key: "Escape",
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; }
  });
  assert.equal(prevented, 1);
  assert.equal(stopped, 2);
  assert.equal(closeCalls, 1);
  assert.equal(dialog.open, false);
  assert.deepEqual(storage.writes, ["0.3.0"]);
  assert.equal(documentRef.activeElement, trigger);

  dialog.dispatch("keydown", {
    key: "Escape",
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; }
  });
  dialog.dispatch("cancel", {
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; }
  });
  assert.equal(prevented, 1);
  assert.equal(stopped, 2);
  assert.equal(closeCalls, 1);
  assert.deepEqual(storage.writes, ["0.3.0"]);
});

test("native cancel closes exactly once through the shared persistence path", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const dialog = documentRef.elements.get("#release-notice-dialog");
  documentRef.activeElement = trigger;
  const storage = createStorage();
  const nativeClose = dialog.close;
  let closeCalls = 0;
  dialog.close = () => {
    closeCalls += 1;
    nativeClose();
  };
  const view = createReleaseNoticeView({ documentRef });
  const controller = createReleaseNoticeController({
    loadRelease: async () => RELEASE,
    storage,
    view,
    session: createReleaseNoticeSession()
  });
  await controller.initialize();

  let prevented = 0;
  let stopped = 0;
  dialog.dispatch("cancel", {
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; }
  });
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(closeCalls, 1);
  assert.equal(dialog.open, false);
  assert.deepEqual(storage.writes, ["0.3.0"]);
  assert.equal(documentRef.activeElement, trigger);
});

test("native close and manual paths persist, restore focus, and reject duplicate opens", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const dialog = documentRef.elements.get("#release-notice-dialog");
  const closeButton = documentRef.elements.get("#release-notice-close");
  documentRef.activeElement = trigger;
  const storage = createStorage();
  const view = createReleaseNoticeView({ documentRef });
  const controller = createReleaseNoticeController({
    loadRelease: async () => RELEASE,
    storage,
    view,
    session: createReleaseNoticeSession()
  });

  await controller.initialize();
  assert.equal(dialog.open, true);
  assert.equal(controller.openManually(), false);

  dialog.close();
  assert.equal(dialog.open, false);
  assert.deepEqual(storage.writes, ["0.3.0"]);
  assert.equal(documentRef.activeElement, trigger);

  documentRef.activeElement = trigger;
  assert.equal(controller.openManually(), true);
  assert.equal(controller.openManually(), false);
  closeButton.dispatch("click");
  assert.equal(dialog.open, false);
  assert.deepEqual(storage.writes, ["0.3.0", "0.3.0"]);
  assert.equal(documentRef.activeElement, trigger);
});

test("native close failure stays open and retryable without a false persistence write", async () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const dialog = documentRef.elements.get("#release-notice-dialog");
  const closeButton = documentRef.elements.get("#release-notice-close");
  const storage = createStorage();
  const view = createReleaseNoticeView({ documentRef });
  const controller = createReleaseNoticeController({
    loadRelease: async () => RELEASE,
    storage,
    view,
    session: createReleaseNoticeSession()
  });
  await controller.initialize();

  const workingClose = dialog.close;
  dialog.close = () => { throw new Error("native close failed"); };
  let prevented = 0;
  let stopped = 0;
  assert.doesNotThrow(() => dialog.dispatch("keydown", {
    key: "Escape",
    preventDefault() { prevented += 1; },
    stopPropagation() { stopped += 1; }
  }));
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(dialog.open, true);
  assert.deepEqual(storage.writes, []);
  assert.equal(controller.openManually(), false);

  dialog.close = workingClose;
  closeButton.dispatch("click");
  assert.equal(dialog.open, false);
  assert.deepEqual(storage.writes, ["0.3.0"]);
});

test("hostile release strings stay literal on the textContent rendering path", () => {
  const documentRef = createFakeDocument({ nativeDialog: true });
  const trigger = documentRef.elements.get("#release-notice-trigger");
  const title = documentRef.elements.get("#release-notice-title");
  const changes = documentRef.elements.get("#release-notice-changes");
  const view = createReleaseNoticeView({ documentRef });
  const hostile = validateReleaseMetadata({
    schemaVersion: 1,
    version: "9.9.9",
    releasedAt: "2026-08-24",
    title: "<img src=x onerror=alert(1)>",
    changes: ["<script>alert(1)</script>"]
  });

  view.render(hostile);
  assert.equal(trigger.textContent, "v9.9.9 업데이트 내용");
  assert.equal(title.textContent, "<img src=x onerror=alert(1)>");
  assert.equal(changes.children.length, 1);
  assert.equal(changes.children[0].textContent, "<script>alert(1)</script>");
  assert.equal(changes.children[0].children.length, 0);
});

test("page source integrates accessible IDs without innerHTML or search coupling", async () => {
  const [html, appSource, noticeSource, styles] = await Promise.all([
    readFile("public/index.html", "utf8"),
    readFile("public/app.js", "utf8"),
    readFile("public/release-notice.js", "utf8"),
    readFile("public/styles.css", "utf8")
  ]);

  for (const id of [
    "release-notice-trigger",
    "release-notice-dialog",
    "release-notice-version",
    "release-notice-title",
    "release-notice-description",
    "release-notice-changes",
    "release-notice-close"
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /aria-labelledby="release-notice-title"/);
  assert.match(html, /aria-describedby="release-notice-description release-notice-changes"/);
  assert.match(appSource, /import \{ initializeReleaseNotice \} from "\.\/release-notice\.js"/);
  assert.match(appSource, /initializeReleaseNotice\(\)\.catch/);
  assert.doesNotMatch(noticeSource, /\.innerHTML\b/);
  assert.doesNotMatch(noticeSource, /dialog\.addEventListener\("click"/);
  assert.match(styles, /\.release-notice-dialog::backdrop/);
  assert.match(styles, /\.release-notice-close:focus-visible/);
  assert.doesNotMatch(styles, /is-dialog-fallback|has-release-dialog/);
  assert.match(noticeSource, /dialog\.addEventListener\("keydown"/);
  assert.match(noticeSource, /dialog\.addEventListener\("cancel"/);
  assert.doesNotMatch(noticeSource, /documentRef\.addEventListener\("keydown"/);
  assert.match(noticeSource, /typeof dialog\.showModal === "function" && typeof dialog\.close === "function"/);
  assert.match(styles, /\.release-notice-trigger\s*\{[^}]*display:\s*inline-flex;[^}]*min-block-size:\s*44px;[^}]*padding:\s*8px 12px;/s);
});
