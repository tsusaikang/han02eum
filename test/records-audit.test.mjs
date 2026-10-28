import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {runAudit} from '../scripts/records-audit.mjs';
const url='/dictionary-sources_20260909_235001.html';
const page=`public${url}`;
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'dictionary-record-audit-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(path,value)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),value);};
  const meta={schema_version:1,title:'출처',description:'표본 설명',kind:'snapshot',as_of:'2026-09-10',updated_at:'2026-10-29T00:15:00+09:00',version:'v01',published_at:'2026-10-29T00:15:00+09:00',url,keywords:['자료'],sources:[{path:'docs/source.md',keywords:['COST']},{path:'data/'}]};
  const saveMeta=()=>write(page,`<script type="application/json" id="record-meta">${JSON.stringify(meta)}</script>`);
  saveMeta();write('public/index.html',`<a href="${url}">출처</a>`);
  write('README.md',`<!-- record-map:start -->\n[출처](${url})\n docs/source.md data/\n<!-- record-map:end -->`);
  write('docs/source.md','cost 100\nunrelated before\n');write('data/a.json','{}\n');
  git(root,'init','-q');git(root,'config','user.email','test@example.invalid');git(root,'config','user.name','Fixture');git(root,'add','.');git(root,'commit','-qm','initial');
  return {root,write,meta,saveMeta};
}
test('working, staged and commit ranges use changed lines including deletions; untracked files and path boundaries',t=>{
  const {root,write}=fixture(t);
  write('docs/source.md','cost 100\nunrelated after\n');
  assert.match(runAudit(root,['affected','--working']).join('\n'),/후보 없음/);
  write('docs/source.md','unrelated after\n');
  assert.match(runAudit(root,['affected','--working']).join('\n'),/키워드/);
  assert.match(runAudit(root,['affected','--staged']).join('\n'),/후보 없음/);
  git(root,'add','docs/source.md');assert.match(runAudit(root,['affected','--staged']).join('\n'),/키워드/);
  git(root,'commit','-qm','remove keyword');
  assert.match(runAudit(root,['affected','--base','HEAD~1','--head','HEAD']).join('\n'),/키워드/);
  write('data-old/b.json','{}');assert.match(runAudit(root,['affected','--working']).join('\n'),/후보 없음/);
  write('data/new.json','{}');assert.match(runAudit(root,['affected','--working']).join('\n'),/근거 파일 변경/);
});
test('rename and deletion are detected even when watched keyword is absent',t=>{
  const {root,write}=fixture(t);write('docs/source.md','no matching word\n');git(root,'add','.');git(root,'commit','-qm','no keyword');
  renameSync(join(root,'docs/source.md'),join(root,'docs/renamed.md'));git(root,'add','.');
  assert.match(runAudit(root,['affected','--staged']).join('\n'),/이름 변경/);
  git(root,'reset','--hard','HEAD');rmSync(join(root,'docs/source.md'));
  assert.match(runAudit(root,['affected','--working']).join('\n'),/삭제/);
});
test('check discovers pages and rejects missing page, home link, README map, invalid date and missing evidence',t=>{
  const {root,write,meta,saveMeta}=fixture(t);assert.match(runAudit(root,['check'])[0],/일치/);
  write('public/index.html','');assert.throws(()=>runAudit(root,['check']),/홈/);write('public/index.html',`<a href="${url}">출처</a>`);
  const readme=readFileSync(join(root,'README.md'),'utf8');write('README.md','');assert.throws(()=>runAudit(root,['check']),/지도/);write('README.md',readme);
  meta.as_of='2026-02-30';saveMeta();assert.throws(()=>runAudit(root,['check']),/날짜/);meta.as_of='2026-09-10';saveMeta();
  rmSync(join(root,'docs/source.md'));assert.throws(()=>runAudit(root,['check']),/근거가 없음/);write('docs/source.md','cost 100');
  write('public/records/new/index.html',`<script type="application/json" id="record-meta">${JSON.stringify({...meta,url:'/records/new/'})}</script>`);
  assert.throws(()=>runAudit(root,['check']),/링크 불일치/);rmSync(join(root,'public/records'),{recursive:true});
  write(page,'<p>metadata absent</p>');assert.throws(()=>runAudit(root,['check']),/찾지 못했습니다/);
  write(page,'<script type="application/json" id="record-meta">{</script>');assert.throws(()=>runAudit(root,['check']),/JSON/);
});
test('invalid Git comparison and malformed source metadata fail visibly',t=>{
  const {root,meta,saveMeta}=fixture(t);
  assert.throws(()=>runAudit(root,['affected','--base','no-such-ref','--head','HEAD']));
  meta.sources[0].keywords=[];saveMeta();assert.throws(()=>runAudit(root,['affected','--working']),/keywords/);
  meta.sources[0]={path:'../outside.md'};saveMeta();assert.throws(()=>runAudit(root,['check']),/경로/);
});
