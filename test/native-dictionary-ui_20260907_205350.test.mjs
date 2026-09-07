import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";
import {renderEnglishEntries,renderKoreanEntries,resolveDirection,createDictionaryApp} from "../public/native-dictionary-app_20260907_205350.js";
import {lookupEnglishEntry} from "../public/native-english-ko.js";
import {lookupKoreanEntry} from "../public/native-korean-en_20260907_205345.js";

const html = readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
function fixture() { return parseHTML(html); }
const fetchLocal = async path => ({ok:true,json:async()=>JSON.parse(readFileSync(new URL(`../public${path}`,import.meta.url),"utf8"))});

test("the main page connects the native app and both real primary dictionaries",async()=>{
  const {document}=fixture();
  assert.equal(document.querySelector('script[type="module"]').getAttribute("src"),"/native-dictionary-app_20260907_205350.js");
  assert.equal(document.querySelector('link[rel="stylesheet"]').getAttribute("href"),"/native-dictionary_20260907_205350.css");
  assert.equal(document.querySelector("#legacy-search-link").getAttribute("href"),"/legacy_20260907_205800.html");
  assert.equal(document.querySelector('input[name="direction"]'),null);
  const app=createDictionaryApp({
    lookupEnglishEntry:(query,options)=>lookupEnglishEntry(query,{...options,fetchImpl:fetchLocal}),
    lookupKoreanEntry:(query,options)=>lookupKoreanEntry(query,{...options,fetchImpl:fetchLocal})
  },{document,window:{}});
  await app.search("apple");
  assert.equal(document.querySelector("#result-word").textContent,"apple");
  assert.ok(document.querySelector(".meaning-content").textContent.includes("사과"));
  assert.equal(document.querySelector(".result-direction").textContent,"영어 → 한국어");
  assert.equal(document.querySelector("#lookup-status").classList.contains("sr-only"),true);
  await app.search("나무");
  assert.equal(document.querySelector("#result-word").textContent,"나무");
  assert.ok(document.querySelector(".meaning-content").textContent.includes("tree"));
  assert.equal(document.querySelector(".result-direction").textContent,"한국어 → 영어");
});

test("actual primary data renders Korean English meanings and unknown POS without inferred labels",async()=>{
  const {document}=fixture();
  const area=document.querySelector("#lookup-area");
  area.replaceChildren();
  const english=await lookupEnglishEntry("hard",{fetchImpl:fetchLocal});
  assert.ok(renderEnglishEntries(area,english)>0);
  assert.equal(area.querySelectorAll(".part-of-speech").length,0);
  assert.ok(area.textContent.includes("한국어판 위키낱말사전 기여자"));
  assert.ok(!area.textContent.includes("unknown"));
  const korean=await lookupKoreanEntry("숫자",{fetchImpl:fetchLocal});
  area.replaceChildren();
  assert.ok(renderKoreanEntries(area,korean)>0);
  assert.ok(area.textContent.includes("figure"));
  assert.ok(area.textContent.includes("한국어기초사전"));
});

test("Korean-only references remain untranslated and source text is not executable",()=>{
  const {document}=fixture();
  const area=document.querySelector("#lookup-area");
  area.replaceChildren();
  renderKoreanEntries(area,[{sourceKind:"korean-reference",definitionKo:"→칸막이 <script>alert(1)</script>",source:{name:"사전",url:"javascript:alert(1)"}}]);
  assert.ok(area.textContent.includes("영어 뜻 없이"));
  assert.ok(area.textContent.includes("→칸막이"));
  assert.equal(area.querySelector("script"),null);
  assert.equal(area.querySelector("a"),null);
  assert.equal(area.querySelector(".part-of-speech"),null);
});

test("all source glosses stay together and more reveals the remaining senses",()=>{
  const {document,window}=fixture();
  const area=document.querySelector("#lookup-area");
  area.replaceChildren();
  renderEnglishEntries(area,[{word:"test",pos:"noun",senses:Array.from({length:10},(_,i)=>({glosses:[`상위 ${i}`,`하위 ${i}`],tags:["no-gloss","noun"]})),sourceUrl:"https://ko.wiktionary.org/wiki/test"}]);
  assert.equal(area.querySelectorAll(".sense").length,8);
  assert.equal(area.querySelectorAll(".sense-meaning").length,16);
  assert.ok(!area.textContent.includes("no-gloss"));
  area.querySelector(".more-button").dispatchEvent(new window.Event("click"));
  assert.equal(area.querySelectorAll(".sense").length,10);
  assert.equal(area.querySelectorAll(".sense-meaning").length,20);
});

test("direction always follows the input including normalized Hangul",()=>{
  assert.equal(resolveDirection("나무"),"ko-en");
  assert.equal(resolveDirection("take off"),"en-ko");
  assert.equal(resolveDirection("나무","en-ko"),"ko-en");
});

test("latest request wins and a failed source is never described as a missing word",async()=>{
  const {document}=fixture();
  const pending=new Map();
  const app=createDictionaryApp({lookupEnglishEntry:word=>new Promise(resolve=>pending.set(word,resolve)),lookupKoreanEntry:async()=>[]},{document,window:{}});
  const first=app.search("first");
  const second=app.search("second");
  assert.equal(document.querySelector("#lookup-status").classList.contains("sr-only"),false);
  pending.get("second")([{word:"second",senses:[{glosses:["두 번째"]}]}]);
  await second;
  pending.get("first")([{word:"first",senses:[{glosses:["첫 번째"]}]}]);
  await first;
  assert.equal(document.querySelector("#result-word").textContent,"second");
  assert.equal(document.querySelector("#lookup-area").getAttribute("aria-busy"),"false");
  const other=fixture().document;
  const broken=createDictionaryApp({lookupEnglishEntry:async()=>{throw Error("network")},lookupKoreanEntry:async()=>[]},{document:other,window:{}});
  await broken.search("first");
  assert.ok(other.querySelector("#lookup-area").textContent.includes("불러오지 못했어요"));
  assert.equal(other.querySelector("#lookup-status").classList.contains("sr-only"),false);
  assert.ok(!other.querySelector("#lookup-area").textContent.includes("풀이가 없습니다"));
});

test("partial Korean lookup and ordinary missing word produce distinct copy",async()=>{
  const {document}=fixture();
  const app=createDictionaryApp({lookupEnglishEntry:async()=>[],lookupKoreanEntry:async(_query,{onWarning})=>{onWarning("internal diagnostic");return [];}},{document,window:{}});
  await app.search("나무");
  assert.ok(document.querySelector("#lookup-area").textContent.includes("모두 확인하지 못했어요"));
  assert.equal(document.querySelector("#lookup-status").classList.contains("sr-only"),false);
  assert.ok(!document.body.textContent.includes("internal diagnostic"));
  await app.search("missing");
  assert.ok(document.querySelector("#lookup-area").textContent.includes("한국어 풀이가 없습니다"));
  assert.ok(document.querySelector(".entry-links a").href.includes("en.wiktionary.org/wiki/missing"));
});

test("a missing English primary opens the distinct Korean source automatically",async()=>{
  const {document}=fixture();
  let reverseCalls=0;
  const app=createDictionaryApp({lookupEnglishEntry:async()=>[],lookupKoreanEntry:async()=>[],lookupKoreanByEnglish:async()=>{reverseCalls++;return [{headword:"나무",englishExpression:"tree",definitionKo:"나무의 한국어 원뜻",source:{name:"한국어기초사전"}}];}},{document,window:{}});
  await app.search("tree");
  assert.equal(reverseCalls,1);
  assert.equal(document.querySelector(".related-details").open,true);
  assert.ok(document.querySelector(".related-details").textContent.includes("나무의 한국어 원뜻"));
  assert.ok(document.querySelector(".empty-result").textContent.includes("위키낱말사전"));
  assert.equal(document.querySelector("#lookup-status").textContent,"한국어기초사전의 관련 항목을 표시했습니다.");
  assert.equal(document.querySelector("#lookup-status").classList.contains("sr-only"),true);
});

test("related-only status preserves loading scope, partial warnings, and newer search results",async()=>{
  const {document}=fixture();
  const pending=new Map();
  const app=createDictionaryApp({
    lookupEnglishEntry:async word=>word==="apple"?[{word,senses:[{glosses:["사과"]}]}]:[],
    lookupKoreanEntry:async()=>[],
    lookupKoreanByEnglish:async(word,options)=>new Promise(resolve=>pending.set(word,{resolve,options}))
  },{document,window:{}});
  await app.search("coexist");
  assert.equal(document.querySelector("#lookup-status").textContent,"기본 사전에 수록된 뜻이 없습니다.");
  pending.get("coexist").options.onWarning("partial");
  pending.get("coexist").resolve([{headword:"공존하다",englishExpression:"coexist",source:{name:"한국어기초사전"}}]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(document.querySelector("#lookup-status").textContent.includes("일부 자료를 불러오지 못했습니다"));
  await app.search("opsimathy");
  await app.search("apple");
  pending.get("opsimathy").resolve([{headword:"만학",englishExpression:"opsimathy",source:{name:"한국어기초사전"}}]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector("#lookup-status").textContent,"검색 결과를 표시했습니다.");
  assert.equal(document.querySelector("#result-word").textContent,"apple");
});

test("search retains browser history and back restores the home and search query",async()=>{
  const {document}=fixture();
  const listeners=new Map();
  const location={href:"https://example.test/"};
  const history=[];
  const window={location,history:{pushState(_state,_title,url){history.push(url.href);location.href=url.href;},replaceState(_state,_title,url){location.href=url.href;}},addEventListener(name,fn){listeners.set(name,fn);}};
  const app=createDictionaryApp({lookupEnglishEntry:async word=>[{word,senses:[{glosses:[word]}]}],lookupKoreanEntry:async()=>[]},{document,window});
  await app.search("apple");
  await app.search("apple");
  await app.search("hard");
  assert.equal(history.length,2);
  location.href=`${history[0]}&direction=ko-en`;
  listeners.get("popstate")();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector("#result-word").textContent,"apple");
  assert.equal(document.querySelector(".result-direction").textContent,"영어 → 한국어");
  assert.equal(new URL(location.href).searchParams.has("direction"),false);
  assert.equal(history.length,2);
  location.href="https://example.test/";
  listeners.get("popstate")();
  assert.ok(document.querySelector(".welcome-state"));
  assert.equal(document.body.classList.contains("has-results"),false);
});

test("Korean usage is visible while examples load once on opening and remain fully reachable",async()=>{
  const {document,window}=fixture();
  let calls=0;
  let finish;
  const record={id:"sample",headword:"나무",englishExpression:"tree",definitionKo:"나무",annotations:["주로 명사 앞에 쓴다."],entryAnnotations:["이름을 나타내는 말이다."],pronunciations:[{pronunciation:"나무"}],examplesCount:12,detailsRef:{}};
  const app=createDictionaryApp({lookupEnglishEntry:async()=>[],lookupKoreanEntry:async()=>[record],loadKoreanEntryDetails:()=>{calls++;return new Promise(resolve=>finish=resolve);}},{document,window:{}});
  await app.search("나무");
  assert.equal(calls,0);
  assert.equal(document.querySelectorAll(".source-pronunciation").length,1);
  assert.equal(document.querySelectorAll(".sense-usage").length,2);
  const details=document.querySelector(".korean-source-details");
  assert.equal(Boolean(details.open),false);
  details.open=true;details.dispatchEvent(new window.Event("toggle"));
  details.dispatchEvent(new window.Event("toggle"));
  assert.equal(calls,1);
  finish({examples:Array.from({length:12},(_,i)=>({type:"문장",texts:[`예문 ${i}`]})),senseRelations:[{feat:[{att:"type",val:"유의어"},{att:"lemma",val:"수목"}]}]});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(details.querySelectorAll(".source-example").length,8);
  details.querySelector(".example-more").dispatchEvent(new window.Event("click"));
  assert.equal(details.querySelectorAll(".source-example").length,12);
  assert.equal(details.querySelector(".relation-word").dataset.query,"수목");
  details.open=false;details.dispatchEvent(new window.Event("toggle"));
  details.open=true;details.dispatchEvent(new window.Event("toggle"));
  assert.equal(calls,1);
});

test("Korean lazy detail failures can retry and old searches cannot render stale detail",async()=>{
  const {document,window}=fixture();
  let calls=0;
  let finish;
  let signal;
  const record={id:"sample",headword:"나무",englishExpression:"tree",examplesCount:1,detailsRef:{}};
  const app=createDictionaryApp({lookupEnglishEntry:async word=>[{word,senses:[{glosses:["사과"]}]}],lookupKoreanEntry:async()=>[record],loadKoreanEntryDetails:async(_record,options)=>{calls++;signal=options.signal;if(calls===1)throw Error("offline");return new Promise(resolve=>finish=resolve);}},{document,window:{}});
  await app.search("나무");
  const details=document.querySelector(".korean-source-details");
  details.open=true;details.dispatchEvent(new window.Event("toggle"));
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(details.textContent.includes("불러오지 못했습니다"));
  details.open=false;details.dispatchEvent(new window.Event("toggle"));
  details.open=true;details.dispatchEvent(new window.Event("toggle"));
  assert.equal(calls,2);
  await app.search("apple");
  assert.equal(signal.aborted,true);
  finish({examples:[{type:"문장",texts:["이전 검색 예문"]}]});
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(!details.textContent.includes("이전 검색 예문"));
  assert.equal(document.querySelector("#result-word").textContent,"apple");
  assert.ok(!document.body.textContent.includes("이전 검색 예문"));
});

test("source usage and topic labels survive raw/normalized and entry/sense separation",()=>{
  const {document}=fixture();
  const area=document.querySelector("#lookup-area");area.replaceChildren();
  renderEnglishEntries(area,[{word:"sample",pos:"verb",tags:["transitive","slang","verb","error-lua-exec"],rawTags:["지역 한정"],topics:["law"],senses:[{glosses:["원문의 뜻"],rawTags:["수학","속어"],topics:["physics"],tags:["archaic","derogatory","pejorative","offensive","slang","no-gloss","error-missing-sense"]}]}]);
  const usage=area.querySelector(".sense-reference").textContent;
  for (const label of ["지역 한정","타동사","속어","법률","수학","물리","고어","비하","모욕적"]) assert.ok(usage.includes(label),label);
  assert.equal(usage.split("속어").length-1,1);
  assert.equal(usage.split("비하").length-1,1);
  assert.ok(!usage.includes("error"));assert.ok(!usage.includes("no-gloss"));
  assert.ok(!usage.includes("verb"));assert.ok(!usage.includes("physics"));
  assert.equal(area.querySelector(".sense-meaning").textContent,"원문의 뜻");
});

test("real divergence and bear retain their source mathematics/physics and archaic/finance restrictions",async()=>{
  const {document}=fixture();const area=document.querySelector("#lookup-area");area.replaceChildren();
  renderEnglishEntries(area,await lookupEnglishEntry("divergence",{fetchImpl:fetchLocal}));
  const mathSense=[...area.querySelectorAll(".sense")].find(sense=>sense.textContent.includes("발산"));
  assert.ok(mathSense.querySelector(".sense-reference").textContent.includes("수학"));
  assert.ok(mathSense.querySelector(".sense-reference").textContent.includes("물리"));
  area.replaceChildren();renderEnglishEntries(area,await lookupEnglishEntry("bear",{fetchImpl:fetchLocal}));
  const financeSense=[...area.querySelectorAll(".sense")].find(sense=>sense.textContent.includes("뇌동매도"));
  assert.ok(financeSense.querySelector(".sense-reference").textContent.includes("고어"));
  assert.ok(financeSense.querySelector(".sense-reference").textContent.includes("금융"));
});
