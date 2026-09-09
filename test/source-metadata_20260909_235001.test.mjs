import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, symlink, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSourceMetadata, compareKeys, keyCounts } from '../scripts/build-source-metadata_20260909_235001.mjs';

test('stored-key comparison merges case and width, keeps phrase boundaries, and is not additive', () => {
  const left = new Set(['US', 'ＴＲＥＥ', 'take   care of']);
  const right = new Set(['us', 'tree', 'meokda']);
  assert.deepEqual(compareKeys(left, right), { intersection: 2, union: 4, kowiktionaryOnly: 1, krdictOnly: 1 });
  assert.deepEqual(keyCounts(['us', 'meokda', 'take care of', 'us']), { searchKeys: 3, keysWithoutSpaces: 2, keysWithSpaces: 1 });
});

test('published metadata can be regenerated entirely from active public assets', async () => {
  const saved = JSON.parse(await readFile(new URL('../public/source-metadata_20260909_235001.json', import.meta.url), 'utf8'));
  const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
  const fixtureDir = await mkdtemp(path.join(tmpdir(), 'dictionary-current-sources-'));
  let rebuilt;
  try {
    for (const source of saved.sources) {
      for (const version of source.versions) await symlink(path.join(publicDir, version), path.join(fixtureDir, version), 'dir');
    }
    for (const loader of ['native-english-ko.js', 'native-korean-en_20260907_205345.js']) {
      await copyFile(path.join(publicDir, loader), path.join(fixtureDir, loader));
    }
    rebuilt = await buildSourceMetadata({ publicDir: fixtureDir, generatedAt: saved.generatedAt });
  } finally {
    await rm(fixtureDir, { recursive: true, force: true });
  }
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
  assert.deepEqual(saved.sources.map(source => source.id), ['kowiktionary', 'krdict']);
  assert.equal(Object.hasOwn(saved, 'legacy'), false);
  assert.equal(saved.calculation.searchShardsRead, 192);
  assert.equal(saved.calculation.detailShardsRead, 256);
});
