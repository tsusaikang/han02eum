const METADATA_URL = "/source-metadata_20260909_235001.json";
const number = value => new Intl.NumberFormat("ko-KR").format(value);
const natural = value => Number.isSafeInteger(value) && value >= 0;
function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function link(document, label, url) {
  const node = element(document, "a", "", label);
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Invalid source link");
  node.href = parsed.href;
  return node;
}
function validateCoverage(value) {
  for (const key of ["intersection", "union", "kowiktionaryOnly", "krdictOnly"]) {
    if (!natural(value?.[key])) throw new Error("Invalid coverage count");
  }
  if (value.union !== value.intersection + value.kowiktionaryOnly + value.krdictOnly) throw new Error("Invalid coverage total");
}
export function validateMetadata(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.sources)) throw new Error("Unsupported metadata");
  validateCoverage(data.englishInputCoverage);
  validateCoverage(data.englishInputCoverage.breakdown?.withoutSpaces);
  validateCoverage(data.englishInputCoverage.breakdown?.withSpaces);
  for (const key of ["intersection", "union", "kowiktionaryOnly", "krdictOnly"]) {
    if (data.englishInputCoverage[key] !== data.englishInputCoverage.breakdown.withoutSpaces[key] + data.englishInputCoverage.breakdown.withSpaces[key]) throw new Error("Invalid coverage breakdown");
  }
  for (const id of ["kowiktionary", "krdict"]) {
    const source = data.sources.find(item => item.id === id);
    if (!source || typeof source.name !== "string" || typeof source.coverage !== "string") throw new Error("Missing dictionary source");
    if (["headwords", "searchKeys", "senses"].some(key => !natural(source.counts?.[key]))) throw new Error("Invalid dictionary count");
  }
  if (!natural(data.sources.find(item => item.id === "krdict").counts.englishSearchKeys)) throw new Error("Invalid English search count");
  const wiki = data.sources.find(item => item.id === "kowiktionary");
  const krdict = data.sources.find(item => item.id === "krdict");
  if (wiki.counts.searchKeys !== data.englishInputCoverage.kowiktionaryOnly + data.englishInputCoverage.intersection || krdict.counts.englishSearchKeys !== data.englishInputCoverage.krdictOnly + data.englishInputCoverage.intersection) throw new Error("Inconsistent source coverage");
  return data;
}
function metric(document, label, count) {
  const item = element(document, "div");
  item.append(element(document, "dt", "", label), element(document, "dd", "", number(count)));
  return item;
}
function overview(document, label, count, description) {
  const card = element(document, "article", "overview-card");
  const value = element(document, "p", "stat-number", number(count));
  value.append(element(document, "small", "", "개"));
  card.append(element(document, "h3", "stat-label", label), value, element(document, "p", "stat-description", description));
  return card;
}
function coverageChart(document, data) {
  const panel = element(document, "section", "coverage-panel");
  panel.append(element(document, "h3", "", "두 출처가 만나는 수록 표현"));
  panel.append(element(document, "p", "section-copy", "한영이음에 영어 검색용으로 저장된 표현을 비교했습니다. 겹치는 표기는 한 번만 세었습니다. 두 출처의 뜻이 서로 같다고 판정한 수치는 아닙니다."));
  const categories = [
    ["한국어판 위키낱말사전에만", data.kowiktionaryOnly, "bar-wiki"],
    ["두 출처 모두에", data.intersection, "bar-both"],
    ["한국어기초사전에만", data.krdictOnly, "bar-krdict"]
  ];
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "coverage-bar");
  svg.setAttribute("viewBox", "0 0 1000 28");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  let x = 0;
  for (const [, count, className] of categories) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const width = data.union ? count / data.union * 1000 : 0;
    rect.setAttribute("x", String(x));rect.setAttribute("y", "0");rect.setAttribute("width", String(width));rect.setAttribute("height", "28");rect.setAttribute("class", className);
    svg.append(rect);x += width;
  }
  panel.append(svg);
  const legend = element(document, "dl", "coverage-legend");
  for (const [label, count] of categories) legend.append(metric(document, label, count));
  panel.append(legend);
  const details = element(document, "details", "coverage-detail");
  details.append(element(document, "summary", "", "공백이 있는 표현까지 나누어 보기"));
  const table = element(document, "table", "coverage-table");
  table.append(element(document, "caption", "", "공백 유무로 나눈 검색어 수입니다. 공백이 없다고 모두 단일 영어 단어인 것은 아닙니다."));
  const thead = element(document, "thead");
  const header = element(document, "tr");
  for (const label of ["검색어", "위키낱말사전만", "두 출처 모두", "한국어기초사전만", "중복 제외 전체"]) {
    const th = element(document, "th", "", label);th.scope = "col";header.append(th);
  }
  thead.append(header);table.append(thead);
  const tbody = element(document, "tbody");
  for (const [label, values] of [["공백 없음", data.breakdown.withoutSpaces], ["공백 포함", data.breakdown.withSpaces], ["전체", data]]) {
    const row = element(document, "tr");
    const th = element(document, "th", "", label);th.scope = "row";row.append(th);
    for (const key of ["kowiktionaryOnly", "intersection", "krdictOnly", "union"]) row.append(element(document, "td", "", number(values[key])));
    tbody.append(row);
  }
  table.append(tbody);details.append(table);
  details.append(element(document, "p", "", "대소문자와 공백을 정리한 표기로 비교합니다. 구 표현·로마자 표기 등이 포함되며 원문 표기의 오류 가능성도 있습니다. 실제 검색은 한글 포함 여부로 방향을 나누고 80자까지 받으므로, 저장된 모든 표현의 직접 조회를 보장하는 수치는 아닙니다."));
  panel.append(details);
  return panel;
}
function sourceCard(document, source) {
  const card = element(document, "article", "source-card");
  card.append(element(document, "p", "source-scope", source.id === "kowiktionary" ? "영어 항목의 한국어 풀이" : "한국어 항목과 영어 대응 표현"));
  card.append(element(document, "h3", "", source.name), element(document, "p", "section-copy", source.id === "kowiktionary"
    ? "한영이음에 수록한 영어 항목의 한국어 풀이입니다. 한국어판 사전 전체나 영어 어휘 전체를 담은 수치는 아닙니다."
    : "한영이음에 수록한 한국어 표제어의 영어 대응 표현과 풀이, 활용·참조 안내입니다. 모든 뜻에 영어 대응 표현이 있는 것은 아닙니다."));
  const counts = element(document, "dl", "source-counts");
  counts.append(metric(document, source.id === "krdict" ? "한국어 표제어" : "영한 자료 표제어", source.counts.headwords));
  counts.append(metric(document, "수록 뜻", source.counts.senses));
  counts.append(metric(document, source.id === "krdict" ? "한국어 검색어" : "영어 검색어", source.counts.searchKeys));
  if (source.id === "krdict") counts.append(metric(document, "영어 검색어·대응 표현", source.counts.englishSearchKeys));
  card.append(counts);
  card.append(element(document, "p", "source-count-note", "한영이음에서 표제어는 수록한 원래 표기의 수, 검색어는 대소문자·공백을 정리해 묶은 표기의 수입니다. 뜻 수는 수록한 원문 항목의 구분을 따릅니다."));
  const dates = (source.snapshotKnownDates || []).map(item => item.date ? `원천 자료 기준일: ${item.date}` : "원천 자료의 갱신일은 확인되지 않았습니다.").join(" · ");
  card.append(element(document, "p", "source-date", dates || "자료 시점이 확인되지 않았습니다."));
  card.append(link(document, "원문 사전 보기 ↗", source.url));
  return card;
}
export function renderSourceMetadata(container, metadata) {
  const data = validateMetadata(metadata);
  const document = container.ownerDocument;
  const fragment = document.createDocumentFragment();
  const krdict = data.sources.find(source => source.id === "krdict");
  const grid = element(document, "div", "overview-grid");
  grid.append(overview(document, "한영이음 · 영어 검색용 표현", data.englishInputCoverage.union, "한영이음의 두 출처 자료에 저장된 표기를 중복 없이 센 수입니다. 구 표현·로마자 표기를 포함하며 가능한 모든 입력 형태의 수는 아닙니다."));
  grid.append(overview(document, "한영이음 · 한국어 검색용 표기", krdict.counts.searchKeys, "한영이음에 수록한 한국어기초사전 표제어의 검색 범위입니다. 영어 검색어 수와 합산하지 않습니다."));
  fragment.append(grid, coverageChart(document, data.englishInputCoverage));
  fragment.append(element(document, "h3", "subsection-heading", "한영이음에 수록한 두 출처"));
  const sources = element(document, "div", "source-grid");
  for (const id of ["kowiktionary", "krdict"]) sources.append(sourceCard(document, data.sources.find(source => source.id === id)));
  fragment.append(sources);
  const date = new Date(data.generatedAt);
  if (!Number.isNaN(date.valueOf())) fragment.append(element(document, "p", "updated", `집계 시점: ${new Intl.DateTimeFormat("ko-KR", {dateStyle:"long",timeStyle:"short",timeZone:"Asia/Seoul"}).format(date)} · 자료 시점은 출처별로 다릅니다.`));
  container.replaceChildren(fragment);
}
export function initializeSourceMetadata({document = globalThis.document, fetchImpl = globalThis.fetch} = {}) {
  const container = document.getElementById("source-statistics");
  const status = document.getElementById("metadata-status");
  const retry = document.getElementById("metadata-retry");
  if (!container || !status || !retry) return;
  let pending = false;
  const load = async () => {
    if (pending) return;
    pending = true;retry.hidden = true;retry.disabled = true;
    container.setAttribute("aria-busy", "true");
    status.textContent = "수록량을 확인하고 있어요.";
    try {
      const response = await fetchImpl(METADATA_URL, {cache:"no-cache",credentials:"same-origin"});
      if (!response.ok) throw new Error("Metadata unavailable");
      renderSourceMetadata(container, await response.json());
      status.textContent = "";
    } catch {
      status.textContent = "수록량을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
      retry.hidden = false;
    } finally {
      pending = false;retry.disabled = false;container.setAttribute("aria-busy", "false");
    }
  };
  retry.addEventListener("click", load);
  const ready = load();
  return {load, ready};
}
if (typeof document !== "undefined" && document.getElementById("source-statistics")) initializeSourceMetadata();
