import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseHTML} from "linkedom";
import {initializeSourceMetadata,renderSourceMetadata,validateMetadata} from "../public/dictionary-sources_20260909_235001.js";
const read = path => readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const metadata = JSON.parse(read("public/source-metadata_20260909_235001.json"));
const fixture = () => parseHTML(read("public/dictionary-sources_20260909_235001.html")).document;

test("source page displays only the two supported dictionaries and actual deduplicated counts",()=>{
  const document = fixture();
  renderSourceMetadata(document.getElementById("source-statistics"),metadata);
  const text = document.body.textContent;
  const numbers = [...document.querySelectorAll(".overview-card .stat-number")].map(item=>item.textContent);
  assert.deepEqual(numbers,["56,205개","51,909개"]);
  assert.ok(text.includes("8,378"));
  assert.ok(text.includes("23,414"));
  assert.ok(text.includes("76,833"));
  assert.ok(!text.includes("뜻 연결 208개"));
  assert.ok(!text.includes("이전 검색"));
  assert.ok(!text.includes("영어판 Wiktionary"));
  assert.ok(!text.includes("기기 음성"));
  assert.ok(text.includes("80자"));
  assert.ok(text.includes("한영이음에서 표제어는"));
  assert.ok(!text.includes("native-krdict_"));
  assert.ok(!text.includes("manifest"));
  assert.equal(document.querySelectorAll(".coverage-legend>div").length,3);
  assert.equal(document.querySelectorAll(".source-grid .source-card").length,2);
  assert.equal(document.querySelectorAll(".coverage-table tbody tr").length,3);
  assert.equal(document.querySelector('.origin-grid a[href="https://en.wiktionary.org/"]'),null);
  assert.equal(document.querySelector('a[href*="legacy_"]'),null);
});

test("unavailable or inconsistent counts stay unavailable and retry can load the real metadata",async()=>{
  const document=fixture();let calls=0;
  const bad=structuredClone(metadata);bad.englishInputCoverage.union++;
  assert.throws(()=>validateMetadata(bad));
  const app=initializeSourceMetadata({document,fetchImpl:async()=>({ok:true,json:async()=>{calls++;return calls===1?bad:metadata;}})});
  await app.ready;
  assert.ok(document.querySelector("#metadata-status").textContent.includes("불러오지 못했어요"));
  assert.equal(document.querySelector("#metadata-retry").hidden,false);
  assert.equal(document.querySelector(".stat-number"),null);
  document.querySelector("#metadata-retry").click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,2);
  assert.equal(document.querySelector("#metadata-retry").hidden,true);
  assert.equal(document.querySelector("#metadata-status").textContent,"");
  assert.equal(document.querySelector("#source-statistics").getAttribute("aria-busy"),"false");
  assert.ok(document.querySelector(".stat-number"));
});

test("source explanations and original links remain in HTML, and all search entry pages link here",()=>{
  const document=fixture();
  assert.ok(document.querySelector("#how-it-works").textContent.includes("뜻이 정확히 같다는 뜻이 아닙니다"));
  assert.ok(document.querySelector("noscript"));
  assert.equal(document.querySelectorAll(".origin-grid article").length,2);
  for(const path of ["public/index.html","public/native-dictionary_20260907_205350.html"]){
    const entry=parseHTML(read(path)).document;
    const link=entry.querySelector('a[href="/dictionary-sources_20260909_235001.html"]');
    assert.ok(link,path);
    assert.equal(link.textContent,"출처와 수록 범위");
    assert.equal(entry.querySelector('a[href*="legacy_"]'),null);
  }
});
