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
  const app=createDictionaryApp({
    lookupEnglishEntry:(query,options)=>lookupEnglishEntry(query,{...options,fetchImpl:fetchLocal}),
    lookupKoreanEntry:(query,options)=>lookupKoreanEntry(query,{...options,fetchImpl:fetchLocal})
  },{document,window:{}});
  await app.search("apple");
  assert.equal(document.querySelector("#result-word").textContent,"apple");
  assert.ok(document.querySelector(".meaning-content").textContent.includes("사과"));
  await app.search("나무");
  assert.equal(document.querySelector("#result-word").textContent,"나무");
  assert.ok(document.querySelector(".meaning-content").textContent.includes("tree"));
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

test("auto direction supports normalized Hangul and user overrides",()=>{
  assert.equal(resolveDirection("나무"),"ko-en");
  assert.equal(resolveDirection("take off"),"en-ko");
  assert.equal(resolveDirection("나무","en-ko"),"en-ko");
});

test("latest request wins and a failed source is never described as a missing word",async()=>{
  const {document}=fixture();
  const pending=new Map();
  const app=createDictionaryApp({lookupEnglishEntry:word=>new Promise(resolve=>pending.set(word,resolve)),lookupKoreanEntry:async()=>[]},{document,window:{}});
  const first=app.search("first");
  const second=app.search("second");
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
  assert.ok(!other.querySelector("#lookup-area").textContent.includes("풀이가 없습니다"));
});

test("partial Korean lookup and ordinary missing word produce distinct copy",async()=>{
  const {document}=fixture();
  const app=createDictionaryApp({lookupEnglishEntry:async()=>[],lookupKoreanEntry:async(_query,{onWarning})=>{onWarning("internal diagnostic");return [];}},{document,window:{}});
  await app.search("나무");
  assert.ok(document.querySelector("#lookup-area").textContent.includes("모두 확인하지 못했어요"));
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
  const window={location,history:{pushState(_state,_title,url){history.push(url.href);location.href=url.href;}},addEventListener(name,fn){listeners.set(name,fn);}};
  const app=createDictionaryApp({lookupEnglishEntry:async word=>[{word,senses:[{glosses:[word]}]}],lookupKoreanEntry:async()=>[]},{document,window});
  await app.search("apple");
  await app.search("apple");
  await app.search("hard");
  assert.equal(history.length,2);
  location.href=history[0];
  listeners.get("popstate")();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(document.querySelector("#result-word").textContent,"apple");
  assert.equal(history.length,2);
  location.href="https://example.test/";
  listeners.get("popstate")();
  assert.ok(document.querySelector(".welcome-state"));
  assert.equal(document.body.classList.contains("has-results"),false);
});
