import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML,DOMParser} from 'linkedom';

test('legacy search exposes all POS groups, expandable meanings, parent context and recording attribution', async () => {
  const {document,window}=parseHTML(await readFile(new URL('../public/legacy_20260907_205800.html',import.meta.url),'utf8'));
  Object.assign(globalThis,{document,window,DOMParser,requestAnimationFrame:()=>0});
  window.location={href:'https://dictionary.example/legacy_20260907_205800.html'};
  window.matchMedia=()=>({matches:true});
  let failure=false;
  const html='<h2 id="English">English</h2><audio src="https://upload.wikimedia.org/wikipedia/commons/a/ab/En-us-test.ogg"></audio>'+Array.from({length:10},(_,g)=>'<h3>Noun</h3><ol>'+Array.from({length:10},(_,i)=>`<li>Meaning ${g+1}.${i+1}.${g===0&&i===0?'<ol><li>Child detail.</li></ol>':''}</li>`).join('')+'</ol>').join('');
  globalThis.fetch=async url=>String(url).startsWith('/api/lookup')
    ? Response.json(failure?{error:'Temporary upstream failure'}:{requestedWord:'zzstructuraltest',title:'zzstructuraltest',html,revisionId:1,sourceUrl:'https://en.wiktionary.org/wiki/zzstructuraltest',license:{name:'CC BY-SA 4.0'}},{status:failure?503:200})
    : Response.json({},{status:404});
  const {lookup}=await import('../public/app.js');
  await lookup('zzstructuraltest',{updateHistory:false});
  assert.equal(document.querySelector('#result').classList.contains('is-hidden'),false);
  assert.equal(document.querySelectorAll('.definition-group').length,10);
  assert.equal(document.querySelector('#definition-count').textContent,'101 meanings');
  const more=[...document.querySelectorAll('.definition-more')];
  assert.equal(more.length,10);
  assert.match(more[0].textContent,/Meaning 1.10/);
  more[0].setAttribute('open','');
  assert.equal(more[0].hasAttribute('open'),true);
  const child=document.querySelector('.definition-children');
  assert.equal(child.parentElement.querySelector('.definition-text').textContent,'Meaning 1.1.');
  assert.match(child.textContent,/Child detail/);
  assert.equal(document.querySelector('a.pronunciation-source').href,'https://commons.wikimedia.org/wiki/File:En-us-test.ogg');
  assert.match(document.querySelector('#source-description').textContent,/사전 텍스트/);
  assert.doesNotMatch(document.querySelector('#definition-groups').textContent,/sourcePath|unreviewed|parentId/);
  failure=true;
  await lookup('zzstructuraltest',{updateHistory:false});
  assert.equal(document.querySelector('#message-state').classList.contains('is-hidden'),false);
  assert.match(document.querySelector('#message-copy').textContent,/Temporary upstream failure/);
});
