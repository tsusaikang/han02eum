import test from "node:test";
import assert from "node:assert/strict";

import { cleanText, detectInputLanguage } from "../public/dictionary-parser.js";

test("detectInputLanguage distinguishes Korean from English input", () => {
  assert.equal(detectInputLanguage("context"), "en");
  assert.equal(detectInputLanguage("배우다"), "ko");
  assert.equal(detectInputLanguage("ㄱ"), "ko");
});

test("cleanText removes reference markers and normalizes punctuation spacing", () => {
  assert.equal(cleanText("  A   greeting [1] .  "), "A greeting.");
  assert.equal(cleanText("hello   world"), "hello world");
});
