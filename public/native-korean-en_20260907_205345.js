// These lookups retain KRDict's own meanings and English expressions.
// They do not align meanings with another dictionary or suppress reviewed tokens.
const KOREAN_LANES = [
  { version: "korean-source-relations-v1-full", seed: "korean-source-shard-v1\0" },
  { version: "korean-source-relations-v2-recovered", seed: "korean-source-shard-v1\0" },
  { version: "korean-only-references-v1", seed: "korean-only-reference-shard-v1\0", reference: true }
];
const ENGLISH_LANES = [
  { version: "context-relations-v1-full", seed: "context-shard-v1\0" },
  { version: "context-relations-v2-recovered", seed: "context-shard-v1\0" }
];
const LICENSE = { name: "CC BY-SA 2.0 KR", url: "https://creativecommons.org/licenses/by-sa/2.0/kr/" };

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

async function shardName(seed, key) {
  const bytes = new Uint8Array(await globalThis.crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(`${seed}${key}`)
  ));
  return `shard-${String(bytes[0] % 64).padStart(2, "0")}.json`;
}

function withSource(record, lane, matchKind) {
  const entryId = record.entryId || String(record.id || "").split(":")[1];
  const url = /^\d+$/u.test(String(entryId || ""))
    ? `https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=${entryId}&nation=eng&nationCode=6`
    : "https://krdict.korean.go.kr/";
  return {
    ...record,
    source: { name: "한국어기초사전", url },
    license: { ...LICENSE },
    sourceKind: lane.reference ? "korean-reference" : "korean-english",
    matchKind
  };
}

async function loadLane(key, lane, { signal, fetchImpl }) {
  checkAbort(signal);
  const name = await shardName(lane.seed, key);
  checkAbort(signal);
  const response = await fetchImpl(`/${lane.version}/${name}`, {
    signal, headers: { Accept: "application/json" }
  });
  checkAbort(signal);
  if (!response.ok) throw new Error(`한국어기초사전 자료를 불러오지 못했습니다 (${response.status || "network"}).`);
  const payload = await response.json();
  checkAbort(signal);
  if (payload?.version !== lane.version || !payload.words || typeof payload.words !== "object") {
    throw new Error("한국어기초사전 자료 형식이 올바르지 않습니다.");
  }
  if (!Object.hasOwn(payload.words, key)) return [];
  if (!Array.isArray(payload.words[key])) throw new Error("한국어기초사전 항목 형식이 올바르지 않습니다.");
  return payload.words[key];
}

async function lookup(key, lanes, matchKind, options) {
  checkAbort(options.signal);
  const results = await Promise.allSettled(lanes.map((lane) => loadLane(key, lane, options)));
  checkAbort(options.signal);
  const abort = results.find((result) => result.status === "rejected" && result.reason?.name === "AbortError");
  if (abort) throw abort.reason;
  if (results.every((result) => result.status === "rejected")) throw results[0].reason;
  if (results.some((result) => result.status === "rejected")) {
    options.onWarning?.("한국어기초사전 자료 일부를 불러오지 못했습니다. 불러온 항목만 표시합니다.");
  }
  return results.flatMap((result, index) => result.status === "fulfilled"
    ? result.value.map((record) => withSource(record, lanes[index], matchKind))
    : []);
}

/** Return KRDict's own Korean meanings, including untranslated reference entries. */
export async function lookupKoreanEntry(query, { signal, fetchImpl = globalThis.fetch, onWarning } = {}) {
  checkAbort(signal);
  const key = String(query || "").normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!key || !/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(key)) return [];
  return lookup(key, KOREAN_LANES, "korean-headword", { signal, fetchImpl, onWarning });
}

/** Existing reverse index: single English expressions, not English sense matches. */
export async function lookupKoreanByEnglish(query, { signal, fetchImpl = globalThis.fetch, onWarning } = {}) {
  checkAbort(signal);
  const key = String(query || "").normalize("NFKC").trim().toLowerCase();
  if (!/^[a-z]+(?:[-'][a-z]+)*$/u.test(key)) return [];
  return lookup(key, ENGLISH_LANES, "english-expression", { signal, fetchImpl, onWarning });
}
