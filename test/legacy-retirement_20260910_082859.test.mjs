import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {Miniflare, convertV4MiniflareOptions} from 'miniflare';
import {parseHTML} from 'linkedom';

const publicFile = name => new URL(`../public/${name}`, import.meta.url);

test('retired HTML loads only the current-search redirect and preserves query in static previews', async () => {
  const html = await readFile(publicFile('legacy_20260907_205800.html'), 'utf8');
  const script = await readFile(publicFile('legacy-search-redirect_20260910_082859.js'), 'utf8');
  for (const search of ['', '?q=tree', '?q=take%20care%20of', '?q=%EB%82%98%EB%AC%B4', '?q=US&from=bookmark']) {
    const {document} = parseHTML(html);
    assert.equal(document.querySelectorAll('script').length, 1);
    assert.equal(document.querySelector('script').getAttribute('src'), '/legacy-search-redirect_20260910_082859.js');
    assert.equal(document.querySelector('#search-form'), null);
    assert.equal(document.querySelector('#result'), null);
    let destination;
    vm.runInNewContext(script, {document, window: {location: {search, replace(value) {destination = value;}}}});
    assert.equal(destination, `/${search}`);
    const fallback = new URL(document.querySelector('#current-search-link').getAttribute('href'), 'https://dictionary.example');
    assert.deepEqual([...fallback.searchParams], [...new URL(destination, 'https://dictionary.example').searchParams]);
  }
});

test('Cloudflare asset redirects retire HTML and prettified URLs while preserving query strings', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'han02eum-retired-route-'));
  let worker;
  try {
    for (const name of ['_redirects', 'legacy_20260907_205800.html', 'index.html']) {
      await writeFile(path.join(directory, name), await readFile(publicFile(name)));
    }
    worker = new Miniflare(convertV4MiniflareOptions({name: 'retired-route-test', modules: true, script: 'export default {fetch(request, env) {return env.ASSETS.fetch(request);}}', compatibilityDate: '2026-08-22', assets: {directory, binding: 'ASSETS'}}));
    for (const urlPath of ['/legacy_20260907_205800.html', '/legacy_20260907_205800', '/legacy_20260907_205800/']) {
      for (const query of ['', '?q=tree', '?q=take%20off', '?q=%EB%82%98%EB%AC%B4&from=bookmark']) {
        const response = await worker.dispatchFetch(`https://dictionary.example${urlPath}${query}`, {redirect: 'manual'});
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('location'), `/${query}`);
      }
    }
    const home = await worker.dispatchFetch('https://dictionary.example/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /native-dictionary-app_/);
  } finally {
    await worker?.dispose();
    await rm(directory, {recursive: true, force: true});
  }
});
