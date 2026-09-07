import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lookupKoreanEntry, lookupKoreanByEnglish } from "../public/native-korean-en_20260907_205345.js";

function localFetch(observed = []) {
  return async (url) => {
    const payload = JSON.parse(await readFile(new URL(`../public${url}`, import.meta.url), "utf8"));
    observed.push(payload);
    return { ok: true, json: async () => payload };
  };
}

test("Korean source meanings retain original English expressions and all source fields", async () => {
  const observed = [];
  const records = await lookupKoreanEntry(" 숫자 ", { fetchImpl: localFetch(observed) });
  const original = observed.flatMap((payload) => payload.words["숫자"] || []);
  assert.equal(records.length, original.length);
  for (const [index, record] of records.entries()) {
    for (const [key, value] of Object.entries(original[index])) assert.deepEqual(record[key], value);
    assert.equal(record.source.name, "한국어기초사전");
    assert.equal(record.matchKind, "korean-headword");
    assert.equal(record.license.name, "CC BY-SA 2.0 KR");
  }
  assert.ok(records.some((record) => record.englishExpression.includes("figure")));
});

test("recovered idioms and untranslated references retain their own structure", async () => {
  const idioms = await lookupKoreanEntry("가슴에 새기다", { fetchImpl: localFetch() });
  assert.ok(idioms.some((record) => record.entryTypeKo === "관용구" && record.partOfSpeech === null));
  const references = await lookupKoreanEntry("간막이", { fetchImpl: localFetch() });
  assert.ok(references.length);
  assert.ok(references.every((record) => record.sourceKind === "korean-reference"));
  assert.ok(references.every((record) => !Object.hasOwn(record, "englishExpression")));
  assert.ok(references.some((record) => record.definitionKo.includes("칸막이")));
});

test("English reverse results preserve source expressions without importing exact links", async () => {
  const records = await lookupKoreanByEnglish("FIGURE", { fetchImpl: localFetch() });
  assert.ok(records.some((record) => record.headword === "숫자"));
  assert.ok(records.every((record) => record.matchKind === "english-expression"));
  assert.deepEqual(await lookupKoreanByEnglish("royal", { fetchImpl: localFetch() }), []);
  let calls = 0;
  assert.deepEqual(await lookupKoreanByEnglish("being of royal blood", {
    fetchImpl: async () => { calls += 1; }
  }), []);
  assert.equal(calls, 0);
});

test("partial source failure warns, complete failure rejects, and cancellation stays observable", async () => {
  const warnings = [];
  const fetchImpl = localFetch();
  const records = await lookupKoreanEntry("숫자", {
    fetchImpl: (url) => url.includes("recovered") ? Promise.reject(new Error("offline")) : fetchImpl(url),
    onWarning: (warning) => warnings.push(warning)
  });
  assert.ok(records.length);
  assert.equal(warnings.length, 1);
  await assert.rejects(lookupKoreanEntry("숫자", { fetchImpl: async () => { throw new Error("offline"); } }), /offline/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(lookupKoreanEntry("숫자", { signal: controller.signal, fetchImpl }), { name: "AbortError" });
});
