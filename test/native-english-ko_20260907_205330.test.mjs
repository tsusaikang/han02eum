import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { convertEntry, normalizeLookupKey, shardNumber } from '../scripts/build-native-english-ko_20260907_205330.mjs';
import { lookupEnglishEntry, nativeEnglishShardName } from '../public/native-english-ko.js';

test('native Korean gloss extraction preserves unknown POS and sense boundaries and excludes false glosses', () => {
  const entry = convertEntry({word:'take off',lang_code:'en',pos:'unknown',senses:[
    {glosses:['(옷 등을) 벗다.'], examples:[{text:'He took off his shoes. 그는 신발을 벗었다.'}]},
    {glosses:[', VOA Learning English (public domain)'],examples:[{text:'Orphan example'}]},
    {glosses:['(비행기가) 이륙하다.']}, {glosses:['{{틀:오류}}']}
  ]});
  assert.equal(entry.pos,'unknown'); assert.deepEqual(entry.senses.map(s=>s.glosses),[['(옷 등을) 벗다.'],['(비행기가) 이륙하다.']]);
  assert.equal(entry.senses[1].examples,undefined); assert.equal(entry.senses[0].examples[0].text,'He took off his shoes. 그는 신발을 벗었다.');
  assert.equal(convertEntry({word:'test',lang_code:'en',senses:[{glosses:['English only']}]}),null);
  assert.ok(convertEntry({word:'offer',lang_code:'en',senses:[{glosses:['<법률> 청약(請約)']}]}));
});
test('real English native shards load phrases, preserve senses, and distinguish missing from failure',async()=>{
  const fetchImpl=async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL('../public'+url,import.meta.url),'utf8'))});
  for(const word of ['apple','hard','take off','royal']){
    const entries=await lookupEnglishEntry(word,{fetchImpl}); assert.ok(entries.length,word);
    assert.ok(entries.every(e=>e.senses.every(s=>s.glosses.some(g=>/[가-힣]/u.test(g)))));
  }
  assert.equal((await lookupEnglishEntry(' TAKE   OFF ',{fetchImpl}))[0].word,'take off');
  const upperCase = await lookupEnglishEntry(' US ',{fetchImpl});
  const lowerCase = await lookupEnglishEntry('us',{fetchImpl});
  assert.ok(upperCase.length && lowerCase.length);
  assert.ok(upperCase.every(entry => entry.word === 'US'));
  assert.ok(lowerCase.every(entry => entry.word === 'us'));
  assert.deepEqual(new Set((await lookupEnglishEntry('Us',{fetchImpl})).map(entry => entry.word)),new Set(['US','us']));
  assert.equal(await nativeEnglishShardName(' TAKE   OFF '),`shard-${String(shardNumber(normalizeLookupKey('take off'))).padStart(2,'0')}.json`);
  assert.deepEqual(await lookupEnglishEntry('qzxnomatcheverxyz',{fetchImpl}),[]);
  await assert.rejects(lookupEnglishEntry('apple',{fetchImpl:async()=>({ok:false})}),/불러오지/);
});

test('tree retains archived raw and exposes complete source-page senses without manual duplication', async () => {
  const shardPath = new URL('../public/native-english-ko_20260907_205330/' + await nativeEnglishShardName('tree'), import.meta.url);
  const extracted = JSON.parse(await readFile(shardPath, 'utf8')).words.tree;
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].pos, 'verb');
  assert.equal(extracted[0].posTitle, '타동사');
  assert.deepEqual(extracted[0].senses.map(sense => sense.glosses), [['동물을 쫓아 나무 위로 오르게 하다. (tree up)']]);
  const fetchImpl = async url => ({ok:true,json:async()=>JSON.parse(await readFile(new URL('../public'+url,import.meta.url),'utf8'))});
  const corrected = await lookupEnglishEntry('tree', {fetchImpl});
  assert.deepEqual(corrected.flatMap(entry => entry.senses.map(sense => sense.glosses)), [
    ['(식물) 나무.'], ['나뭇가지 구조, 계보.'], ['동물을 쫓아 나무 위로 오르게 하다. (tree up)']
  ]);
  assert.equal(corrected[0].pos, 'unknown');
  assert.equal(corrected[0].posTitle, undefined);
  assert.deepEqual(corrected[0].senses[0].examples, [{text:'Some trees are being grown in the back yard. 몇몇 나무들이 뒤뜰에서 자라는 중이다.'}]);
  assert.equal(corrected[0].senses[1].examples, undefined);
  assert.equal(corrected[0].sourceUrl, 'https://ko.wiktionary.org/wiki/tree#영어');
  assert.deepEqual(corrected.slice(1).map(({sourceNote, ...entry}) => entry), extracted);
  assert.deepEqual(await lookupEnglishEntry(' TREE ', {fetchImpl}), corrected);
});
