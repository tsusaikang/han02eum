const PAGE_SIZE = 8;
const POS_LABELS = Object.freeze({noun:"명사",verb:"동사",adj:"형용사",adjective:"형용사",adv:"부사",adverb:"부사",pron:"대명사",pronoun:"대명사",prep:"전치사",preposition:"전치사",conj:"접속사",conjunction:"접속사",interj:"감탄사",interjection:"감탄사",num:"수사",numeral:"수사",article:"관사",det:"한정사",determiner:"한정사",phrase:"구",suffix:"접미사",prefix:"접두사"});

// Korean Wiktionary's extractor/ko/tags.py separates translated usage tags and
// topics from raw labels. Bring those source labels together for display.
const SOURCE_TAG_LABELS = Object.freeze({
  name:"인명",archaic:"고어",obsolete:"사어",dated:"옛말",metaphoric:"비유",figuratively:"비유",
  "baby-talk":"유아어",intransitive:"자동사",transitive:"타동사",literally:"직역",rare:"드물게",
  naturally:"원래의 의미",literary:"문학적",humorous:"해학적",euphemistic:"완곡적",
  countable:"가산",uncountable:"불가산",slang:"속어",informal:"비격식체",formal:"격식체",
  colloquial:"구어",dialectal:"방언",vulgar:"비속어",offensive:"모욕적",derogatory:"비하",pejorative:"비하",
  taboo:"금기어",slur:"멸칭",honorific:"높임말",polite:"공손한 표현",impolite:"무례한 표현",
  abbreviation:"약자",acronym:"머리글자 약어",initialism:"머리글자 약어",idiomatic:"관용적 표현",
  auxiliary:"보조 용법",reflexive:"재귀 용법",phrasal:"구동사",morpheme:"형태소",gerund:"동명사",
  onomatopoeic:"의성어",plural:"복수형",singular:"단수형",past:"과거형",present:"현재형",
  future:"미래형",participle:"분사",comparative:"비교급",superlative:"최상급",causative:"사동",
  passive:"수동",active:"능동",masculine:"남성",feminine:"여성",neuter:"중성",infinitive:"부정형",
  "form-of":"다른 형태",UK:"영국",US:"미국",Canada:"캐나다",Australia:"오스트레일리아",
  Mexico:"멕시코",Austria:"오스트리아",Spain:"스페인",Portugal:"포르투갈",Brazil:"브라질",
  Germany:"독일",Belgium:"벨기에",Egypt:"이집트",Syria:"시리아",Iran:"이란",Morocco:"모로코",
  modern:"현대",standard:"표준",South:"남부",North:"북부",East:"동부",West:"서부"
});
const SOURCE_TOPIC_LABELS = Object.freeze({
  finance:"금융",advertising:"광고",military:"군사",fish:"어류",physics:"물리",law:"법률",
  botany:"식물",history:"역사",clothing:"의류",medicine:"의학",electricity:"전기",geography:"지리",
  programming:"프로그래밍",computer:"컴퓨터",anatomy:"해부학",politics:"정치",religion:"종교",
  Catholicism:"가톨릭",football:"축구",mathematics:"수학",linguistics:"언어학",biology:"생물",
  chemistry:"화학",geology:"지질학",psychology:"심리학",economics:"경제",astronomy:"천문학",
  zoology:"동물학",sports:"스포츠",music:"음악",computing:"컴퓨터",engineering:"공학"
});
const INTERNAL_SOURCE_TAG = /^(?:error(?:-|$)|no-gloss$|no-examples$|no-translations$|table-tags$|canonical$)/u;
function englishUsageLabels(entry, sense) {
  const labels = new Set();
  const posLabel = labelFor(entry.pos, entry.posTitle);
  for (const source of [entry, sense]) {
    for (const field of ["rawTags", "raw_tags", "tags", "topics"]) {
      for (const value of Array.isArray(source[field]) ? source[field] : []) {
        if (typeof value !== "string") continue;
        const tag = value.trim();
        if (!tag || INTERNAL_SOURCE_TAG.test(tag) || Object.hasOwn(POS_LABELS, tag)) continue;
        const label = SOURCE_TAG_LABELS[tag] || SOURCE_TOPIC_LABELS[tag] || tag;
        if (label !== posLabel) labels.add(label);
      }
    }
  }
  return [...labels];
}

function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function safeLink(document, text, url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const link = el(document, "a", "", text);
    link.href = parsed.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    return link;
  } catch { return null; }
}

function sourceDetails(document, source, license, note = "") {
  const details = el(document, "details", "source-details");
  details.append(el(document, "summary", "", "출처 보기"));
  const sourceLink = safeLink(document, `${source.name || "사전"} 원문 ↗`, source.url);
  if (sourceLink) details.append(sourceLink);
  else if (source.name) details.append(el(document, "p", "", source.name));
  const licenseLink = safeLink(document, license?.name || "이용조건", license?.url);
  if (licenseLink) details.append(licenseLink);
  else if (license?.name) details.append(el(document, "p", "", license.name));
  if (note) details.append(el(document, "p", "", note));
  return details;
}

function labelFor(pos, supplied) {
  if (!pos || pos === "unknown") return "";
  return supplied || POS_LABELS[pos] || pos;
}

function paginatedList(container, items, makeItem) {
  const document = container.ownerDocument;
  const list = el(document, "ol", "sense-list");
  container.append(list);
  let shown = 0;
  const more = el(document, "button", "more-button", "뜻 더 보기");
  more.type = "button";
  const appendPage = () => {
    const end = Math.min(items.length, shown + PAGE_SIZE);
    while (shown < end) {
      list.append(makeItem(items[shown], shown));
      shown += 1;
    }
    more.hidden = shown >= items.length;
  };
  appendPage();
  if (items.length > PAGE_SIZE) {
    more.addEventListener("click", () => {
      const oldShown = shown;
      appendPage();
      const firstNew = list.children[oldShown];
      if (firstNew) { firstNew.tabIndex = -1; firstNew.focus(); }
    });
    container.append(more);
  }
  return items.length;
}

function senseShell(document, index, posLabel) {
  const item = el(document, "li", "sense");
  const meta = el(document, "p", "sense-meta");
  meta.append(el(document, "span", "sense-number", String(index + 1).padStart(2, "0")));
  if (posLabel) meta.append(el(document, "span", "part-of-speech", posLabel));
  item.append(meta);
  return item;
}

export function renderEnglishEntries(container, entries) {
  const document = container.ownerDocument;
  const items = entries.flatMap(entry => (entry.senses || [])
    .filter(sense => (sense.glosses || []).some(gloss => typeof gloss === "string" && gloss.trim()))
    .map(sense => ({entry, sense})));
  if (!items.length) return 0;
  container.append(el(document, "h3", "meaning-heading", "한국어 뜻"));
  return paginatedList(container, items, ({entry, sense}, index) => {
    const item = senseShell(document, index, labelFor(entry.pos, entry.posTitle));
    if (entry.word) {
      const headword = el(document, "span", "sense-headword", entry.word);
      headword.lang = "en";
      item.querySelector(".sense-meta").append(headword);
    }
    for (const gloss of sense.glosses || []) {
      if (typeof gloss === "string" && gloss.trim()) item.append(el(document, "p", "sense-meaning", gloss));
    }
    const usage = englishUsageLabels(entry, sense);
    if (usage.length) item.append(el(document, "p", "sense-reference", usage.join(" · ")));
    if (sense.examples?.length) {
      const examples = el(document, "details", "source-details");
      examples.append(el(document, "summary", "", "예문·보충 설명 보기"));
      for (const example of sense.examples) {
        if (example.text) examples.append(el(document, "p", "sense-reference", example.text));
        if (example.translation) examples.append(el(document, "p", "sense-reference", example.translation));
        if (example.ref) examples.append(el(document, "p", "", example.ref));
      }
      item.append(examples);
    }
    item.append(sourceDetails(document, {name:"한국어판 위키낱말사전 기여자",url:entry.sourceUrl}, entry.license, entry.sourceNote || "Kaikki에서 추출한 자료를 검색에 맞게 정리했습니다."));
    return item;
  });
}

function renderSourceRelations(container, relations) {
  const document = container.ownerDocument;
  const values = Array.isArray(relations) ? relations : relations ? [relations] : [];
  const groups = new Map();
  for (const relation of values) {
    const features = Array.isArray(relation.feat) ? relation.feat : relation.feat ? [relation.feat] : [];
    const feature = name => features.find(item => item.att === name)?.val || "";
    const lemma = feature("lemma");
    if (!lemma) continue;
    const type = feature("type") || "관련 표현";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(String(lemma));
  }
  if (!groups.size) return;
  const section = el(document, "section", "source-relations");
  section.append(el(document, "h4", "detail-heading", "원문에 함께 실린 표현"));
  for (const [type, lemmas] of groups) {
    const row = el(document, "p", "sense-reference");
    row.append(el(document, "span", "relation-label", `${type}: `));
    lemmas.forEach((lemma, index) => {
      if (index) row.append(document.createTextNode(" · "));
      const button = el(document, "button", "related-word relation-word", lemma);
      button.type = "button";
      button.dataset.query = lemma;
      row.append(button);
    });
    section.append(row);
  }
  container.append(section);
}

function koreanSourceDetails(document, record, loadDetails, signal) {
  const details = el(document, "details", "source-details korean-source-details");
  const count = record.examplesCount || 0;
  details.append(el(document, "summary", "", count ? `예문 ${count}개와 관련 정보` : "원문 관련 정보"));
  const body = el(document, "div", "source-detail-body");
  details.append(body);
  let loading = false;
  let loaded = false;
  details.addEventListener("toggle", async () => {
    if (!details.open || loading || loaded || signal?.aborted) return;
    loading = true;
    body.textContent = "원문 예문을 불러오고 있습니다…";
    try {
      const detail = await loadDetails(record);
      if (signal?.aborted) return;
      body.replaceChildren();
      const examples = (detail.examples || []).filter(example => example.texts?.length);
      if (examples.length) {
        const list = el(document, "ol", "example-list");
        const more = el(document, "button", "more-button example-more", "예문 더 보기");
        more.type = "button";
        let shown = 0;
        const nextPage = () => {
          const end = Math.min(examples.length, shown + PAGE_SIZE);
          while (shown < end) {
            const example = examples[shown++];
            const item = el(document, "li", "source-example");
            const type = {구:"표현",문장:"문장",대화:"대화"}[example.type] || example.type || "예문";
            item.append(el(document, "span", "example-type", type));
            for (const text of example.texts) item.append(el(document, "p", "sense-reference", text));
            list.append(item);
          }
          more.hidden = shown >= examples.length;
        };
        nextPage();
        body.append(list);
        if (examples.length > PAGE_SIZE) {
          more.addEventListener("click", nextPage);
          body.append(more);
        }
      }
      renderSourceRelations(body, detail.senseRelations);
      if (!body.childNodes.length) body.append(el(document, "p", "sense-reference", "이 뜻에 추가 예문이나 관련 표현이 실려 있지 않습니다."));
      loaded = true;
    } catch (error) {
      if (signal?.aborted || error?.name === "AbortError") return;
      body.textContent = "관련 정보를 불러오지 못했습니다. 접었다 펼쳐 다시 시도해 주세요.";
    } finally { loading = false; }
  });
  return details;
}

export function renderKoreanEntries(container, records, {related = false, loadDetails, signal} = {}) {
  const document = container.ownerDocument;
  if (!records.length) return 0;
  if (!related) container.append(el(document, "h3", "meaning-heading", "영어 뜻"));
  return paginatedList(container, records, (record, index) => {
    const item = senseShell(document, index, labelFor(record.partOfSpeech, record.partOfSpeechKo) || record.entryTypeKo || "");
    if (related) {
      const wordButton = el(document, "button", "related-word", record.headword);
      wordButton.type = "button";
      wordButton.dataset.query = record.headword;
      item.append(wordButton);
    }
    if (record.englishExpression) {
      const expression = el(document, "p", "sense-meaning", record.englishExpression);
      expression.lang = "en";
      item.append(expression);
    } else {
      item.append(el(document, "p", "sense-reference", record.sourceKind === "korean-reference"
        ? "영어 뜻 없이 한국어 참고 정보가 실린 항목입니다."
        : "이 뜻에는 직접 대응하는 영어 표현이 실려 있지 않습니다."));
    }
    if (record.definitionKo) item.append(el(document, "p", "sense-definition", record.definitionKo));
    const annotations = [...new Set([...(record.entryAnnotations || []), ...(record.annotations || [])])];
    for (const annotation of annotations) item.append(el(document, "p", "sense-usage", annotation));
    if (record.englishDescription) {
      const description = el(document, "p", "sense-definition", record.englishDescription);
      description.lang = "en";
      item.append(description);
    }
    if (record.detailsRef && loadDetails) item.append(koreanSourceDetails(document, record, loadDetails, signal));
    item.append(sourceDetails(document, record.source || {}, record.license));
    return item;
  });
}

export function resolveDirection(query) {
  return /[\p{Script=Hangul}]/u.test(query.normalize("NFC")) ? "ko-en" : "en-ko";
}

export function createDictionaryApp(services, {document = globalThis.document, window = globalThis.window} = {}) {
  const form = document.querySelector("#search-form");
  const input = document.querySelector("#search-input");
  const area = document.querySelector("#lookup-area");
  const status = document.querySelector("#lookup-status");
  if (!form || !input || !area || !status) throw new Error("Dictionary UI is missing");
  const initialContent = Array.from(area.childNodes, node => node.cloneNode(true));
  let controller = null;
  let serial = 0;
  const setStatus = (message, {success = false} = {}) => {
    status.textContent = message;
    status.classList.toggle("sr-only", success);
  };

  async function search(query, {history = true} = {}) {
    query = String(query || "").normalize("NFC").trim().replace(/\s+/gu, " ").slice(0, 80);
    if (!query) { input.focus(); return; }
    input.value = query;
    const legacy = document.querySelector("#legacy-search-link");
    if (legacy) legacy.href = `/legacy_20260907_205800.html?q=${encodeURIComponent(query)}`;
    const direction = resolveDirection(query);
    controller?.abort();
    controller = new AbortController();
    const request = ++serial;
    const requestSignal = controller.signal;
    document.body.classList.add("has-results");
    area.setAttribute("aria-busy", "true");
    setStatus("뜻을 찾고 있습니다…");
    area.replaceChildren();
    if (history && window?.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", query);
      url.searchParams.delete("direction");
      if (url.href !== window.location.href) window.history.pushState({}, "", url);
    }
    let warned = false;
    try {
      const lookup = direction === "en-ko" ? services.lookupEnglishEntry : services.lookupKoreanEntry;
      const entries = await lookup(query, {signal:requestSignal,onWarning:() => { warned = true; }});
      if (request !== serial) return;
      const article = el(document, "article", "entry");
      article.setAttribute("aria-labelledby", "result-word");
      const header = el(document, "header", "word-header");
      header.append(el(document, "p", "result-direction", direction === "en-ko" ? "영어 → 한국어" : "한국어 → 영어"));
      const heading = el(document, "h2", "", entries[0]?.word || entries[0]?.headword || query);
      heading.id = "result-word";
      heading.tabIndex = -1;
      header.append(heading);
      if (direction === "en-ko") {
        const ipa = [...new Set(entries.flatMap(entry => (entry.sounds || []).map(sound => sound.ipa).filter(Boolean)))];
        if (ipa.length) header.append(el(document, "p", "sense-reference", ipa.join(" · ")));
      }
      if (direction === "ko-en") {
        const pronunciations = [...new Set(entries.flatMap(entry => (entry.pronunciations || []).map(item => item.pronunciation).filter(Boolean)))];
        if (pronunciations.length) header.append(el(document, "p", "sense-reference source-pronunciation", `발음 ${pronunciations.join(" · ")}`));
      }
      const pendingDetails = new Map();
      const loadDetails = services.loadKoreanEntryDetails ? record => {
        if (!pendingDetails.has(record.id)) {
          const promise = services.loadKoreanEntryDetails(record, {signal:requestSignal}).catch(error => { pendingDetails.delete(record.id); throw error; });
          pendingDetails.set(record.id, promise);
        }
        return pendingDetails.get(record.id);
      } : undefined;
      article.append(header);
      const meaning = el(document, "div", "meaning-content");
      const count = direction === "en-ko" ? renderEnglishEntries(meaning, entries) : renderKoreanEntries(meaning, entries, {loadDetails,signal:requestSignal});
      if (!count) {
        const empty = el(document, "div", "empty-result");
        empty.append(el(document, "h3", "", warned ? "뜻을 모두 확인하지 못했어요" : direction === "en-ko" ? "한국어 뜻을 찾지 못했어요" : "영어 뜻을 찾지 못했어요"));
        empty.append(el(document, "p", "", warned ? "일부 사전 자료를 불러오지 못했습니다. 잠시 후 다시 찾아 주세요." : direction === "en-ko"
          ? "현재 수록된 위키낱말사전 자료에는 이 단어의 한국어 풀이가 없습니다. 철자를 확인하거나 영영 사전에서 뜻을 살펴보세요."
          : "현재 수록된 한국어기초사전 자료에 이 표제어가 없습니다. 띄어쓰기나 기본형을 확인해 주세요."));
        meaning.append(empty);
      }
      article.append(meaning);
      setStatus(warned ? "일부 자료를 불러오지 못했습니다. 확인된 뜻을 먼저 보여 드립니다." : count ? "검색 결과를 표시했습니다." : "기본 사전에 수록된 뜻이 없습니다.", {success:!warned && count > 0});
      if (direction === "en-ko" && services.lookupKoreanByEnglish) {
        const related = el(document, "details", "related-details");
        related.append(el(document, "summary", "", "한국어기초사전에서 함께 찾기"));
        related.append(el(document, "p", "related-note", "이 영어 표현이 사용된 한국어 항목입니다. 위 한국어 뜻과는 별도로 볼 수 있어요."));
        const body = el(document, "div", "");
        related.append(body);
        let started = false;
        const loadRelated = async () => {
          if (!related.open || started) return;
          started = true;
          body.textContent = "함께 쓰인 표현을 찾고 있습니다…";
          try {
            let partial = false;
            const records = await services.lookupKoreanByEnglish(query, {signal:requestSignal,onWarning:() => { partial = true; }});
            if (request !== serial) return;
            body.replaceChildren();
            if (!renderKoreanEntries(body, records, {related:true,loadDetails,signal:requestSignal})) body.append(el(document, "p", "sense-reference", "함께 찾은 한국어 항목이 없습니다."));
            if (partial) body.append(el(document, "p", "sense-reference", "일부 자료를 불러오지 못했습니다. 잠시 후 다시 검색해 주세요."));
            if (!count) {
              setStatus(partial || warned
                ? "일부 자료를 불러오지 못했습니다. 확인된 관련 항목을 먼저 보여 드립니다."
                : records.length ? "한국어기초사전의 관련 항목을 표시했습니다." : "기본 사전에 수록된 뜻이 없습니다.", {success:!partial && !warned && records.length > 0});
            }
          } catch (error) {
            if (request !== serial || error?.name === "AbortError") return;
            body.textContent = "자료를 불러오지 못했습니다. 접었다 펼쳐 다시 시도해 주세요.";
            started = false;
          }
        };
        related.addEventListener("toggle", loadRelated);
        article.append(related);
        if (!count) { related.open = true; loadRelated(); }
      }
      const links = el(document, "nav", "entry-links");
      links.setAttribute("aria-label", "다른 사전에서 보기");
      const external = safeLink(document, direction === "en-ko" ? "영영 사전에서 더 보기 ↗" : "한국어기초사전에서 더 보기 ↗", direction === "en-ko"
        ? `https://en.wiktionary.org/wiki/${encodeURIComponent(query)}#English`
        : `https://krdict.korean.go.kr/eng/dicSearch/search?mainSearchWord=${encodeURIComponent(query)}`);
      if (external) links.append(external);
      article.append(links);
      area.replaceChildren(article);
      heading.focus({preventScroll:true});
    } catch (error) {
      if (request !== serial || error?.name === "AbortError") return;
      const message = el(document, "div", "error-message");
      message.append(el(document, "h2", "", "사전 자료를 불러오지 못했어요"));
      message.append(el(document, "p", "", "연결을 확인하고 다시 시도해 주세요."));
      const retry = el(document, "button", "more-button", "다시 찾기");
      retry.type = "button";
      retry.addEventListener("click", () => search(query));
      message.append(retry);
      area.replaceChildren(message);
      setStatus("검색 중 연결 문제가 발생했습니다.");
    } finally {
      if (request === serial) area.setAttribute("aria-busy", "false");
    }
  }

  form.addEventListener("submit", event => { event.preventDefault(); search(input.value); });
  document.addEventListener("click", event => {
    const button = event.target.closest?.("button[data-query]");
    if (!button) return;
    search(button.dataset.query);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "/" || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/u.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault();
    input.focus();
  });
  const restoreUrl = () => {
    const url = window?.location?.href ? new URL(window.location.href) : null;
    if (!url) return;
    if (url.searchParams.has("direction")) {
      url.searchParams.delete("direction");
      window.history?.replaceState?.({}, "", url);
    }
    const query = url.searchParams.get("q");
    if (query) search(query, {history:false});
    else {
      serial += 1;
      controller?.abort();
      input.value = "";
      setStatus("");
      area.setAttribute("aria-busy", "false");
      area.replaceChildren(...initialContent.map(node => node.cloneNode(true)));
      document.body.classList.remove("has-results");
      const legacy = document.querySelector("#legacy-search-link");
      if (legacy) legacy.href = "/legacy_20260907_205800.html";
    }
  };
  window?.addEventListener?.("popstate", restoreUrl);
  restoreUrl();
  return {search, cancel:() => { serial += 1; controller?.abort(); area.setAttribute("aria-busy", "false"); }};
}

if (typeof document !== "undefined" && document.querySelector("#search-form")) {
  Promise.all([
    import("./native-english-ko.js"),
    import("./native-korean-en_20260907_205345.js")
  ]).then(([english, korean]) => createDictionaryApp({...english, ...korean})).catch(() => {
    document.querySelector("#lookup-status").textContent = "사전을 준비하지 못했습니다. 페이지를 새로고침해 주세요.";
  });
}
