import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { convertEntry } from '../scripts/build-native-english-ko_20260908_012503.mjs';
import { lookupEnglishEntry, NATIVE_ENGLISH_KO_VERSION } from '../public/native-english-ko.js';

const fetchImpl = async url => ({ ok: true, json: async () => JSON.parse(await readFile(new URL('../public' + url, import.meta.url), 'utf8')) });
test('corrected source shards restore ordinary meanings and retain distinct source senses', async () => {
  assert.equal(NATIVE_ENGLISH_KO_VERSION, 'native-english-ko_20260908_012503');
  for (const [word, meanings] of [
    ['tree', ['나무', '계보', '동물을 쫓아']], ['milk', ['우유', '젖을 짜다']],
    ['face', ['얼굴', '마주치다']], ['bed', ['침대', '잠을 재우다']],
    ['bad', ['나쁘다', '악하다']], ['no', ['아니요', '무엇이 없다']],
    ['cock', ['수탉', '두목', '성기']], ['boohoo', ['엉엉']], ['Lila', ['여자 이름']],
    ['convincing', ['설득력 있는']], ['devil', ['악마']],
    ['counterattack', ['역습, 반격', '역습하다, 반격하다']],
    ['student', ['학생']], ['horse', ['말']], ['policy', ['정책']],
    ['curtsey', ['여성의 절']], ['cusp', ['만나는 점']],
    ['addiction', ['중독']], ['lot', ['제비', '몫', '구획']],
    ['hub of the universe', ['우주', '중심', '미국', '보스턴']],
    ['bitten', ['bite', '과거분사']], ['bases', ['base의 복수', 'basis의 복수']],
  ]) {
    const entries = await lookupEnglishEntry(word, { fetchImpl });
    const glosses = entries.flatMap(entry => entry.senses.flatMap(sense => sense.glosses));
    for (const meaning of meanings) assert.ok(glosses.some(gloss => gloss.includes(meaning)), `${word}: ${meaning}`);
    assert.ok(entries.every(entry => entry.sourceUrl.startsWith('https://ko.wiktionary.org/wiki/') && entry.license.name === 'CC BY-SA 4.0' && entry.sourceNote.includes('공식 원문 덤프')));
  }
  const nextDoor = await lookupEnglishEntry('next-door', { fetchImpl });
  assert.deepEqual(nextDoor[0].senses[0].examples[0], { text: 'The person next door keeps playing loud music.', translation: '옆 집 사는 사람은 큰 소리로 음악을 틀어 놓는다.' });
  const tree = await lookupEnglishEntry('tree', { fetchImpl });
  assert.equal(tree.filter(entry => entry.senses.some(sense => sense.glosses.includes('(식물) 나무.'))).length, 1, 'the former manual correction is not duplicated');
});

test('extraction error tags quarantine affected source content instead of displaying partial Korean glosses', () => {
  const base = { word: 'example', lang_code: 'en', pos: 'noun' };
  assert.equal(convertEntry({ ...base, tags: ['error-lua-exec'], senses: [{ glosses: ['불완전한 뜻'] }] }), null);
  const entry = convertEntry({ ...base, senses: [
    { glosses: ['온전한 뜻'] },
    { glosses: ['부분만 남은 뜻'], tags: ['error-lua-exec'] },
    { glosses: ['다른 온전한 뜻'] },
  ] });
  assert.deepEqual(entry.senses.map(sense => sense.glosses), [['온전한 뜻'], ['다른 온전한 뜻']]);
});
