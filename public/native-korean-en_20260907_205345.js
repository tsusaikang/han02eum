// Source-native KRDict search. Full source examples and relations load only on request.
export const NATIVE_KRDICT_VERSION = "native-krdict_20260908_012600";
const LICENSE = { name: "CC BY-SA 2.0 KR", url: "https://creativecommons.org/licenses/by-sa/2.0/kr/" };

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

async function shardNumber(kind, key, count) {
  const bytes = new Uint8Array(await globalThis.crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(`${NATIVE_KRDICT_VERSION}\0${kind}\0${key}`)
  ));
  return bytes[0] % count;
}

async function loadShard(kind, number, { signal, fetchImpl }) {
  checkAbort(signal);
  const response = await fetchImpl(`/${NATIVE_KRDICT_VERSION}/${kind}-${String(number).padStart(3, "0")}.json`, {
    signal, headers: { Accept: "application/json" }
  });
  checkAbort(signal);
  if (!response.ok) throw new Error(`한국어기초사전 자료를 불러오지 못했습니다 (${response.status || "network"}).`);
  const payload = await response.json();
  checkAbort(signal);
  const field = kind === "details" ? "entries" : "words";
  if (payload?.version !== NATIVE_KRDICT_VERSION || !payload[field] || typeof payload[field] !== "object" || Array.isArray(payload[field])) {
    throw new Error("한국어기초사전 자료 형식이 올바르지 않습니다.");
  }
  return payload[field];
}

function withSource(record, matchKind) {
  const entryId = record.entryId;
  const url = /^\d+$/u.test(String(entryId || ""))
    ? `https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=${entryId}&nation=eng&nationCode=6`
    : "https://krdict.korean.go.kr/";
  return { ...record, source: { name: "한국어기초사전", url }, sourceUrl: url, license: { ...LICENSE }, matchKind };
}

async function lookup(key, kind, matchKind, options) {
  checkAbort(options.signal);
  const number = await shardNumber(kind, key, 64);
  const words = await loadShard(kind, number, options);
  if (!Object.hasOwn(words, key)) return [];
  if (!Array.isArray(words[key])) throw new Error("한국어기초사전 항목 형식이 올바르지 않습니다.");
  return words[key].map((record) => withSource(record, matchKind));
}

/** Return all KRDict source senses for the Korean headword, with usage conditions. */
export async function lookupKoreanEntry(query, { signal, fetchImpl = globalThis.fetch } = {}) {
  checkAbort(signal);
  const key = String(query || "").normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!key || !/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(key)) return [];
  return lookup(key, "korean", "korean-headword", { signal, fetchImpl });
}

/** Exact whole source expressions, including phrases. This is not English sense alignment. */
export async function lookupKoreanByEnglish(query, { signal, fetchImpl = globalThis.fetch } = {}) {
  checkAbort(signal);
  let key = String(query || "").normalize("NFKC").trim().toLowerCase().replace(/\s+/gu, " ");
  if (/^[a-z0-9]+(?:[-'][a-z0-9]+)*'?[.!?]$/u.test(key)) key = key.slice(0, -1);
  if (!/^[a-z0-9]+(?:[-'/][a-z0-9]+)*'?(?:,? [a-z0-9]+(?:[-'/][a-z0-9]+)*'?){0,11}$/u.test(key)) return [];
  const records = await lookup(key, "english", "english-expression", { signal, fetchImpl });
  const original = String(query || "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  const variants = new Set(records.flatMap((record) => record.matchedEnglishExpressions || []));
  const exact = records.filter((record) => record.matchedEnglishExpressions?.includes(original));
  const hasAcronymCasePair = [...variants].some(value => /^[A-Z]{2,}$/u.test(value)) &&
    [...variants].some(value => /^[a-z]{2,}$/u.test(value));
  return hasAcronymCasePair && exact.length ? exact : records;
}

/** Fetch one source sense's complete Korean/English detail only when the user opens it. */
export async function loadKoreanEntryDetails(record, { signal, fetchImpl = globalThis.fetch } = {}) {
  checkAbort(signal);
  const ref = record?.detailsRef;
  if (!ref || !/^[0-9a-f]{64}$/u.test(ref.entry) || !/^\d+$/u.test(String(ref.senseId)) ||
      !Number.isInteger(ref.shard) || ref.shard < 0 || ref.shard > 255) {
    throw new Error("한국어기초사전 상세 항목이 올바르지 않습니다.");
  }
  const entries = await loadShard("details", ref.shard, { signal, fetchImpl });
  const entry = entries[ref.entry];
  const sense = entry?.senses?.[ref.senseId];
  if (!entry?.sourceEntry || !sense?.sourceSense || !Array.isArray(sense.examples)) {
    throw new Error("한국어기초사전 상세 항목을 찾을 수 없습니다.");
  }
  return { sourceEntry: entry.sourceEntry, ...sense };
}
