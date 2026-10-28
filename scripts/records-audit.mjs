import {readFileSync, readdirSync, existsSync, realpathSync} from 'node:fs';
import {resolve, relative, sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

const fixedUrl = '/dictionary-sources_20260909_235001.html';
const recordUrl = value => value === fixedUrl || /^\/records\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(value);
const canonical = value => value === fixedUrl.slice(0,-5) ? fixedUrl : value;
const git = (root,args) => execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const text = (root,path) => readFileSync(resolve(root,path),'utf8');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
function requireValue(condition,message){if(!condition) throw new Error(message);}
function validDate(value){
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const calendar = value.slice(0,10);
  const parsed = new Date(calendar+'T00:00:00Z');
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0,10)===calendar && !Number.isNaN(new Date(value).valueOf());
}
function htmlFiles(root,dir='public'){
  return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(entry=>{
    const path=`${dir}/${entry.name}`;
    return entry.isDirectory()?htmlFiles(root,path):entry.isFile()&&entry.name.endsWith('.html')?[path]:[];
  });
}
function validateMeta(meta,path){
  requireValue(meta && meta.schema_version===1,`${path}: schema_version 오류`);
  for(const key of ['title','description','version','url']) requireValue(nonempty(meta[key]),`${path}: ${key} 누락`);
  requireValue(['snapshot','current'].includes(meta.kind),`${path}: kind 오류`);
  for(const key of ['as_of','updated_at','published_at']) requireValue(validDate(meta[key]),`${path}: ${key} 날짜 오류`);
  requireValue(/^v\d+$/.test(meta.version),`${path}: version 오류`);
  requireValue(recordUrl(meta.url),`${path}: URL 형식 오류`);
  requireValue(Array.isArray(meta.keywords)&&meta.keywords.length>0&&meta.keywords.every(nonempty),`${path}: keywords 오류`);
  requireValue(Array.isArray(meta.sources)&&meta.sources.length>0,`${path}: sources 누락`);
  for(const source of meta.sources){
    requireValue(nonempty(source.path)&&!source.path.startsWith('/')&&!source.path.includes('\\')&&!source.path.split('/').includes('..'),`${path}: 근거 경로 오류`);
    if(source.keywords!==undefined) requireValue(Array.isArray(source.keywords)&&source.keywords.length>0&&source.keywords.every(nonempty),`${path}: 근거 keywords 오류`);
  }
}
export function discover(root){
  const records=[];
  for(const path of htmlFiles(root)){
    const {document}=parseHTML(text(root,path));
    const nodes=document.querySelectorAll('#record-meta');
    requireValue(nodes.length<=1,`${path}: 중복 record-meta`);
    if(!nodes.length) continue;
    requireValue(nodes[0].getAttribute('type')==='application/json',`${path}: record-meta type 오류`);
    let meta;try{meta=JSON.parse(nodes[0].textContent);}catch{throw new Error(`${path}: record-meta JSON 오류`);}
    validateMeta(meta,path);
    const served=meta.url.endsWith('/')?`public${meta.url}index.html`:`public${meta.url}`;
    requireValue(path===served,`${path}: 실제 페이지와 URL 불일치`);
    records.push({path,meta});
  }
  requireValue(records.length>0,'기록 페이지를 찾지 못했습니다.');
  requireValue(new Set(records.map(item=>item.meta.url)).size===records.length,'기록 URL 중복');
  return records;
}
function listedUrls(document){
  return [...document.querySelectorAll('a[href]')].map(a=>{
    try{const u=new URL(a.getAttribute('href'),'https://han02eum.com');return u.origin==='https://han02eum.com'?canonical(u.pathname):'';}catch{return '';}
  }).filter(url=>recordUrl(url));
}
export function check(root){
  const records=discover(root);
  const home=parseHTML(text(root,'public/index.html')).document;
  const readme=text(root,'README.md');
  const map=readme.match(/<!-- record-map:start -->([\s\S]*?)<!-- record-map:end -->/);
  requireValue(map,'README 기록 지도 구간 누락');
  const mapUrls=[...map[1].matchAll(/\]\(([^)]+)\)/g)].map(m=>{try{return canonical(new URL(m[1],'https://han02eum.com').pathname);}catch{return '';}}).filter(recordUrl);
  const urls=records.map(item=>item.meta.url);
  for(const [label,listed] of [['홈',listedUrls(home)],['README',mapUrls]]){
    requireValue(urls.every(url=>listed.includes(url))&&listed.every(url=>urls.includes(url)),`${label}: 실제 기록 페이지와 링크 불일치`);
  }
  for(const {path,meta} of records){
    for(const source of meta.sources){
      const resolved=resolve(root,source.path);
      requireValue(!relative(root,resolved).startsWith(`..${sep}`),`${path}: 저장소 밖 근거 경로`);
      let present=existsSync(resolved);
      if(present) requireValue(!relative(realpathSync(root),realpathSync(resolved)).startsWith(`..${sep}`),`${path}: 저장소 밖 근거 경로`);
      if(!present&&meta.source_revision){try{git(root,['cat-file','-e',`${meta.source_revision}:${source.path}`]);present=true;}catch{}}
      requireValue(present,`${path}: 근거가 없음 — ${source.path}`);
      requireValue(map[1].includes(source.path),`README: 근거 지도 누락 — ${source.path}`);
    }
  }
  return [`check: 실제 기록 ${records.length}개 · 홈 링크 · README 지도 · 메타데이터 · 근거 경로 일치`];
}
function scopeArgs(root,args){
  if(args.length===1&&args[0]==='--staged') return {label:'HEAD → 인덱스 (staged)',diff:['--cached'],untracked:false};
  if(args.length===1&&args[0]==='--working'){
    let hasHead=true;try{git(root,['rev-parse','--verify','HEAD']);}catch{hasHead=false;}
    return {label:hasHead?'HEAD → 인덱스·작업 트리 + 미추적 파일 (working)':'초기 저장소 전체 (working)',diff:hasHead?['HEAD']:['--cached'],untracked:true,initial:!hasHead};
  }
  if(args.length===4&&args[0]==='--base'&&args[2]==='--head'){
    git(root,['rev-parse','--verify',`${args[1]}^{commit}`]);git(root,['rev-parse','--verify',`${args[3]}^{commit}`]);
    return {label:`커밋 ${args[1]} → ${args[3]}`,diff:[args[1],args[3]],untracked:false};
  }
  throw new Error('비교 범위 필요: affected --working | --staged | --base <ref> --head <ref>');
}
function changeSet(root,scope){
  const parts=git(root,['diff','--name-status','-z','--find-renames',...scope.diff,'--']).split('\0').filter(Boolean);
  const changes=[];
  for(let i=0;i<parts.length;){
    const status=parts[i++];const old=parts[i++];
    requireValue(old, 'Git 변경 경로 해석 실패');
    const paths=/^[RC]/.test(status)?[old,parts[i++]]:[old];
    requireValue(paths.every(nonempty),'Git 이름 변경 해석 실패');
    changes.push({status,paths});
  }
  if(scope.untracked){
    for(const path of git(root,['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean)) changes.push({status:'?',paths:[path],untracked:true});
    if(scope.initial) for(const path of git(root,['ls-files','-z']).split('\0').filter(Boolean)) changes.push({status:'A',paths:[path],untracked:true});
  }
  return changes;
}
function changedLines(diff){
  let inHunk=false;const lines=[];
  for(const line of diff.split('\n')){
    if(line.startsWith('diff --git ')){inHunk=false;continue;}
    if(line.startsWith('@@ ')){inHunk=true;continue;}
    if(inHunk&&/^[+-]/.test(line)) lines.push(line.slice(1));
  }
  return lines;
}
const matches=(source,path)=>source.endsWith('/')?path.startsWith(source):path===source;
export function affected(root,args){
  const records=discover(root);const scope=scopeArgs(root,args);const changes=changeSet(root,scope);const results=[];
  for(const {meta} of records){
    const reasons=new Set();
    for(const source of meta.sources){
      for(const change of changes.filter(c=>c.paths.some(path=>matches(source.path,path)))){
        if(!source.keywords){reasons.add('근거 파일 변경');continue;}
        if(/^[DR]/.test(change.status)){reasons.add('근거 삭제·이름 변경');continue;}
        const lines=change.untracked?text(root,change.paths[0]).split('\n'):changedLines(git(root,['diff','--no-ext-diff','--no-color','--unified=0',...scope.diff,'--',...change.paths]));
        if(lines.some(line=>source.keywords.some(keyword=>line.toLocaleLowerCase('en-US').includes(keyword.toLocaleLowerCase('en-US'))))) reasons.add('근거의 지정 키워드가 있는 줄 변경');
      }
    }
    if(reasons.size) results.push(`${meta.title} · ${meta.url} · ${[...reasons].join(', ')}`);
  }
  return [`affected 비교 범위: ${scope.label}`,...(results.length?results:['해당 범위의 기록 갱신 후보 없음'])];
}
export function runAudit(root,args){
  if(args[0]==='check'&&args.length===1) return check(root);
  if(args[0]==='affected') return affected(root,args.slice(1));
  throw new Error('사용법: node scripts/records-audit.mjs check | affected --working | --staged | --base <ref> --head <ref>');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const root=git(process.cwd(),['rev-parse','--show-toplevel']).trim();console.log(runAudit(root,process.argv.slice(2)).join('\n'));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
