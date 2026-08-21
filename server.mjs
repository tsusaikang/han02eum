import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("./public/", import.meta.url));
const DEFAULT_PORT = 4173;
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 10 * 60 * 1000;

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

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
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

export function normalizeLookupWord(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

function validateLookupWord(value) {
  const word = normalizeLookupWord(value);
  if (!word) return { error: "검색할 단어를 입력해 주세요." };
  if (word.length > 80) return { error: "검색어는 80자 이내로 입력해 주세요." };
  if (/[/\\<>\u0000-\u001f]/u.test(word)) {
    return { error: "검색어에 사용할 수 없는 문자가 포함되어 있습니다." };
  }
  return { word };
}

function createSourceUrl(title) {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(title).replaceAll("%20", "_")}`;
}

export async function requestWiktionaryEntry(
  word,
  {
    fetchImpl = globalThis.fetch,
    userAgent = process.env.WIKIMEDIA_USER_AGENT ||
      "MalgyeolDictionary/0.1 (local educational development)"
  } = {}
) {
  const params = new URLSearchParams({
    action: "parse",
    page: word,
    prop: "text|revid|displaytitle",
    format: "json",
    formatversion: "2",
    disableeditsection: "1",
    redirects: "1",
    maxlag: "5"
  });

  let upstream;
  try {
    upstream = await fetchImpl(`https://en.wiktionary.org/w/api.php?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent
      },
      signal: AbortSignal.timeout(8_000)
    });
  } catch {
    return {
      status: 503,
      body: {
        error: "사전 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
      }
    };
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    return {
      status: 502,
      body: { error: "사전 서버의 응답을 읽을 수 없습니다." }
    };
  }

  if (payload?.error?.code === "missingtitle") {
    return {
      status: 404,
      body: { error: `‘${word}’에 해당하는 사전 항목을 찾지 못했습니다.` }
    };
  }

  if (!upstream.ok || payload?.error || !payload?.parse?.text) {
    const retryable = upstream.status === 429 || upstream.status >= 500 || payload?.error?.code === "maxlag";
    return {
      status: retryable ? 503 : 502,
      body: {
        error: retryable
          ? "사전 서버가 잠시 바쁩니다. 잠시 후 다시 시도해 주세요."
          : "사전 항목을 불러오지 못했습니다."
      }
    };
  }

  const title = payload.parse.title || word;
  return {
    status: 200,
    body: {
      requestedWord: word,
      title,
      displayTitle: payload.parse.displaytitle || title,
      revisionId: payload.parse.revid || null,
      html: payload.parse.text,
      sourceUrl: createSourceUrl(title),
      license: {
        name: "CC BY-SA 4.0",
        url: "https://creativecommons.org/licenses/by-sa/4.0/"
      }
    }
  };
}

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  response.end(JSON.stringify(body));
}

function cacheKeyFor(word) {
  return /[A-Za-z]/u.test(word) && !/[가-힣]/u.test(word) ? word.toLocaleLowerCase("en") : word;
}

function safeStaticPath(pathname) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const resolved = normalize(join(ROOT, requested));
  return relative(ROOT, resolved).startsWith("..") ? null : resolved;
}

export function createDictionaryServer({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const cache = new Map();

  return createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/api/lookup") {
      const validation = validateLookupWord(url.searchParams.get("word"));
      if (validation.error) {
        sendJson(response, 400, { error: validation.error });
        return;
      }

      const key = cacheKeyFor(validation.word);
      const cached = cache.get(key);
      if (cached && now() - cached.storedAt < CACHE_TTL_MS) {
        sendJson(response, cached.status, cached.body, {
          "Cache-Control": "private, max-age=300",
          "X-Dictionary-Cache": "HIT"
        });
        return;
      }
      cache.delete(key);

      const result = await requestWiktionaryEntry(validation.word, { fetchImpl });
      if (result.status === 200 || result.status === 404) {
        cache.set(key, { ...result, storedAt: now() });
        if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
      }
      sendJson(response, result.status, result.body, {
        "Cache-Control": "private, max-age=300",
        "X-Dictionary-Cache": "MISS"
      });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "지원하지 않는 요청입니다." }, { Allow: "GET, HEAD" });
      return;
    }

    let filePath;
    try {
      filePath = safeStaticPath(url.pathname);
    } catch {
      filePath = null;
    }
    if (!filePath) {
      sendJson(response, 404, { error: "페이지를 찾을 수 없습니다." });
      return;
    }

    try {
      const fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) throw new Error("not_a_file");
      const content = await readFile(filePath);
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": CONTENT_TYPES.get(extname(filePath)) || "application/octet-stream",
        "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600"
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch {
      sendJson(response, 404, { error: "페이지를 찾을 수 없습니다." });
    }
  });
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  if (process.env.NODE_ENV === "production" && !process.env.WIKIMEDIA_USER_AGENT) {
    console.error("Production requires WIKIMEDIA_USER_AGENT with a public contact URL or email.");
    process.exitCode = 1;
  } else {
    const port = Number(process.env.PORT || DEFAULT_PORT);
    createDictionaryServer().listen(port, "127.0.0.1", () => {
      console.log(`말결 사전: http://127.0.0.1:${port}`);
    });
  }
}
