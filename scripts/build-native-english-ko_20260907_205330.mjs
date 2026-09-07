import { createReadStream } from 'node:fs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const VERSION = 'native-english-ko_20260907_205330';
export const SHARD_SEED = 'native-en-ko-v1\0';
export const LICENSE = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' };
export const normalizeLookupKey = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
const hash = value => createHash('sha256').update(value).digest('hex');
export const shardNumber = key => createHash('sha256').update(SHARD_SEED + key).digest()[0] % 64;
const strings = value => Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()) : [];
const brokenMarkup = value => /\{\{|\}\}|<\/?(?:script|style|ref|div|span|table)\b|Lua error|스크립트 오류|틀:[^\s]/iu.test(value);
export function isKoreanGloss(value) {
  return typeof value === 'string' && /[가-힣]/u.test(value) && !brokenMarkup(value)
    && !/^\s*(?:뜻풀이 없음|뜻을 적어 주세요|음성 듣기|번역 필요)\s*[.!]?\s*$/u.test(value);
}
function copyStrings(target, key, value) { const found = strings(value); if (found.length) target[key] = found; }
function cleanExamples(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(e => typeof e?.text === 'string' && e.text.trim() && !brokenMarkup(e.text)
    && !/^\s*(?:음성\s*듣기|듣기\s*(?:미국|영국)|(?:명사|동사|형용사|부사)\s*:)/u.test(e.text))
    .map(e => Object.fromEntries(['text', 'translation', 'ref', 'note'].filter(k => typeof e[k] === 'string' && e[k].trim()).map(k => [k, e[k]])));
}
export function convertEntry(raw) {
  if (raw?.lang_code !== 'en' || typeof raw.word !== 'string' || !normalizeLookupKey(raw.word)) return null;
  const id = 'kowiktionary:' + hash(JSON.stringify(raw)).slice(0, 24);
  const senses = (Array.isArray(raw.senses) ? raw.senses : []).flatMap((sense, index) => {
    const glosses = strings(sense.glosses).filter(isKoreanGloss);
    if (!glosses.length) return [];
    const result = { id: `${id}:sense-${index + 1}`, glosses };
    copyStrings(result, 'tags', sense.tags); copyStrings(result, 'rawTags', sense.raw_tags);
    copyStrings(result, 'topics', sense.topics);
    if (typeof sense.note === 'string' && !brokenMarkup(sense.note)) result.note = sense.note;
    if (Array.isArray(sense.form_of)) result.formOf = sense.form_of.filter(x => typeof x?.word === 'string').map(x => ({ word: x.word }));
    const examples = cleanExamples(sense.examples); if (examples.length) result.examples = examples;
    return [result];
  });
  if (!senses.length) return null;
  const entry = { id, word: raw.word, pos: raw.pos || 'unknown', senses,
    sourceName: '한국어 위키낱말사전', sourceUrl: `https://ko.wiktionary.org/wiki/${encodeURIComponent(raw.word)}#영어`,
    license: LICENSE };
  if (typeof raw.pos_title === 'string') entry.posTitle = raw.pos_title;
  copyStrings(entry, 'tags', raw.tags);
  const sounds = (Array.isArray(raw.sounds) ? raw.sounds : []).map(sound => {
    const item = {};
    if (typeof sound.ipa === 'string') item.ipa = sound.ipa;
    if (typeof sound.audio === 'string') item.audio = sound.audio;
    for (const key of ['mp3_url', 'ogg_url']) {
      try { const u = new URL(sound[key]); if (u.protocol === 'https:' && ['commons.wikimedia.org', 'upload.wikimedia.org'].includes(u.hostname)) item[key] = sound[key]; } catch {}
    }
    copyStrings(item, 'tags', sound.tags); copyStrings(item, 'raw_tags', sound.raw_tags);
    return item;
  }).filter(s => s.ipa || s.mp3_url || s.ogg_url);
  if (sounds.length) entry.sounds = [...new Map(sounds.map(s => [JSON.stringify(s), s])).values()];
  if (Array.isArray(raw.forms)) entry.forms = raw.forms.filter(f => typeof f?.form === 'string').map(f => {
    const result = { form: f.form }; copyStrings(result, 'tags', f.tags); copyStrings(result, 'rawTags', f.raw_tags); return result;
  });
  return entry;
}

export async function build(input, output) {
  const shards = Array.from({ length: 64 }, () => ({ version: VERSION, words: Object.create(null) }));
  const stats = { rawEnglishEntries: 0, rawEnglishSenses: 0, entries: 0, senses: 0, unknownPosEntries: 0, entriesWithExamples: 0, entriesWithPronunciation: 0, entriesWithForms: 0, droppedEntries: 0, droppedSenses: 0, duplicateEntries: 0 };
  const ids = new Set(); const rawWords = new Set(); const keptWords = new Set();
  const stream = createReadStream(input); const source = input.endsWith('.gz') ? stream.pipe(createGunzip()) : stream;
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const raw = JSON.parse(line); if (raw.lang_code !== 'en') continue;
    stats.rawEnglishEntries++; stats.rawEnglishSenses += raw.senses?.length || 0; rawWords.add(raw.word);
    const entry = convertEntry(raw);
    if (!entry) { stats.droppedEntries++; stats.droppedSenses += raw.senses?.length || 0; continue; }
    stats.droppedSenses += (raw.senses?.length || 0) - entry.senses.length;
    if (ids.has(entry.id)) { stats.duplicateEntries++; continue; } ids.add(entry.id);
    const key = normalizeLookupKey(entry.word); const bucket = shards[shardNumber(key)].words;
    (bucket[key] ||= []).push(entry); keptWords.add(entry.word);
    stats.entries++; stats.senses += entry.senses.length;
    if (entry.pos === 'unknown') stats.unknownPosEntries++;
    if (entry.senses.some(s => s.examples?.length)) stats.entriesWithExamples++;
    if (entry.sounds?.length) stats.entriesWithPronunciation++;
    if (entry.forms?.length) stats.entriesWithForms++;
  }
  stats.rawDistinctHeadwords = rawWords.size; stats.distinctHeadwords = keptWords.size;
  stats.lookupKeys = shards.reduce((n, s) => n + Object.keys(s.words).length, 0);
  await mkdir(output, { recursive: false });
  const files = [];
  for (let i = 0; i < shards.length; i++) {
    const file = `shard-${String(i).padStart(2, '0')}.json`; const contents = JSON.stringify(shards[i]) + '\n';
    await writeFile(path.join(output, file), contents); files.push({ file, keys: Object.keys(shards[i].words).length, bytes: Buffer.byteLength(contents) });
  }
  const manifest = { version: VERSION, generatedAt: new Date().toISOString(), source: {
    name: '한국어 위키낱말사전', url: 'https://ko.wiktionary.org/', extractor: 'Kaikki / wiktextract',
    downloadUrl: 'https://kaikki.org/dictionary/downloads/ko/ko-extract.jsonl.gz', license: LICENSE,
    adaptation: 'English entries selected; Korean glosses retained in original senses; non-Korean or broken glosses and navigation examples omitted; metadata fields selected; duplicate pronunciation records removed.' },
    input: { path: input, bytes: (await readFile(input)).length, sha256: hash(await readFile(input)) },
    normalization: 'NFKC, trim, whitespace collapse, lowercase; original headword retained; no form aliases',
    shardCount: 64, shardSeed: SHARD_SEED, inventory: stats, shards: files };
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [input = '.local/sources/kowiktionary_20260907_205330/ko-extract.jsonl.gz', output = `public/${VERSION}`] = process.argv.slice(2);
  console.log(JSON.stringify((await build(input, output)).inventory, null, 2));
}
