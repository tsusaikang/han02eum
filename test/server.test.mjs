import test from "node:test";
import assert from "node:assert/strict";

import { normalizeLookupWord, requestWiktionaryEntry } from "../src/dictionary-api.js";

const TEST_USER_AGENT = "HanyeongIeumTest/1.0 (https://example.test/contact)";

test("normalizeLookupWord normalizes Unicode and whitespace", () => {
  assert.equal(normalizeLookupWord("  hello   world  "), "hello world");
  assert.equal(normalizeLookupWord("안녕"), "안녕");
  assert.equal(normalizeLookupWord(null), "");
});

test("requestWiktionaryEntry maps a successful response to the public contract", async () => {
  let requestedUrl;
  let requestedOptions;
  const fetchImpl = async (url, options) => {
    requestedUrl = new URL(url);
    requestedOptions = options;
    return new Response(JSON.stringify({
      parse: {
        title: "hello",
        displaytitle: "hello",
        revid: 12345,
        text: "<h2 id=\"English\">English</h2>"
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await requestWiktionaryEntry("hello", {
    fetchImpl,
    userAgent: TEST_USER_AGENT
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.title, "hello");
  assert.equal(result.body.revisionId, 12345);
  assert.equal(result.body.sourceUrl, "https://en.wiktionary.org/wiki/hello");
  assert.equal(result.body.license.name, "CC BY-SA 4.0");
  assert.equal(requestedUrl.hostname, "en.wiktionary.org");
  assert.equal(requestedUrl.searchParams.get("action"), "parse");
  assert.equal(requestedUrl.searchParams.get("page"), "hello");
  assert.equal(requestedOptions.headers["User-Agent"], TEST_USER_AGENT);
});

test("requestWiktionaryEntry returns a clear not-found result", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    error: { code: "missingtitle", info: "The page does not exist" }
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  const result = await requestWiktionaryEntry("not-a-word", {
    fetchImpl,
    userAgent: TEST_USER_AGENT
  });
  assert.equal(result.status, 404);
  assert.match(result.body.error, /not-a-word/);
});

test("requestWiktionaryEntry turns upstream throttling into a retryable response", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    error: { code: "maxlag", info: "Waiting for replication" }
  }), { status: 503, headers: { "Content-Type": "application/json" } });

  const result = await requestWiktionaryEntry("hello", {
    fetchImpl,
    userAgent: TEST_USER_AGENT
  });
  assert.equal(result.status, 503);
  assert.match(result.body.error, /잠시/);
});

test("requestWiktionaryEntry handles network failures without leaking internals to the main error", async () => {
  const fetchImpl = async () => {
    throw new Error("offline");
  };

  const result = await requestWiktionaryEntry("hello", {
    fetchImpl,
    userAgent: TEST_USER_AGENT
  });
  assert.equal(result.status, 503);
  assert.match(result.body.error, /연결/);
  assert.equal("detail" in result.body, false);
});

test("requestWiktionaryEntry rejects an oversized upstream response", async () => {
  const fetchImpl = async () => new Response("{}", {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(6 * 1024 * 1024)
    }
  });

  const result = await requestWiktionaryEntry("hello", {
    fetchImpl,
    userAgent: TEST_USER_AGENT
  });
  assert.equal(result.status, 502);
  assert.match(result.body.error, /너무 커서/);
});
