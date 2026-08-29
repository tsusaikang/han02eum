import test from "node:test";
import assert from "node:assert/strict";

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

test("excluded and unrelated words do not receive a verified supplement", () => {
  for (const word of ["line", "fast", "screen", "play", "light", "hello"]) {
    assert.deepEqual(findVerifiedSupplements(word), []);
  }
});

test("the supplement renderer keeps part of speech, examples, source, and license together", () => {
  const document = new TestDocument();
  const target = document.createElement("div");

  assert.equal(renderVerifiedSupplements(target, "royal"), 1);
  assert.match(target.textContent, /royal\s*↔\s*왕족/);
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

  assert.equal(renderVerifiedSupplements(target, "hello"), 0);
  assert.equal(target.childElementCount, 0);
});
