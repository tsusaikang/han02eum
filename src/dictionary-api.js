const MAX_UPSTREAM_BYTES = 5 * 1024 * 1024;

/** @param {unknown} value */
export function normalizeLookupWord(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * @param {unknown} value
 * @returns {{ word: string, error?: never } | { word?: never, error: string }}
 */
export function validateLookupWord(value) {
  const word = normalizeLookupWord(value);
  if (!word) return { error: "검색할 단어를 입력해 주세요." };
  if (word.length > 80) return { error: "검색어는 80자 이내로 입력해 주세요." };
  if (/[/\\<>\u0000-\u001f]/u.test(word)) {
    return { error: "검색어에 사용할 수 없는 문자가 포함되어 있습니다." };
  }
  return { word };
}

/** @param {string} word */
export function cacheKeyFor(word) {
  return /[A-Za-z]/u.test(word) && !/[가-힣]/u.test(word)
    ? word.toLocaleLowerCase("en")
    : word;
}

/** @param {string} title */
function createSourceUrl(title) {
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(title).replaceAll("%20", "_")}`;
}

/**
 * @param {Response} response
 * @param {number} [limit]
 */
async function readJsonWithLimit(response, limit = MAX_UPSTREAM_BYTES) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new Error("upstream_response_too_large");
  }

  if (!response.body) throw new Error("upstream_response_empty");

  const reader = response.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalLength += value.byteLength;
    if (totalLength > limit) {
      await reader.cancel("response_too_large");
      throw new Error("upstream_response_too_large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * @param {string} word
 * @param {{ fetchImpl?: typeof fetch, userAgent: string }} options
 */
export async function requestWiktionaryEntry(
  word,
  {
    fetchImpl = globalThis.fetch,
    userAgent
  }
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
      body: { error: "사전 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      logCode: "wiktionary_network_error"
    };
  }

  let payload;
  try {
    payload = await readJsonWithLimit(upstream);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "upstream_response_too_large";
    return {
      status: 502,
      body: { error: tooLarge ? "사전 항목이 너무 커서 표시할 수 없습니다." : "사전 서버의 응답을 읽을 수 없습니다." },
      logCode: tooLarge ? "wiktionary_response_too_large" : "wiktionary_invalid_response"
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
      },
      logCode: retryable ? "wiktionary_retryable_error" : "wiktionary_upstream_error"
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
