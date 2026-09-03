const INDEX_VERSION = "korean-only-references-v1";
const SHARD_SEED = "korean-only-reference-shard-v1\0";
const SHARD_COUNT = 64;
const INITIAL_VISIBLE_COUNT = 8;
const SOURCE_URL_PREFIX = "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=";
const SOURCE_URL_SUFFIX = "&nation=eng&nationCode=6";

export function normalizeKoreanOnlyKey(value) {
  return String(value || "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function sha256Bytes(value) {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
}

export async function koreanOnlyShardNumber(value, digest = sha256Bytes) {
  const key = normalizeKoreanOnlyKey(value);
  if (!key) return null;
  const bytes = await digest(`${SHARD_SEED}${key}`);
  return bytes[0] % SHARD_COUNT;
}

export async function koreanOnlyShardName(value, digest = sha256Bytes) {
  const number = await koreanOnlyShardNumber(value, digest);
  return number === null ? null : `shard-${String(number).padStart(2, "0")}.json`;
}

export async function loadKoreanOnlyReferences(value, {
  signal,
  fetchImpl = globalThis.fetch,
  digest = sha256Bytes
} = {}) {
  const key = normalizeKoreanOnlyKey(value);
  if (!key || !/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(key)) return [];
  try {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const shardName = await koreanOnlyShardName(key, digest);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const response = await fetchImpl(`/${INDEX_VERSION}/${shardName}`, {
      signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return [];
    const payload = await response.json();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (payload?.version !== INDEX_VERSION || !payload.words || !Array.isArray(payload.words[key])) return [];
    return payload.words[key];
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
  const details = makeElement(document, "details", "korean-only-details");
  details.append(makeElement(document, "summary", "korean-only-source-summary", "출처 보기"));
  const copy = makeElement(document, "p", "korean-only-source-copy");
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

function makeKoreanOnlyItem(document, record) {
  const article = makeElement(document, "article", "korean-only-item");
  if (record.variant) {
    const variant = makeElement(document, "div", "korean-only-field");
    variant.append(
      makeElement(document, "span", "korean-only-label", "원문 형태"),
      makeElement(document, "p", "", record.variant)
    );
    article.append(variant);
  }
  const definition = makeElement(document, "div", "korean-only-field korean-only-definition");
  definition.append(
    makeElement(document, "span", "korean-only-label", "한국어 뜻풀이"),
    makeElement(document, "p", "", record.definitionKo)
  );
  article.append(definition, makeSourceDetails(document, record));
  return article;
}

export function renderKoreanOnlyReferences(container, records) {
  container.replaceChildren();
  if (!Array.isArray(records) || !records.length) {
    container.classList.add("is-hidden");
    return 0;
  }
  const document = container.ownerDocument;
  const disclosure = makeElement(document, "details", "korean-only-disclosure");
  disclosure.open = true;
  disclosure.append(makeElement(
    document,
    "summary",
    "korean-only-section-summary",
    `한국어기초사전 참고 정보 · ${records.length}개`
  ));
  const body = makeElement(document, "div", "korean-only-body");
  body.append(makeElement(
    document,
    "p",
    "korean-only-intro",
    "한국어기초사전 원문에 실린 활용·참조 안내와 한국어 뜻풀이입니다."
  ));
  const list = makeElement(document, "div", "korean-only-list");
  records.slice(0, INITIAL_VISIBLE_COUNT).forEach((record) => list.append(makeKoreanOnlyItem(document, record)));
  body.append(list);
  if (records.length > INITIAL_VISIBLE_COUNT) {
    const remaining = records.slice(INITIAL_VISIBLE_COUNT);
    const button = makeElement(document, "button", "korean-only-more", `나머지 ${remaining.length}개 더 보기`);
    button.type = "button";
    button.addEventListener("click", () => {
      remaining.forEach((record) => list.append(makeKoreanOnlyItem(document, record)));
      button.remove();
    }, { once: true });
    body.append(button);
  }
  disclosure.append(body);
  container.append(disclosure);
  container.classList.remove("is-hidden");
  return records.length;
}
