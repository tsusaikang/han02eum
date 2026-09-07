import test from "node:test";
import assert from "node:assert/strict";

import { handleRequest } from "../src/handler.js";

const TEST_USER_AGENT = "HanyeongIeumTest/1.0 (https://example.test/contact)";

function createContext() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(promise);
    }
  };
}

test("handleRequest fails closed when the Wikimedia User-Agent is missing", async () => {
  const response = await handleRequest(
    new Request("https://dictionary.example/api/lookup?word=hello"),
    { ASSETS: { fetch: globalThis.fetch }, WIKIMEDIA_USER_AGENT: "" },
    createContext()
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), null);
  assert.deepEqual(await response.json(), {
    error: "사전 서버의 운영 설정이 완료되지 않았습니다."
  });
});

test("handleRequest caches successful lookups and marks a repeated lookup as HIT", async () => {
  const entries = new Map();
  const cache = {
    async match(request) {
      return entries.get(request.url)?.clone();
    },
    async put(request, response) {
      entries.set(request.url, response.clone());
    }
  };
  let upstreamCalls = 0;
  const fetchImpl = async () => {
    upstreamCalls += 1;
    return Response.json({
      parse: {
        title: "hello",
        displaytitle: "hello",
        revid: 123,
        text: "<h2 id=\"English\">English</h2>"
      }
    });
  };
  const env = {
    ASSETS: { fetch: globalThis.fetch },
    WIKIMEDIA_USER_AGENT: TEST_USER_AGENT
  };

  const firstContext = createContext();
  const first = await handleRequest(
    new Request("https://dictionary.example/api/lookup?word=Hello"),
    env,
    firstContext,
    { cache, fetchImpl }
  );
  await Promise.all(firstContext.pending);

  assert.equal(first.status, 200);
  assert.equal(first.headers.get("X-Dictionary-Cache"), "MISS");
  assert.match(first.headers.get("Cache-Control"), /s-maxage=600/);

  const second = await handleRequest(
    new Request("https://dictionary.example/api/lookup?word=Hello"),
    env,
    createContext(),
    { cache, fetchImpl }
  );

  assert.equal(second.status, 200);
  assert.equal(second.headers.get("X-Dictionary-Cache"), "HIT");
  assert.equal(upstreamCalls, 1);
});

test("handleRequest does not cache retryable upstream failures", async () => {
  let cacheWrites = 0;
  const response = await handleRequest(
    new Request("https://dictionary.example/api/lookup?word=hello"),
    {
      ASSETS: { fetch: globalThis.fetch },
      WIKIMEDIA_USER_AGENT: TEST_USER_AGENT
    },
    createContext(),
    {
      cache: {
        async match() {
          return undefined;
        },
        async put() {
          cacheWrites += 1;
        }
      },
      async fetchImpl() {
        throw new Error("offline");
      }
    }
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(cacheWrites, 0);
});


test("case-sensitive titles do not share cache entries or reuse legacy lowercase cache", async () => {
  const entries = new Map();
  const cache = { async match(r) { return entries.get(r.url)?.clone(); }, async put(r, s) { entries.set(r.url, s.clone()); } };
  entries.set("https://dictionary.example/__dictionary_cache__/lookup?word=us", Response.json({title:"wrong cached title"}));
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    const title = new URL(url).searchParams.get("page");
    return Response.json({parse:{title, displaytitle:title, revid:1, text:'<h2 id="English">English</h2>'}});
  };
  const env = { ASSETS: {fetch: globalThis.fetch}, WIKIMEDIA_USER_AGENT: TEST_USER_AGENT };
  for (const word of ["US", "us", "US", "us"]) {
    const ctx = createContext();
    const response = await handleRequest(new Request(`https://dictionary.example/api/lookup?word=${word}`), env, ctx, {cache,fetchImpl});
    assert.equal((await response.json()).title, word);
    await Promise.all(ctx.pending);
  }
  assert.equal(calls, 2);
});
