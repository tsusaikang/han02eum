import {
  cacheKeyFor,
  requestWiktionaryEntry,
  validateLookupWord
} from "./dictionary-api.js";

const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "media-src 'self' https://upload.wikimedia.org",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'"
  ].join("; "),
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

/**
 * @param {unknown} body
 * @param {number} [status]
 * @param {HeadersInit} [extraHeaders]
 */
function jsonResponse(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...extraHeaders
    }
  });
}

/**
 * @param {Response} response
 * @param {string} status
 */
function withCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set("X-Dictionary-Cache", status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * @param {string} code
 * @param {number} status
 */
function logError(code, status) {
  console.error(JSON.stringify({
    message: "dictionary lookup failed",
    code,
    status
  }));
}

/**
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 * @param {{ fetchImpl?: typeof fetch, cache?: Cache }} [dependencies]
 */
export async function handleRequest(request, env, ctx, dependencies = {}) {
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/")) {
    return env.ASSETS.fetch(request);
  }

  if (url.pathname !== "/api/lookup") {
    return jsonResponse({ error: "API 경로를 찾을 수 없습니다." }, 404);
  }

  if (request.method !== "GET") {
    return jsonResponse(
      { error: "지원하지 않는 요청입니다." },
      405,
      { Allow: "GET" }
    );
  }

  const validation = validateLookupWord(url.searchParams.get("word"));
  if ("error" in validation) return jsonResponse({ error: validation.error }, 400);

  if (!env.WIKIMEDIA_USER_AGENT?.trim()) {
    logError("missing_wikimedia_user_agent", 503);
    return jsonResponse({ error: "사전 서버의 운영 설정이 완료되지 않았습니다." }, 503);
  }

  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const cache = dependencies.cache || caches.default;
  const cacheUrl = new URL("/__dictionary_cache__/lookup", url.origin);
  cacheUrl.searchParams.set("word", cacheKeyFor(validation.word));
  const cacheRequest = new Request(cacheUrl, { method: "GET" });

  if (cache) {
    const cached = await cache.match(cacheRequest);
    if (cached) return withCacheStatus(cached, "HIT");
  }

  const result = await requestWiktionaryEntry(validation.word, {
    fetchImpl,
    userAgent: env.WIKIMEDIA_USER_AGENT
  });

  if (result.logCode) logError(result.logCode, result.status);

  const cacheable = result.status === 200 || result.status === 404;

  const response = jsonResponse(result.body, result.status, {
    "Cache-Control": cacheable
      ? "public, max-age=300, s-maxage=600"
      : "no-store",
    "X-Dictionary-Cache": "MISS"
  });

  if (cache && cacheable) {
    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
  }

  return response;
}

export function internalErrorResponse() {
  return jsonResponse({ error: "서버에서 요청을 처리하지 못했습니다." }, 500);
}
