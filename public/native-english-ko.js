export const NATIVE_ENGLISH_KO_VERSION = 'native-english-ko_20260908_012503';
function normalizeOriginalCase(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ');
}
export function normalizeEnglishLookupKey(value) {
  return normalizeOriginalCase(value).toLowerCase();
}
export async function nativeEnglishShardName(value) {
  const key = normalizeEnglishLookupKey(value);
  const bytes = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode('native-en-ko-v1\0' + key)));
  return `shard-${String(bytes[0] % 64).padStart(2, '0')}.json`;
}
export async function lookupEnglishEntry(value, { signal, fetchImpl = globalThis.fetch } = {}) {
  const key = normalizeEnglishLookupKey(value);
  if (!key) return [];
  const file = await nativeEnglishShardName(key);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await fetchImpl(`/${NATIVE_ENGLISH_KO_VERSION}/${file}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('영한 사전 자료를 불러오지 못했습니다. 잠시 후 다시 검색해 주세요.');
  const data = await response.json();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (data?.version !== NATIVE_ENGLISH_KO_VERSION || !data.words || typeof data.words !== 'object') throw new Error('영한 사전 자료 형식을 확인할 수 없습니다.');
  const entries = Object.hasOwn(data.words, key) ? data.words[key] : [];
  if (!Array.isArray(entries)) throw new Error('영한 사전 항목을 읽지 못했습니다.');
  const exactCase = entries.filter(entry => normalizeOriginalCase(entry.word) === normalizeOriginalCase(value));
  return exactCase.length ? exactCase : entries;
}
