import { detectInputLanguage, parseWiktionaryEntry } from "./dictionary-parser.js";
import { initializeReleaseNotice } from "./release-notice.js";
import {
  findVerifiedSupplements,
  renderMeaningSummary,
  renderVerifiedSupplements
} from "./verified-supplements.js";
import { loadContextExpressions, renderContextExpressions } from "./context-relations.js";

const ui = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#search-input"),
  lookupArea: document.querySelector("#lookup-area"),
  empty: document.querySelector("#empty-state"),
  loading: document.querySelector("#loading-state"),
  message: document.querySelector("#message-state"),
  messageTitle: document.querySelector("#message-title"),
  messageCopy: document.querySelector("#message-copy"),
  result: document.querySelector("#result"),
  direction: document.querySelector("#result-direction"),
  word: document.querySelector("#result-word"),
  pronunciations: document.querySelector("#pronunciation-list"),
  audioButton: document.querySelector("#audio-button"),
  translationSection: document.querySelector("#translation-section"),
  translationTitle: document.querySelector("#translation-title"),
  translations: document.querySelector("#translation-list"),
  verifiedSupplements: document.querySelector("#verified-supplements"),
  contextExpressions: document.querySelector("#context-expression-section"),
  definitionsSection: document.querySelector("#definitions-section"),
  definitionKicker: document.querySelector("#definitions-kicker"),
  definitionCount: document.querySelector("#definition-count"),
  definitionGroups: document.querySelector("#definition-groups"),
  sourceNote: document.querySelector("#source-note"),
  sourceDescription: document.querySelector("#source-description"),
  sourceLink: document.querySelector("#source-link")
};

let activeRequest = null;
let currentEntry = null;
let currentAudio = null;

function setView(name) {
  const views = {
    empty: ui.empty,
    loading: ui.loading,
    message: ui.message,
    result: ui.result
  };
  for (const [key, element] of Object.entries(views)) {
    element.classList.toggle("is-hidden", key !== name);
  }
  ui.lookupArea.setAttribute("aria-busy", name === "loading" ? "true" : "false");
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showMessage(title, copy) {
  ui.messageTitle.textContent = title;
  ui.messageCopy.textContent = copy;
  setView("message");
}

function renderPronunciations(entry) {
  ui.pronunciations.replaceChildren();
  const values = entry.pronunciations.length
    ? entry.pronunciations.slice(0, 3)
    : [entry.language === "ko" ? "발음 표기 없음" : "IPA 표기 없음"];
  for (const value of values) ui.pronunciations.append(makeElement("span", "", value));
}

function renderTranslations(entry, supplements = []) {
  const summary = renderMeaningSummary(ui.translations, entry, supplements);
  ui.translationTitle.textContent = summary.title;
  ui.translationSection.classList.toggle(
    "is-hidden",
    entry.language !== "en" && !summary.meaningCount
  );

  if (!summary.meaningCount) {
    if (supplements.length || entry.language !== "en") return;
    const message = makeElement("p", "empty-detail", "이 항목에는 아직 한국어 번역이 등록되지 않았습니다. 영영 뜻은 아래에서 확인할 수 있어요.");
    ui.translations.append(message);
  }
}

function renderDefinitionGroups(entry) {
  ui.definitionGroups.replaceChildren();
  const total = entry.definitionGroups.reduce((sum, group) => sum + group.definitions.length, 0);
  ui.definitionKicker.textContent = entry.language === "ko" ? "영어 뜻 · English meanings" : "영영 뜻 · English definitions";
  ui.definitionCount.textContent = total ? `${total} meanings` : "0 meanings";

  if (!entry.definitionGroups.length) {
    ui.definitionGroups.append(
      makeElement("p", "empty-detail", "뜻 정보가 구조화되어 있지 않습니다. 원문 보기에서 Wiktionary 항목 전체를 확인해 주세요.")
    );
    return;
  }

  for (const group of entry.definitionGroups) {
    const section = makeElement("section", "definition-group");
    const part = makeElement("h4", "part-of-speech", group.koreanLabel || group.partOfSpeech);
    if (group.koreanLabel) part.append(makeElement("span", "", group.partOfSpeech));

    const list = makeElement("ol", "definition-list");
    for (const definition of group.definitions) {
      const item = makeElement("li", "definition-item");
      item.append(makeElement("p", "definition-text", definition.text));
      if (definition.examples.length) {
        const examples = makeElement("div", "example-list");
        for (const example of definition.examples) {
          examples.append(makeElement("blockquote", "example", example));
        }
        item.append(examples);
      }
      list.append(item);
    }

    section.append(part, list);
    ui.definitionGroups.append(section);
  }
}

function renderEntry(entry, { wiktionaryAvailable = true } = {}) {
  currentEntry = entry;
  ui.direction.textContent = entry.language === "ko" ? "한국어 → English" : "English → 한국어 · English";
  ui.word.textContent = entry.word;
  ui.audioButton.title = entry.audio.length
    ? "Wikimedia Commons 음원으로 발음 듣기"
    : "기기의 음성 합성으로 발음 듣기";
  renderPronunciations(entry);
  const supplements = findVerifiedSupplements(entry.requestedWord || entry.word);
  renderVerifiedSupplements(
    ui.verifiedSupplements,
    entry.requestedWord || entry.word
  );
  renderTranslations(entry, supplements);
  renderDefinitionGroups(entry);

  if (!wiktionaryAvailable) {
    ui.definitionsSection.classList.add("is-hidden");
    ui.sourceNote.classList.add("is-hidden");
  } else {
    ui.definitionsSection.classList.remove("is-hidden");
    ui.sourceNote.classList.remove("is-hidden");
  }

  const revision = entry.revisionId ? `리비전 ${entry.revisionId}` : "현재 공개 항목";
  ui.sourceDescription.textContent = `Wiktionary ${revision}을 정리해 표시했습니다. 내용은 ${entry.license?.name || "CC BY-SA"} 조건을 따릅니다.`;
  ui.sourceLink.href = entry.sourceUrl;
  setView("result");
  requestAnimationFrame(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    ui.result.scrollIntoView({ behavior, block: "start" });
    ui.word.focus({ preventScroll: true });
  });
}

function renderSupplementOnlyEntry(word) {
  renderEntry({
    word,
    requestedWord: word,
    language: detectInputLanguage(word),
    found: true,
    pronunciations: [],
    audio: [],
    translations: [],
    definitionGroups: [],
    sourceUrl: "",
    revisionId: null,
    license: null
  }, { wiktionaryAvailable: false });
}

function renderContextOnlyEntry(word) {
  renderEntry({
    word,
    requestedWord: word,
    language: "en",
    found: true,
    pronunciations: [],
    audio: [],
    translations: [],
    definitionGroups: [],
    sourceUrl: "",
    revisionId: null,
    license: null
  }, { wiktionaryAvailable: false });
  ui.translations.replaceChildren();
  ui.translationSection.classList.add("is-hidden");
}

function stopAudioState() {
  ui.audioButton.classList.remove("is-playing");
  ui.audioButton.setAttribute("aria-pressed", "false");
}

function speakWithDevice(word, language) {
  if (!("speechSynthesis" in window)) {
    showMessage("발음을 재생할 수 없어요", "이 브라우저에서는 음성 재생을 지원하지 않습니다.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = language === "ko" ? "ko-KR" : "en-US";
  utterance.rate = 0.88;
  utterance.onstart = () => {
    ui.audioButton.classList.add("is-playing");
    ui.audioButton.setAttribute("aria-pressed", "true");
  };
  utterance.onend = stopAudioState;
  utterance.onerror = stopAudioState;
  window.speechSynthesis.speak(utterance);
}

function playPronunciation() {
  if (!currentEntry) return;
  if (!currentEntry.audio.length) {
    speakWithDevice(currentEntry.word, currentEntry.language);
    return;
  }

  currentAudio?.pause();
  currentAudio = new Audio(currentEntry.audio[0]);
  currentAudio.addEventListener("play", () => {
    ui.audioButton.classList.add("is-playing");
    ui.audioButton.setAttribute("aria-pressed", "true");
  });
  currentAudio.addEventListener("ended", stopAudioState);
  currentAudio.addEventListener("error", () => {
    stopAudioState();
    speakWithDevice(currentEntry.word, currentEntry.language);
  });
  currentAudio.play().catch(() => speakWithDevice(currentEntry.word, currentEntry.language));
}

export async function lookup(rawWord, { updateHistory = true } = {}) {
  const word = rawWord.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!word) {
    ui.input.focus();
    return;
  }

  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  currentEntry = null;
  currentAudio?.pause();
  window.speechSynthesis?.cancel();
  ui.input.value = word;
  renderContextExpressions(ui.contextExpressions, []);
  setView("loading");

  if (updateHistory) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("q", word);
    history.pushState({ word }, "", nextUrl);
  }

  try {
    const [apiResult, contextResult] = await Promise.allSettled([
      fetch(`/api/lookup?word=${encodeURIComponent(word)}`, {
        signal: request.signal,
        headers: { Accept: "application/json" }
      }),
      loadContextExpressions(word, { signal: request.signal })
    ]);
    if (request !== activeRequest) return;
    if (apiResult.status === "rejected") throw apiResult.reason;
    if (contextResult.status === "rejected") {
      if (contextResult.reason?.name === "AbortError") return;
    }
    const response = apiResult.value;
    const contextExpressions = contextResult.status === "fulfilled" ? contextResult.value : [];
    const payload = await response.json();
    if (request !== activeRequest) return;
    const verifiedSupplements = findVerifiedSupplements(word);
    if (!response.ok) {
      if (response.status === 404 && (verifiedSupplements.length || contextExpressions.length)) {
        if (verifiedSupplements.length) renderSupplementOnlyEntry(word);
        else renderContextOnlyEntry(word);
        renderContextExpressions(ui.contextExpressions, contextExpressions);
        return;
      }
      throw new Error(payload.error || "사전 항목을 불러오지 못했습니다.");
    }

    const entry = parseWiktionaryEntry(payload);
    if (!entry.found) {
      if (verifiedSupplements.length || contextExpressions.length) {
        if (verifiedSupplements.length) renderSupplementOnlyEntry(word);
        else renderContextOnlyEntry(word);
        renderContextExpressions(ui.contextExpressions, contextExpressions);
        return;
      }
      const language = entry.language === "ko" ? "한국어" : "영어";
      showMessage(
        `‘${word}’의 ${language} 항목이 없어요`,
        "철자를 확인하거나, 더 기본적인 형태의 단어로 다시 검색해 보세요."
      );
      return;
    }
    renderEntry(entry);
    renderContextExpressions(ui.contextExpressions, contextExpressions);
  } catch (error) {
    if (request !== activeRequest || error?.name === "AbortError") return;
    showMessage("검색 결과를 가져오지 못했어요", error.message || "잠시 후 다시 시도해 주세요.");
  }
}

ui.form.addEventListener("submit", (event) => {
  event.preventDefault();
  lookup(ui.input.value);
});

ui.audioButton.addEventListener("click", playPronunciation);

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => lookup(button.dataset.query));
});

document.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement?.tagName;
  if (event.key === "/" && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
    event.preventDefault();
    ui.input.focus();
  }
});

window.addEventListener("popstate", () => {
  const word = new URL(window.location.href).searchParams.get("q");
  if (word) lookup(word, { updateHistory: false });
  else {
    activeRequest?.abort();
    ui.input.value = "";
    setView("empty");
  }
});

const initialWord = new URL(window.location.href).searchParams.get("q");
if (initialWord) lookup(initialWord, { updateHistory: false });

initializeReleaseNotice().catch(() => {
  // Release notices are optional and must never interrupt dictionary search.
});
