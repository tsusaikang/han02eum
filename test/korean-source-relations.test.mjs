import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DOMParser, parseHTML } from "linkedom";

import {
  koreanSourceShardName,
  loadKoreanSourceRelations,
  normalizeKoreanSourceKey,
  renderKoreanSourceRelations,
  suppressExactEnglishTokens
} from "../public/korean-source-relations.js";

const digest = async (value) => new Uint8Array(
  await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
);

function fixtureFetch(counter = { calls: 0 }) {
  return async (url, { signal } = {}) => {
    counter.calls += 1;
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const name = String(url).split("/").pop();
    const payload = JSON.parse(readFileSync(new URL(`../public/korean-source-relations-v1-full/${name}`, import.meta.url), "utf8"));
    return { ok: true, async json() { return payload; } };
  };
}

function loadAllRecords() {
  const output = new URL("../public/korean-source-relations-v1-full/", import.meta.url);
  const records = new Map();
  for (const name of readdirSync(output).filter((value) => /^shard-\d{2}\.json$/u.test(value))) {
    const payload = JSON.parse(readFileSync(new URL(name, output), "utf8"));
    for (const [key, values] of Object.entries(payload.words)) records.set(key, values);
  }
  return records;
}

test("client normalization and hashing match source vectors", async () => {
  assert.equal(normalizeKoreanSourceKey("  왕족\t"), "왕족");
  assert.equal(await koreanSourceShardName("왕족", digest), "shard-53.json");
  assert.equal(await koreanSourceShardName("틀어넣다", digest), "shard-40.json");
});

test("a Korean lookup loads one shard per isolated source lane and an English lookup loads none", async () => {
  const counter = { calls: 0 };
  const records = await loadKoreanSourceRelations("왕족", { fetchImpl: fixtureFetch(counter), digest });
  assert.equal(counter.calls, 2);
  assert.equal(records.length, 1);
  assert.equal(records[0].englishExpression, "being of royal blood");
  assert.deepEqual(await loadKoreanSourceRelations("royal", { fetchImpl: fixtureFetch(counter), digest }), []);
  assert.equal(counter.calls, 2);
});

test("shard failure is isolated and abort remains observable", async () => {
  assert.deepEqual(await loadKoreanSourceRelations("왕족", {
    digest,
    fetchImpl: async () => { throw new Error("missing"); }
  }), []);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    loadKoreanSourceRelations("왕족", { signal: controller.signal, fetchImpl: fixtureFetch(), digest }),
    (error) => error.name === "AbortError"
  );
});

test("render-time exact suppression retains the historical six and applies the 142 selected additions", () => {
  const all = loadAllRecords();
  const removed = [];
  let beforeCount = 0;
  let afterCount = 0;
  for (const [key, records] of all) {
    const output = suppressExactEnglishTokens(key, records);
    records.forEach((record, index) => {
      const before = record.englishExpression === null ? [] : record.englishExpression.split(";").map((item) => item.trim()).filter(Boolean);
      const after = output[index].englishExpression === null ? [] : output[index].englishExpression.split(";").map((item) => item.trim()).filter(Boolean);
      beforeCount += before.length;
      afterCount += after.length;
      for (const token of before) if (!after.includes(token)) removed.push([key, record.id, token]);
      assert.ok(after.every((token) => before.includes(token)));
      assert.equal(output[index].englishDescription, record.englishDescription);
    });
  }
  assert.equal(beforeCount - afterCount, 148);
  assert.equal(removed.length, 148);
  const historical = [
    ["가지", "krdict:59919:2", "branch"],
    ["광명하다", "krdict:30718:1", "bright"],
    ["면하다", "krdict:55080:1", "face"],
    ["세포", "krdict:74889:1", "cell"],
    ["숫자", "krdict:65425:2", "figure"],
    ["흔들다", "krdict:29776:1", "wave"]
  ];
  for (const expected of historical) assert.ok(removed.some((row) => row.join("|") === expected.join("|")));
  assert.ok(removed.some((row) => row.join("|") === "어저께|krdict:14587:1|yesterday"));
  assert.equal(suppressExactEnglishTokens("면하다", all.get("면하다")).find((item) => item.id === "krdict:55080:1").englishExpression, "front");
  assert.equal(suppressExactEnglishTokens("흔들다", all.get("흔들다"))[0].englishExpression, "sway; flap; wag; shake");
  assert.equal(suppressExactEnglishTokens("숫자", all.get("숫자")).find((item) => item.id === "krdict:65425:2").englishDescription.length > 0, true);
});

test("royal and jam source expressions remain source-native", async () => {
  const royal = await loadKoreanSourceRelations("왕족", { fetchImpl: fixtureFetch(), digest });
  const jam = await loadKoreanSourceRelations("틀어넣다", { fetchImpl: fixtureFetch(), digest });
  assert.equal(royal[0].englishExpression, "being of royal blood");
  assert.equal(jam[0].englishExpression, "squeeze; cram; stuff");
});

test("renderer is open, source-collapsed, entity-safe, and expands after eight", async () => {
  const records = await loadKoreanSourceRelations("치다", { fetchImpl: fixtureFetch(), digest });
  assert.equal(records.length, 49);
  const document = new DOMParser().parseFromString("<html><body><section id='target' class='is-hidden'></section></body></html>", "text/html");
  const target = document.querySelector("#target");
  assert.equal(renderKoreanSourceRelations(target, records), 49);
  assert.equal(target.querySelector(".korean-source-disclosure").open, true);
  assert.match(target.textContent, /한국어기초사전 영어 뜻 · 49개/u);
  assert.match(target.textContent, /한국어기초사전에 실린 뜻별 영어 대응 표현과 영어 풀이입니다/u);
  assert.equal(target.querySelectorAll("article").length, 8);
  assert.equal(target.querySelector(".korean-source-details").hasAttribute("open"), false);
  assert.match(target.querySelector(".korean-source-more").textContent, /나머지 41개 더 보기/u);
  target.querySelector(".korean-source-more").click();
  assert.equal(target.querySelectorAll("article").length, 49);
  assert.equal(target.querySelector(".korean-source-more"), null);
  assert.equal(target.querySelectorAll("blockquote").length, 0);
  assert.doesNotMatch(target.textContent, /자동 선별|신뢰도|사람 검수 전|candidate|confidence|provenance|review|score/iu);
  const link = target.querySelector(".korean-source-copy a");
  assert.match(link.href, /^https:\/\/krdict\.korean\.go\.kr\/eng\/dicSearch\/SearchView\?ParaWordNo=\d+&nation=eng&nationCode=6$/u);
});

test("no-equivalent and decoded-entity records use neutral visible text", async () => {
  const noEquivalent = await loadKoreanSourceRelations("감소세", { fetchImpl: fixtureFetch(), digest });
  const entity = await loadKoreanSourceRelations("가-", { fetchImpl: fixtureFetch(), digest });
  const document = new DOMParser().parseFromString("<html><body><section id='target'></section></body></html>", "text/html");
  const target = document.querySelector("#target");
  renderKoreanSourceRelations(target, noEquivalent);
  assert.match(target.textContent, /직접 대응하는 영어 표현 없음/u);
  renderKoreanSourceRelations(target, entity);
  assert.match(target.textContent, /"being fake"/u);
  assert.doesNotMatch(target.textContent, /&quot;/u);
});

test("description sentinels are null and hidden while their sense cards remain", async () => {
  for (const word of ["강강수월래", "컨셉"]) {
    const records = await loadKoreanSourceRelations(word, { fetchImpl: fixtureFetch(), digest });
    assert.ok(records.length > 0);
    const sentinelRecord = records.find((record) => record.englishExpression === null && record.englishDescription === null);
    assert.ok(sentinelRecord);
    const document = new DOMParser().parseFromString("<html><body><section id='target'></section></body></html>", "text/html");
    const target = document.querySelector("#target");
    renderKoreanSourceRelations(target, [sentinelRecord]);
    assert.equal(target.querySelectorAll("article").length, 1);
    assert.match(target.textContent, /직접 대응하는 영어 표현 없음/u);
    assert.doesNotMatch(target.textContent, /no equivalent expression/iu);
    assert.equal([...target.querySelectorAll(".korean-source-label")].some((node) => node.textContent === "영어 풀이"), false);
  }
});

test("a fully suppressed exact token keeps its card and English description", async () => {
  const records = await loadKoreanSourceRelations("숫자", { fetchImpl: fixtureFetch(), digest });
  const exact = records.find((record) => record.id === "krdict:65425:2");
  assert.equal(exact.englishExpression, "");
  const document = new DOMParser().parseFromString("<html><body><section id='target'></section></body></html>", "text/html");
  const target = document.querySelector("#target");
  renderKoreanSourceRelations(target, [exact]);
  assert.equal(target.querySelectorAll("article").length, 1);
  assert.match(target.textContent, /정확히 일치하는 영어 표현은 위에 표시했습니다/u);
  assert.match(target.textContent, /The quantity of something expressed in numbers/u);
});

test("markup and styles keep the new section separate and controls 44px", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const exact = html.indexOf('<section id="translation-section"');
  const koreanSource = html.indexOf('<section id="korean-source-relation-section"');
  const englishContext = html.indexOf('<section id="context-expression-section"');
  assert.ok(exact >= 0 && koreanSource > exact && englishContext > koreanSource);
  const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");
  for (const selector of [".korean-source-section-summary", ".korean-source-summary", ".korean-source-more"]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(css, new RegExp(`${escaped}[^}]*min-height:\\s*44px`, "s"));
  }
  assert.match(css, /\.korean-source-field\s*\{[^}]*grid-template-columns:\s*1fr/su);
});

test("a Korean 404 renders source-only and hides empty Wiktionary regions", async () => {
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    history: globalThis.history,
    fetch: globalThis.fetch,
    DOMParser: globalThis.DOMParser,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };
  const { document, window } = parseHTML(readFileSync(new URL("../public/index.html", import.meta.url), "utf8"));
  window.location = { href: "https://example.test/" };
  window.speechSynthesis = { cancel() {} };
  globalThis.document = document;
  globalThis.window = window;
  globalThis.history = { pushState() {} };
  globalThis.DOMParser = DOMParser;
  globalThis.requestAnimationFrame = () => 0;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.includes("/api/lookup?word=%EA%B0%90%EC%86%8C%EC%84%B8")) {
      return { ok: false, status: 404, async json() { return { error: "not found" }; } };
    }
    if (value.includes("/korean-source-relations-v1-full/")) return fixtureFetch()(url);
    throw new Error(`unexpected fetch: ${value}`);
  };
  try {
    const { lookup } = await import(`../public/app.js?korean-source-only=${Date.now()}`);
    await lookup("감소세", { updateHistory: false });
    assert.equal(document.querySelector("#result-word").textContent, "감소세");
    assert.equal(document.querySelector("#translation-section").classList.contains("is-hidden"), true);
    assert.equal(document.querySelector("#definitions-section").classList.contains("is-hidden"), true);
    assert.equal(document.querySelector("#source-note").classList.contains("is-hidden"), true);
    assert.equal(document.querySelector("#korean-source-relation-section").classList.contains("is-hidden"), false);
    assert.match(document.querySelector("#korean-source-relation-section").textContent, /직접 대응하는 영어 표현 없음/u);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("a rapid Korean search cannot render aborted stale source data", async () => {
  const first = new AbortController();
  const promise = loadKoreanSourceRelations("치다", {
    signal: first.signal,
    digest,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  });
  first.abort();
  await assert.rejects(promise, (error) => error.name === "AbortError");
});

test("two rapid Korean lookups collect aborted work and never render the stale entry", async () => {
  const previous = {
    document: globalThis.document,
    window: globalThis.window,
    history: globalThis.history,
    fetch: globalThis.fetch,
    DOMParser: globalThis.DOMParser,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };
  const { document, window } = parseHTML(readFileSync(new URL("../public/index.html", import.meta.url), "utf8"));
  window.location = { href: "https://example.test/" };
  window.speechSynthesis = { cancel() {} };
  let resolveFirstApi;
  let firstJsonCalls = 0;
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  globalThis.document = document;
  globalThis.window = window;
  globalThis.history = { pushState() {} };
  globalThis.DOMParser = DOMParser;
  globalThis.requestAnimationFrame = () => 0;
  globalThis.fetch = (url, { signal } = {}) => {
    const value = String(url);
    if (value.includes("/api/lookup?word=%EC%B9%98%EB%8B%A4")) {
      return new Promise((resolve) => { resolveFirstApi = resolve; });
    }
    if (value.endsWith("/korean-source-relations-v1-full/shard-46.json")) {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    }
    if (value.includes("/api/lookup?word=%EC%99%95%EC%A1%B1")) {
      return Promise.resolve({ ok: false, status: 404, async json() { return { error: "not found" }; } });
    }
    if (value.endsWith("/korean-source-relations-v1-full/shard-53.json")) {
      return fixtureFetch()(url, { signal });
    }
    throw new Error(`unexpected fetch: ${value}`);
  };
  process.on("unhandledRejection", onUnhandled);
  try {
    const { lookup } = await import(`../public/app.js?korean-rapid=${Date.now()}`);
    const first = lookup("치다", { updateHistory: false });
    await Promise.resolve();
    await lookup("왕족", { updateHistory: false });
    resolveFirstApi({
      ok: true,
      status: 200,
      async json() {
        firstJsonCalls += 1;
        return {
          requestedWord: "치다",
          title: "치다",
          revisionId: 1,
          sourceUrl: "https://en.wiktionary.org/wiki/치다",
          license: { name: "CC BY-SA 4.0" },
          html: '<h2 id="Korean">Korean</h2><h3>Verb</h3><ol><li>hit</li></ol>'
        };
      }
    });
    await first;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(unhandled.length, 0);
    assert.equal(firstJsonCalls, 0);
    assert.equal(document.querySelector("#result-word").textContent, "왕족");
    assert.doesNotMatch(document.querySelector("#result").textContent, /한국어기초사전 영어 뜻 · 49개/u);
  } finally {
    process.off("unhandledRejection", onUnhandled);
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
