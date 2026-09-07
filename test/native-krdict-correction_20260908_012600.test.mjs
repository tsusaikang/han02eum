import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { lookupKoreanEntry, lookupKoreanByEnglish, loadKoreanEntryDetails } from "../public/native-korean-en_20260907_205345.js";
const calls = [];
const fetchImpl = async (url) => {
  calls.push(url);
  const data = JSON.parse(await readFile(new URL(`../public${url}`, import.meta.url), "utf8"));
  return { ok: true, json: async () => data };
};
test("entity decoding precedes expression separation across the rebuilt index", async () => {
  const proper = await lookupKoreanByEnglish("ma'am", { fetchImpl });
  assert.ok(proper.some((record) => record.headword === "어머니" && record.senseId === "4"));
  for (const [key, headwords] of [["am", ["어머니"]], ["house", ["작은집", "작은댁"]], ["quot", ["나무아미타불"]], ["appeal", ["공소"]]]) {
    const records = await lookupKoreanByEnglish(key, { fetchImpl });
    assert.ok(records.every((record) => !headwords.includes(record.headword)), key);
  }
  const whole = await lookupKoreanByEnglish("mistress' house", { fetchImpl });
  assert.ok(whole.some((record) => record.headword === "작은댁"));
});
test("Korean details preserve examples, usage conditions, source POS, and pronunciation lazily", async () => {
  calls.length = 0;
  const records = await lookupKoreanEntry("나무", { fetchImpl });
  assert.ok(records.some((record) => record.pronunciations.length));
  const record = records.find((record) => record.examplesCount > 0);
  assert.ok(record);
  assert.equal(calls.length, 1);
  assert.ok(!calls[0].includes("details-"));
  const detail = await loadKoreanEntryDetails(record, { fetchImpl });
  assert.equal(detail.examples.flatMap((example) => example.texts).length, record.examplesCount);
  assert.ok(detail.sourceEntry.Lemma);
  assert.ok(detail.sourceSense.SenseExample);
  assert.ok(calls.at(-1).includes("details-"));
  const references = await lookupKoreanEntry("간막이", { fetchImpl });
  assert.ok(references.every((reference) => reference.partOfSpeechKo));
  const ga = await lookupKoreanEntry("가", { fetchImpl });
  assert.ok(ga.some((sense) => sense.annotations.some((annotation) => annotation.includes("명사 뒤"))));
});
test("detail fetch errors and cancellation do not silently turn into empty successful content", async () => {
  const [record] = await lookupKoreanEntry("나무", { fetchImpl });
  await assert.rejects(loadKoreanEntryDetails(record, { fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadKoreanEntryDetails(record, { signal: controller.signal, fetchImpl }), { name: "AbortError" });
  await assert.rejects(loadKoreanEntryDetails({ detailsRef: { entry: "bad", senseId: "1", shard: 0 } }, { fetchImpl }), /올바르지/);
});

test("source phrases containing commas or slashes are never broken into partial phrases", async () => {
  const whole = await lookupKoreanByEnglish("army, navy, and air force", { fetchImpl });
  assert.ok(whole.some((record) => record.headword === "육해공군"));
  for (const query of ["army", "navy", "and air force"]) {
    const fragments = await lookupKoreanByEnglish(query, { fetchImpl });
    assert.ok(fragments.every((record) => record.headword !== "육해공군"));
  }
  const voice = await lookupKoreanByEnglish("voice actor/actress", { fetchImpl });
  assert.ok(voice.some((record) => record.headword === "성우"));
  assert.ok((await lookupKoreanByEnglish("actress", { fetchImpl })).every((record) => record.headword !== "성우"));
});

test("punctuation in one alternative does not erase another and single-word display marks keep search access", async () => {
  for (const [query, headword] of [["morning", "오전"], ["doctor", "선생"], ["mr", "미스터"], ["Mr.", "미스터"], ["cheers", "건배"], ["leader", "지휘자"], ["yardstick", "척도"]]) {
    const records = await lookupKoreanByEnglish(query, { fetchImpl });
    assert.ok(records.some((record) => record.headword === headword), `${query}: ${headword}`);
  }
});
