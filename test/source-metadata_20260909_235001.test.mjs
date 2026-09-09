import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSourceMetadata, compareKeys, keyCounts } from '../scripts/build-source-metadata_20260909_235001.mjs';

test('stored-key comparison merges case and width, keeps phrase boundaries, and is not additive', () => {
  const left = new Set(['US', 'ＴＲＥＥ', 'take   care of']);
  const right = new Set(['us', 'tree', 'meokda']);
  assert.deepEqual(compareKeys(left, right), { intersection: 2, union: 4, kowiktionaryOnly: 1, krdictOnly: 1 });
  assert.deepEqual(keyCounts(['us', 'meokda', 'take care of', 'us']), { searchKeys: 3, keysWithoutSpaces: 2, keysWithSpaces: 1 });
});

test('published metadata can be regenerated entirely from active public assets', async () => {
  const saved = JSON.parse(await readFile(new URL('../public/source-metadata_20260909_235001.json', import.meta.url), 'utf8'));
  const rebuilt = await buildSourceMetadata({ generatedAt: saved.generatedAt });
  assert.deepEqual(rebuilt, saved);
  const wiki = saved.sources.find(source => source.id === 'kowiktionary');
  const kr = saved.sources.find(source => source.id === 'krdict');
  const c = saved.englishInputCoverage;
  assert.equal(c.intersection + c.kowiktionaryOnly, wiki.counts.searchKeys);
  assert.equal(c.intersection + c.krdictOnly, kr.counts.englishSearchKeys);
  assert.equal(c.intersection + c.kowiktionaryOnly + c.krdictOnly, c.union);
  assert.equal(c.breakdown.withoutSpaces.union + c.breakdown.withSpaces.union, c.union);
  assert.equal(kr.counts.detailSenses, kr.counts.senses);
  assert.equal(kr.counts.koreanEnglishSenses + kr.counts.koreanReferenceSenses, kr.counts.senses);
  assert.equal(saved.legacy.koreanCombined.senses, kr.counts.senses);
  assert.equal(saved.legacy.layers.find(layer => layer.id === 'reviewed-exact').counts.pairs, 208);
  assert.equal(saved.sources.find(source => source.id === 'enwiktionary').counts.totalEntries, null);
  assert.equal(saved.calculation.searchShardsRead, 512);
  assert.equal(saved.calculation.detailShardsRead, 256);
});
