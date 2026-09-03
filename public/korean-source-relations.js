import { findVerifiedSupplements } from "./verified-supplements.js";

const INDEX_VERSION = "korean-source-relations-v1-full";
const SHARD_SEED = "korean-source-shard-v1\0";
const SHARD_COUNT = 64;
const INITIAL_VISIBLE_COUNT = 8;
const SOURCE_URL_PREFIX = "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=";
const SOURCE_URL_SUFFIX = "&nation=eng&nationCode=6";

export function normalizeKoreanSourceKey(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function sha256Bytes(value) {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

export async function koreanSourceShardNumber(value, digest = sha256Bytes) {
  const key = normalizeKoreanSourceKey(value);
  if (!key) return null;
  const bytes = await digest(`${SHARD_SEED}${key}`);
  return bytes[0] % SHARD_COUNT;
}

export async function koreanSourceShardName(value, digest = sha256Bytes) {
  const number = await koreanSourceShardNumber(value, digest);
  return number === null ? null : `shard-${String(number).padStart(2, "0")}.json`;
}

function normalizeEnglishHeadword(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/gu, " ");
}

function exactSupplementTokens(key) {
  const bySense = new Map();
  for (const supplement of findVerifiedSupplements(key)) {
    const id = String(supplement?.korean?.id || "");
    const partOfSpeech = String(supplement?.english?.partOfSpeech || "").trim().toLocaleLowerCase("en");
    const englishHeadword = normalizeEnglishHeadword(supplement?.english?.headword);
    if (!id || !partOfSpeech || !englishHeadword) continue;
    if (!bySense.has(id)) bySense.set(id, []);
    bySense.get(id).push({ partOfSpeech, englishHeadword });
  }
  return bySense;
}

export function suppressExactEnglishTokens(key, records) {
  const exactBySense = exactSupplementTokens(key);
  return records.map((record) => {
    if (record.englishExpression === null) return { ...record };
    const exact = exactBySense.get(String(record.id)) || [];
    const partOfSpeech = String(record.partOfSpeech || "").trim().toLocaleLowerCase("en");
    const tokens = String(record.englishExpression).split(";").map((token) => token.trim()).filter(Boolean);
    const remaining = tokens.filter((token) => !exact.some((item) =>
      item.partOfSpeech === partOfSpeech && item.englishHeadword === normalizeEnglishHeadword(token)
    ));
    return { ...record, englishExpression: remaining.join("; ") };
  });
}

export async function loadKoreanSourceRelations(value, {
  signal,
  fetchImpl = globalThis.fetch,
  digest = sha256Bytes
} = {}) {
  const key = normalizeKoreanSourceKey(value);
  if (!key || !/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(key)) return [];
  try {
    const shardName = await koreanSourceShardName(key, digest);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await fetchImpl(`/${INDEX_VERSION}/${shardName}`, {
      signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return [];
    const payload = await response.json();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (payload?.version !== INDEX_VERSION || !payload.words || !Array.isArray(payload.words[key])) return [];
    return suppressExactEnglishTokens(key, payload.words[key]);
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

function makeSourceDetails(document, record) {
  const details = makeElement(document, "details", "korean-source-details");
  details.append(makeElement(document, "summary", "korean-source-summary", "출처 보기"));
  const copy = makeElement(document, "p", "korean-source-copy");
  const sourceLink = makeElement(document, "a", "", "한국어기초사전 원문 보기 ↗");
  const entryId = /^\d+$/u.test(String(record.entryId)) ? String(record.entryId) : "";
  sourceLink.href = entryId
    ? `${SOURCE_URL_PREFIX}${entryId}${SOURCE_URL_SUFFIX}`
    : "https://krdict.korean.go.kr/";
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

function makeKoreanSourceItem(document, record) {
  const article = makeElement(document, "article", "korean-source-item");
  const heading = makeElement(document, "p", "korean-source-heading");
  const primaryPartOfSpeech = record.partOfSpeechKo || record.partOfSpeech;
  heading.append(makeElement(document, "strong", "", primaryPartOfSpeech));
  if (record.partOfSpeech && record.partOfSpeech !== primaryPartOfSpeech) {
    heading.append(makeElement(document, "span", "", record.partOfSpeech));
  }
  const definition = makeElement(document, "div", "korean-source-field");
  definition.append(
    makeElement(document, "span", "korean-source-label", "한국어 뜻풀이"),
    makeElement(document, "p", "", record.definitionKo)
  );
  const expression = makeElement(document, "div", "korean-source-field");
  const expressionText = record.englishExpression === null
    ? "직접 대응하는 영어 표현 없음"
    : record.englishExpression || "정확히 일치하는 영어 표현은 위에 표시했습니다.";
  expression.append(
    makeElement(document, "span", "korean-source-label", "영어 대응 표현"),
    makeElement(document, "p", "", expressionText)
  );
  article.append(heading, definition, expression);
  if (record.englishDescription) {
    const description = makeElement(document, "div", "korean-source-field");
    description.append(
      makeElement(document, "span", "korean-source-label", "영어 풀이"),
      makeElement(document, "p", "", record.englishDescription)
    );
    article.append(description);
  }
  article.append(makeSourceDetails(document, record));
  return article;
}

export function renderKoreanSourceRelations(container, records) {
  container.replaceChildren();
  if (!Array.isArray(records) || !records.length) {
    container.classList.add("is-hidden");
    return 0;
  }
  const document = container.ownerDocument;
  const disclosure = makeElement(document, "details", "korean-source-disclosure");
  disclosure.open = true;
  disclosure.append(makeElement(document, "summary", "korean-source-section-summary", `한국어기초사전 영어 뜻 · ${records.length}개`));
  const body = makeElement(document, "div", "korean-source-body");
  body.append(makeElement(document, "p", "korean-source-intro", "한국어기초사전에 실린 뜻별 영어 대응 표현과 영어 풀이입니다."));
  const list = makeElement(document, "div", "korean-source-list");
  records.slice(0, INITIAL_VISIBLE_COUNT).forEach((record) => list.append(makeKoreanSourceItem(document, record)));
  body.append(list);
  if (records.length > INITIAL_VISIBLE_COUNT) {
    const remaining = records.slice(INITIAL_VISIBLE_COUNT);
    const button = makeElement(document, "button", "korean-source-more", `나머지 ${remaining.length}개 더 보기`);
    button.type = "button";
    button.addEventListener("click", () => {
      remaining.forEach((record) => list.append(makeKoreanSourceItem(document, record)));
      button.remove();
    }, { once: true });
    body.append(button);
  }
  disclosure.append(body);
  container.append(disclosure);
  container.classList.remove("is-hidden");
  return records.length;
}
