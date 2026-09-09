import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUTPUT_NAME = 'source-metadata_20260909_235001.json';
const DEFAULT_PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const normalize = value => String(value).normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
export function keyCounts(keys) {
  const values = new Set(keys);
  const keysWithSpaces = [...values].filter(key => /\s/u.test(key)).length;
  return { searchKeys: values.size, keysWithoutSpaces: values.size - keysWithSpaces, keysWithSpaces };
}
export function compareKeys(left, right) {
  const a = new Set([...left].map(normalize)), b = new Set([...right].map(normalize));
  const intersection = [...a].filter(key => b.has(key)).length;
  return { intersection, union: a.size + b.size - intersection, kowiktionaryOnly: a.size - intersection, krdictOnly: b.size - intersection };
}
async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
async function versionFrom(publicDir, file, constant) {
  const code = await readFile(path.join(publicDir, file), 'utf8');
  const version = code.match(new RegExp(`(?:const|let) ${constant} = ["']([^"']+)["']`))?.[1];
  if (!version || !/^[a-zA-Z0-9_-]+$/u.test(version)) throw new Error(`Missing active version: ${file}/${constant}`);
  return version;
}
async function loadIndex(publicDir, version, prefix, count) {
  const directory = path.join(publicDir, version);
  const files = (await readdir(directory)).filter(name => new RegExp(`^${prefix}-[0-9]+\\.json$`).test(name)).sort();
  if (files.length !== count) throw new Error(`${version}/${prefix}: expected ${count} shards, found ${files.length}`);
  const words = new Map();
  for (const file of files) {
    const data = await readJson(path.join(directory, file));
    if (data.version !== version || !data.words || Array.isArray(data.words)) throw new Error(`Invalid index ${file}`);
    for (const [key, rows] of Object.entries(data.words)) {
      if (words.has(key) || !Array.isArray(rows)) throw new Error(`Duplicate key or invalid records: ${key}`);
      words.set(key, rows);
    }
  }
  return { version, words, files: files.map(file => `${version}/${file}`), manifest: await readJson(path.join(directory, 'manifest.json')) };
}
function summarize(index, wiki = false) {
  const heads = new Set(), ids = new Set(); let records = 0, senses = 0;
  for (const rows of index.words.values()) for (const row of rows) {
    records++; heads.add(wiki ? row.word : row.headword); ids.add(row.id);
    senses += wiki ? row.senses.length : 1;
  }
  if (heads.has(undefined) || ids.has(undefined)) throw new Error('Missing source identity');
  return { ...keyCounts(index.words.keys()), headwords: heads.size, records, senses: wiki ? senses : ids.size, occurrences: records, shards: index.files.length };
}
function sourceDates(manifest) {
  return [{ label: '원천 자료 시점(공개 manifest에 기록된 값)', date: manifest.source?.snapshot || null }];
}

/** All numerical index counts are recomputed from active public shards; no .local inputs or network. */
export async function buildSourceMetadata({ publicDir = DEFAULT_PUBLIC, generatedAt = new Date().toISOString() } = {}) {
  publicDir = path.resolve(publicDir);
  const enVersion = await versionFrom(publicDir, 'native-english-ko.js', 'NATIVE_ENGLISH_KO_VERSION');
  const krVersion = await versionFrom(publicDir, 'native-korean-en_20260907_205345.js', 'NATIVE_KRDICT_VERSION');
  const wiki = await loadIndex(publicDir, enVersion, 'shard', 64);
  const korean = await loadIndex(publicDir, krVersion, 'korean', 64);
  const reverse = await loadIndex(publicDir, krVersion, 'english', 64);
  const wikiCounts = summarize(wiki, true), koreanCounts = summarize(korean), reverseCounts = summarize(reverse);
  const expressions = new Set();
  for (const rows of reverse.words.values()) for (const row of rows) for (const value of row.matchedEnglishExpressions || []) expressions.add(value);
  const kindCounts = {};
  for (const rows of korean.words.values()) for (const row of rows) kindCounts[row.sourceKind] = (kindCounts[row.sourceKind] || 0) + 1;
  const detailFiles = (await readdir(path.join(publicDir, krVersion))).filter(name => /^details-\d+\.json$/u.test(name)).sort();
  if (detailFiles.length !== 256) throw new Error('Expected 256 KRDict detail shards');
  let detailEntries = 0, detailSenses = 0, exampleGroups = 0, exampleTexts = 0;
  for (const file of detailFiles) {
    const data = await readJson(path.join(publicDir, krVersion, file));
    if (data.version !== krVersion || !data.entries) throw new Error('Invalid detail shard');
    for (const entry of Object.values(data.entries)) {
      detailEntries++;
      for (const sense of Object.values(entry.senses)) {
        detailSenses++;
        exampleGroups += sense.examples.length;
        for (const example of sense.examples) exampleTexts += Array.isArray(example.texts) ? example.texts.length : 0;
      }
    }
  }
  const left = new Set(wiki.words.keys()), right = new Set(reverse.words.keys());
  const englishInputCoverage = {
    ...compareKeys(left, right),
    breakdown: Object.fromEntries([['withoutSpaces', false], ['withSpaces', true]].map(([name, spaces]) => [name, compareKeys(new Set([...left].filter(key => /\s/u.test(key) === spaces)), new Set([...right].filter(key => /\s/u.test(key) === spaces)))])),
    normalization: 'NFKC → 앞뒤 공백 제거 → 연속 공백 하나로 → 소문자. 대소문자를 구분한 원표기는 별도 보존합니다.',
    interpretation: '한영이음 검색의 두 정적 색인에 저장된 정규화 검색키를 비교한 수입니다. KRDict 역검색은 일부 끝 문장부호 정리와 표현 형식 제한도 적용하므로 가능한 모든 입력 문자열의 수가 아닙니다. 뜻 일치·동의어·번역 정확도 집계가 아닙니다. 공백 없음은 일반 영어 단어만 뜻하지 않으며 한국어 로마자 표기·약어 등도 포함합니다.'
  };
  const krCounts = { ...koreanCounts, sourceEntries: detailEntries, detailSenses, exampleGroups, exampleTexts, englishSearchKeys: reverseCounts.searchKeys, englishKeysWithoutSpaces: reverseCounts.keysWithoutSpaces, englishKeysWithSpaces: reverseCounts.keysWithSpaces, englishExpressions: expressions.size, englishRelationOccurrences: reverseCounts.occurrences, englishRelatedSenses: reverseCounts.senses, koreanEnglishSenses: kindCounts['korean-english'] || 0, koreanReferenceSenses: kindCounts['korean-reference'] || 0 };
  const sources = [
    { id: 'kowiktionary', name: '한국어판 위키낱말사전', url: 'https://ko.wiktionary.org/', scope: '한영이음 영어→한국어 검색', counts: wikiCounts, versions: [enVersion], snapshotKnownDates: [{ label: '공식 XML 덤프', date: wiki.manifest.source.downloadUrl.match(/\/(\d{8})\//u)?.[1]?.replace(/^(\d{4})(\d{2})(\d{2})$/u, '$1-$2-$3') || null }], productGeneratedAt: wiki.manifest.generatedAt || null, sourceDownloadUrl: wiki.manifest.source.downloadUrl, license: wiki.manifest.source.license, coverage: '한국어판 사전의 영어 항목 중 현재 제품에 한국어 풀이가 수록된 범위입니다. 공식 XML을 교정한 추출기로 처리한 자료이며 한국어판 전체나 영어 어휘 전체가 아닙니다.' },
    { id: 'krdict', name: '한국어기초사전', url: 'https://krdict.korean.go.kr/', scope: '한영이음 한국어→영어 검색·영어 대응표현 역검색', counts: krCounts, versions: [krVersion], snapshotKnownDates: sourceDates(korean.manifest), sourceDownloadUrl: korean.manifest.source.url, license: korean.manifest.license, coverage: '현재 공개된 한국어 표제형과 원천 뜻 전체를 집계했습니다. 활용·참조 안내도 포함하며 모든 뜻에 영어 대응표현이 있는 것은 아닙니다. 영어 검색키에는 여러 단어 표현과 한국어 로마자 표기도 있습니다. 제품 버전 날짜를 원천 갱신일로 간주하지 않습니다.' },

  ];
  return {
    schemaVersion: 1, generatedAt, scope: '한영이음 검색에서 사용하는 한국어판 위키낱말사전과 한국어기초사전의 공개 제품 자료. 지원이 종료된 검색의 자료와 과거 자산은 집계하지 않습니다.', sources,
    englishInputCoverage,
    methods: [
      '한글 입력은 한국어기초사전 표제형을, 영어 입력은 한국어판 위키낱말사전 표제어와 한국어기초사전의 영어 대응표현을 각각 조회합니다.',
      '두 출처는 결과가 있는 대로 같은 수준으로 표시합니다. 어느 한쪽이 비어 있어도 다른 결과를 제공하며 두 원천의 뜻 경계를 합치거나 영어 뜻별 exact 번역으로 바꾸지 않습니다.',
      '한국어기초사전의 영어 역검색은 원문 대응표현 전체를 색인합니다. 여러 단어를 개별 단어로 분해하거나 뜻을 추론하지 않습니다. 지원 형태 밖의 문장성 표현 등은 역검색에 포함되지 않을 수 있습니다.',
      '표제어는 원표기의 고유 개수, 검색키는 정규화한 조회 문자열, 뜻은 원천별 의미 항목, 연결 수는 검색키와 뜻의 조합 수입니다. 공백 유무는 문자열 형식에 대한 구분입니다.'
    ],
    limitations: [
      '앱은 한글 포함 여부로 검색 방향을 나누고 입력을 80자까지 사용합니다. 저장된 검색키 개수는 모든 활용형·로마자 입력이나 가능한 입력 문자열의 개수가 아닙니다.',
      '전체 사이트를 하나의 단어 수로 합산하지 않습니다. 서로 다른 출처·언어·뜻·검색 방향 사이에 중복이 있습니다.',
      '이 수치는 제품 자료의 기계 집계이며 원천 사전 전체 수록률이나 언어적 정확성·뜻별 번역 일치율을 보증하지 않습니다.',
      '한국어기초사전 최신 전체 원천 날짜는 공개 제품에 근거가 없으면 미확인으로 둡니다.',
      '한국어기초사전 상세에 원문 예문·주석·발음 정보가 있어도 별도 영어 예문 번역이나 음성 재생 기능이 모두 제공된다는 뜻은 아닙니다.'
    ],
    calculation: { builder: 'scripts/build-source-metadata_20260909_235001.mjs', inputScope: 'public only', searchShardsRead: wiki.files.length + korean.files.length + reverse.files.length, detailShardsRead: detailFiles.length, sourceMeansAreNotAligned: true }
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const publicDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PUBLIC;
  const data = await buildSourceMetadata({ publicDir });
  await writeFile(path.join(publicDir, OUTPUT_NAME), `${JSON.stringify(data, null, 2)}\n`);
  console.log(JSON.stringify({ sources: data.sources.map(({id,counts}) => ({id,counts})), englishInputCoverage: data.englishInputCoverage, calculation: data.calculation }));
}
