import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  findVerifiedSupplements,
  renderVerifiedSupplements
} from "../public/verified-supplements.js";

class TestElement {
  constructor(ownerDocument, tagName) {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this._textContent = "";
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this._textContent = "";
    this.children = [...children];
  }

  get childElementCount() {
    return this.children.length;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const tagName = selector.toUpperCase();
    const matches = [];
    for (const child of this.children) {
      if (child.tagName === tagName) matches.push(child);
      matches.push(...child.querySelectorAll(selector));
    }
    return matches;
  }
}

class TestDocument {
  createElement(tagName) {
    return new TestElement(this, tagName);
  }
}

test("the verified royal and 왕족 searches resolve to the same single mapping", () => {
  const english = findVerifiedSupplements(" Royal ");
  const korean = findVerifiedSupplements("왕족");

  assert.equal(english.length, 1);
  assert.equal(korean.length, 1);
  assert.equal(english[0].id, korean[0].id);
  assert.equal(english[0].english.partOfSpeech, "noun");
  assert.equal(english[0].korean.id, "krdict:68298:1");
  assert.equal(english[0].korean.headword, "왕족");
  assert.deepEqual(english[0].korean.examples, [
    "몰락한 왕족.",
    "왕족 출신.",
    "왕족의 가문."
  ]);
});

test("the verified right and 시정하다 searches resolve to the same sourced mapping", () => {
  const english = findVerifiedSupplements(" RIGHT ");
  const korean = findVerifiedSupplements("시정하다");

  assert.equal(english.length, 1);
  assert.equal(korean.length, 1);
  assert.equal(english[0].id, korean[0].id);
  assert.equal(english[0].english.partOfSpeech, "verb");
  assert.equal(english[0].english.revisionId, 92121812);
  assert.equal(english[0].english.sourceUrl, "https://en.wiktionary.org/wiki/right");
  assert.equal(english[0].korean.id, "krdict:85281:1");
  assert.equal(english[0].korean.headword, "시정하다");
  assert.equal(english[0].korean.sourceName, "한국어기초사전");
  assert.deepEqual(english[0].korean.examples, [
    "시정한 부조리.",
    "관행을 시정하다.",
    "잘못을 시정하다."
  ]);
});

test("excluded and unrelated words do not receive a verified supplement", () => {
  for (const word of [
    "line", "fast", "screen", "play", "light",
    "bank", "run", "set", "record", "charge", "bear", "spring", "match", "point",
    "hello"
  ]) {
    assert.deepEqual(findVerifiedSupplements(word), []);
  }
});

test("the supplement renderer keeps meaning details and source together without creating another top-level heading", () => {
  const document = new TestDocument();
  const target = document.createElement("div");

  assert.equal(renderVerifiedSupplements(target, "royal"), 1);
  assert.match(target.textContent, /royal\s*↔\s*왕족/);
  assert.match(target.textContent, /출처가 확인된 보충 뜻/);
  assert.match(target.textContent, /한국어기초사전 확인/);
  assert.match(target.textContent, /명사 · noun/);
  assert.match(target.textContent, /임금과 같은 집안인 사람/);
  assert.match(target.textContent, /몰락한 왕족/);
  assert.match(target.textContent, /왕족 출신/);
  assert.match(target.textContent, /왕족의 가문/);
  assert.match(target.textContent, /보완 뜻 출처: 한국어기초사전/);
  assert.match(target.textContent, /CC BY-SA 2.0 KR/);

  const links = [...target.querySelectorAll("a")].map((link) => link.href);
  assert.equal(
    links.includes("https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=68298&nation=eng&nationCode=6"),
    true
  );
  assert.equal(links.includes("https://creativecommons.org/licenses/by-sa/2.0/kr/"), true);
  assert.equal(links.includes("https://en.wiktionary.org/wiki/royal"), true);
  assert.equal(target.querySelectorAll("h3").length, 0);

  assert.equal(renderVerifiedSupplements(target, "hello"), 0);
  assert.equal(target.childElementCount, 0);
});

test("verified supplements are nested inside the single Korean meanings section", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const koreanMeaningsStart = html.indexOf('<section id="translation-section"');
  const supplements = html.indexOf('<div id="verified-supplements">', koreanMeaningsStart);
  const koreanMeaningsEnd = html.indexOf("</section>", supplements);
  const englishDefinitions = html.indexOf('<section id="definitions-section"', koreanMeaningsEnd);

  assert.notEqual(koreanMeaningsStart, -1);
  assert.ok(supplements > koreanMeaningsStart);
  assert.ok(koreanMeaningsEnd > supplements);
  assert.ok(englishDefinitions > koreanMeaningsEnd);
});
