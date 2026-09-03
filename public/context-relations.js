import { findVerifiedSupplements } from "./verified-supplements.js";

const INDEX_VERSION = "context-relations-v1-full";
const RECOVERED_INDEX_VERSION = "context-relations-v2-recovered";
const SHARD_SEED = "context-shard-v1\0";
const SHARD_COUNT = 64;
const INITIAL_VISIBLE_COUNT = 8;

function normalizeLemma(value) {
  const lemma = String(value || "").normalize("NFKC").trim().toLowerCase();
  return /^[a-z]+(?:[-'][a-z]+)*$/.test(lemma) ? lemma : "";
}

async function sha256Bytes(value) {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

export async function contextShardNumber(value, digest = sha256Bytes) {
  const lemma = normalizeLemma(value);
  if (!lemma) return null;
  const bytes = await digest(`${SHARD_SEED}${lemma}`);
  return bytes[0] % SHARD_COUNT;
}

export async function contextShardName(value, digest = sha256Bytes) {
  const number = await contextShardNumber(value, digest);
  return number === null ? null : `shard-${String(number).padStart(2, "0")}.json`;
}

function exactKoreanSenseIds(lemma) {
  return new Set(findVerifiedSupplements(lemma).map((item) => item.korean.id));
}

async function loadContextVersion(lemma, version, shardName, { signal, fetchImpl }) {
  try {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await fetchImpl(`/${version}/${shardName}`, {
      signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return [];
    const payload = await response.json();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (payload?.version !== version || !payload.words || !Array.isArray(payload.words[lemma])) return [];
    return payload.words[lemma];
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return [];
  }
}

export async function loadContextExpressions(value, {
  signal,
  fetchImpl = globalThis.fetch,
  digest = sha256Bytes
} = {}) {
  const lemma = normalizeLemma(value);
  if (!lemma) return [];
  try {
    const shardName = await contextShardName(lemma, digest);
    const results = await Promise.allSettled([
      loadContextVersion(lemma, INDEX_VERSION, shardName, { signal, fetchImpl }),
      loadContextVersion(lemma, RECOVERED_INDEX_VERSION, shardName, { signal, fetchImpl })
    ]);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const exactIds = exactKoreanSenseIds(lemma);
    return results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter((item) => !exactIds.has(item.id));
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return [];
  }
}

function makeElement(document, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeSourceDetails(document, item) {
  const details = makeElement(document, "details", "context-source-details");
  details.append(makeElement(document, "summary", "context-source-summary", "출처 보기"));
  const copy = makeElement(document, "p", "context-source-copy");
  const sourceLink = makeElement(document, "a", "", "한국어기초사전 원문 보기 ↗");
  sourceLink.href = item.sourceUrl;
  sourceLink.target = "_blank";
  sourceLink.rel = "noreferrer";
  const licenseLink = makeElement(document, "a", "", "CC BY-SA 2.0 KR");
  licenseLink.href = "https://creativecommons.org/licenses/by-sa/2.0/kr/";
  licenseLink.target = "_blank";
  licenseLink.rel = "noreferrer";
  copy.append(sourceLink, makeElement(document, "span", "", " · "), licenseLink);
  details.append(copy);
  return details;
}

function makeExpressionItem(document, item) {
  const article = makeElement(document, "article", "context-expression-item");
  const heading = makeElement(document, "p", "context-expression-heading");
  heading.append(
    makeElement(document, "strong", "", item.headword),
    makeElement(document, "span", "", item.entryTypeKo || item.partOfSpeechKo || item.partOfSpeech)
  );
  article.append(
    heading,
    makeElement(document, "p", "context-expression-definition", item.definitionKo),
    makeSourceDetails(document, item)
  );
  return article;
}

export function renderContextExpressions(container, items) {
  container.replaceChildren();
  if (!Array.isArray(items) || !items.length) {
    container.classList.add("is-hidden");
    return 0;
  }

  const document = container.ownerDocument;
  const disclosure = makeElement(document, "details", "context-expression-disclosure");
  disclosure.append(makeElement(
    document,
    "summary",
    "context-expression-summary",
    `한국어기초사전에서 함께 찾은 표현 · ${items.length}개`
  ));
  const body = makeElement(document, "div", "context-expression-body");
  body.append(makeElement(
    document,
    "p",
    "context-expression-intro",
    "이 영어 표현이 한국어기초사전의 영어 대응 표현에 함께 실린 한국어 항목입니다."
  ));
  const list = makeElement(document, "div", "context-expression-list");
  items.slice(0, INITIAL_VISIBLE_COUNT).forEach((item) => list.append(makeExpressionItem(document, item)));
  body.append(list);

  if (items.length > INITIAL_VISIBLE_COUNT) {
    const remaining = items.slice(INITIAL_VISIBLE_COUNT);
    const button = makeElement(document, "button", "context-expression-more", `나머지 ${remaining.length}개 더 보기`);
    button.type = "button";
    button.addEventListener("click", () => {
      remaining.forEach((item) => list.append(makeExpressionItem(document, item)));
      button.remove();
    }, { once: true });
    body.append(button);
  }
  disclosure.append(body);
  container.append(disclosure);
  container.classList.remove("is-hidden");
  return items.length;
}
