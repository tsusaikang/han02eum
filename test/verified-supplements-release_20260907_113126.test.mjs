import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { DOMParser } from "linkedom";

import {
  findVerifiedSupplements,
  getVerifiedSupplementCount,
  renderVerifiedSupplements
} from "../public/verified-supplements.js";
import { VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260906_223941 } from "../public/verified-supplements-next-product-data_20260906_223941.js";
import { VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_002758 } from "../public/verified-supplements-next-product-data_20260907_002758.js";
import { VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_010217 } from "../public/verified-supplements-next-product-data_20260907_010217.js";
import {
  contextShardName,
  loadContextExpressions
} from "../public/context-relations.js";
import {
  koreanSourceShardName,
  loadKoreanSourceRelations,
  suppressExactEnglishTokens
} from "../public/korean-source-relations.js";

const ROOT = path.resolve(".");
const ADDITIONS = [
  ...VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260906_223941,
  ...VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_002758,
  ...VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_010217
];
const CONTEXT_VERSIONS = ["context-relations-v1-full", "context-relations-v2-recovered"];
const KOREAN_VERSIONS = ["korean-source-relations-v1-full", "korean-source-relations-v2-recovered"];
const WORKFLOW_METADATA = /(?:"|\b)(?:decision|reason|conciseReason|humanMeaningReviewed|independentReview|activationDecision|automaticPublication|productApplied)(?:"|\b)\s*:/u;

function normalizeEnglish(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en").replace(/\s+/gu, " ");
}

async function readShard(version, shardName, key) {
  const payload = JSON.parse(await readFile(path.join(ROOT, "public", version, shardName), "utf8"));
  return Array.isArray(payload?.words?.[key]) ? payload.words[key] : [];
}

const fixtureFetch = async (url) => {
  const payload = JSON.parse(await readFile(path.join(ROOT, "public", String(url).replace(/^\//u, "")), "utf8"));
  return { ok: true, async json() { return payload; } };
};

test("release catalog is the operating 82 plus the three ordered exact modules totaling 80", async () => {
  assert.deepEqual([
    VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260906_223941.length,
    VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_002758.length,
    VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_010217.length
  ], [1, 20, 59]);
  assert.equal(ADDITIONS.length, 80);
  assert.equal(getVerifiedSupplementCount(), 162);

  const source = await readFile("public/verified-supplements.js", "utf8");
  const orderedNames = [
    "...VERIFIED_SUPPLEMENTS_V15",
    "...VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260906_223941",
    "...VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_002758",
    "...VERIFIED_SUPPLEMENTS_NEXT_PRODUCT_20260907_010217"
  ];
  const offsets = orderedNames.map((name) => source.indexOf(name));
  assert.ok(offsets.every((offset) => offset >= 0));
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
});

test("all 80 additions have unique identities and collision-free bidirectional search terms", () => {
  const unique = (values) => new Set(values).size === values.length;
  assert.ok(unique(ADDITIONS.map((item) => item.id)));
  assert.ok(unique(ADDITIONS.map((item) => item.english.sourceSenseId)));
  assert.ok(unique(ADDITIONS.map((item) => item.korean.id)));
  assert.ok(unique(ADDITIONS.flatMap((item) => item.searchTerms.map(normalizeEnglish))));

  for (const item of ADDITIONS) {
    for (const term of item.searchTerms) {
      const matches = findVerifiedSupplements(term);
      assert.equal(matches.length, 1, `search collision: ${term}`);
      assert.equal(matches[0].id, item.id);
    }
  }
});

test("all 80 additions render in both directions and expose no workflow metadata", async () => {
  for (const item of ADDITIONS) {
    for (const term of [item.english.headword, item.korean.headword]) {
      const document = new DOMParser().parseFromString("<html><body><section id='target'></section></body></html>", "text/html");
      const container = document.querySelector("#target");
      assert.equal(renderVerifiedSupplements(container, term), 1);
      assert.ok(container.textContent.includes(item.korean.definition));
      assert.doesNotMatch(container.textContent, /humanMeaningReviewed|independentReview|activationDecision|automaticPublication|productApplied/u);
    }
  }

  for (const fileName of [
    "verified-supplements-next-product-data_20260906_223941.js",
    "verified-supplements-next-product-data_20260907_002758.js",
    "verified-supplements-next-product-data_20260907_010217.js"
  ]) {
    assert.doesNotMatch(await readFile(path.join("public", fileName), "utf8"), WORKFLOW_METADATA);
  }
});

test("context loader suppresses only each exact target and preserves every other card", async () => {
  let visible = 0;
  let suppressed = 0;
  let empty = 0;

  for (const item of ADDITIONS) {
    const key = normalizeEnglish(item.english.headword);
    const shardName = await contextShardName(key);
    const raw = (await Promise.all(CONTEXT_VERSIONS.map((version) => readShard(version, shardName, key)))).flat();
    const exactIds = new Set(findVerifiedSupplements(key).map((entry) => entry.korean.id));
    const expected = raw.filter((entry) => !exactIds.has(entry.id));
    const actual = await loadContextExpressions(key, { fetchImpl: fixtureFetch });

    assert.ok(raw.some((entry) => entry.id === item.korean.id));
    assert.deepEqual(actual, expected);
    assert.equal(actual.some((entry) => entry.id === item.korean.id), false);
    assert.equal(raw.length - actual.length, 1);
    visible += actual.length;
    suppressed += raw.length - actual.length;
    if (!actual.length) empty += 1;
  }

  assert.equal(visible, 524);
  assert.equal(suppressed, 80);
  assert.equal(empty, 13);
});

test("source-native loader retains every card and removes only each exact English token", async () => {
  let cards = 0;
  let removedTokens = 0;

  for (const item of ADDITIONS) {
    const key = item.korean.headword.normalize("NFC").trim().replace(/\s+/gu, " ");
    const shardName = await koreanSourceShardName(key);
    const raw = (await Promise.all(KOREAN_VERSIONS.map((version) => readShard(version, shardName, key)))).flat();
    const expected = suppressExactEnglishTokens(key, raw);
    const actual = await loadKoreanSourceRelations(key, { fetchImpl: fixtureFetch });
    const before = raw.find((entry) => entry.id === item.korean.id);
    const after = actual.find((entry) => entry.id === item.korean.id);

    assert.deepEqual(actual, expected);
    assert.ok(before);
    assert.ok(after);
    const { englishExpression: beforeExpression, ...beforeRest } = before;
    const { englishExpression: afterExpression, ...afterRest } = after;
    assert.deepEqual(afterRest, beforeRest);
    const beforeTokens = String(beforeExpression || "").split(";").map((token) => token.trim()).filter(Boolean);
    const afterTokens = String(afterExpression || "").split(";").map((token) => token.trim()).filter(Boolean);
    assert.ok(beforeTokens.some((token) => normalizeEnglish(token) === normalizeEnglish(item.english.headword)));
    assert.equal(afterTokens.some((token) => normalizeEnglish(token) === normalizeEnglish(item.english.headword)), false);
    assert.equal(beforeTokens.length - afterTokens.length, 1);
    cards += actual.length;
    removedTokens += beforeTokens.length - afterTokens.length;
  }

  assert.equal(cards, 223);
  assert.equal(removedTokens, 80);
});

test("named blocked entries remain outside the release catalog", () => {
  for (const term of ["foreigner", "외인", "waltz", "ribbon"]) {
    assert.deepEqual(findVerifiedSupplements(term), []);
  }
});
