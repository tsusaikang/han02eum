const PARTS_OF_SPEECH = new Map([
  ["noun", "명사"],
  ["proper noun", "고유 명사"],
  ["verb", "동사"],
  ["adjective", "형용사"],
  ["adverb", "부사"],
  ["pronoun", "대명사"],
  ["preposition", "전치사"],
  ["conjunction", "접속사"],
  ["interjection", "감탄사"],
  ["determiner", "한정사"],
  ["article", "관사"],
  ["numeral", "수사"],
  ["particle", "조사"],
  ["prefix", "접두사"],
  ["suffix", "접미사"],
  ["phrase", "구"],
  ["proverb", "속담"],
  ["contraction", "축약형"],
  ["abbreviation", "약어"],
  ["letter", "문자"],
  ["symbol", "기호"]
]);

const FOLLOWING = 4;

export function detectInputLanguage(value) {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(value) ? "ko" : "en";
}

export function cleanText(value) {
  return String(value || "")
    .replace(/\[[^\]]{1,12}\]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function headingText(heading) {
  return cleanText(heading?.textContent).replace(/\[edit\]$/i, "").trim();
}

function headingLevel(heading) {
  return Number(heading?.tagName?.slice(1)) || 7;
}

function isAfter(start, node) {
  return Boolean(start.compareDocumentPosition(node) & FOLLOWING);
}

function isBetween(node, start, end) {
  return isAfter(start, node) && (!end || isAfter(node, end));
}

function findLanguageRange(document, languageName) {
  const headings = [...document.querySelectorAll("h2, h3, h4, h5, h6")];
  const start = headings.find(
    (heading) => headingLevel(heading) === 2 &&
      (heading.id === languageName || headingText(heading) === languageName)
  );
  if (!start) return null;
  const end = headings.find((heading) => headingLevel(heading) === 2 && isAfter(start, heading));
  return { start, end, headings };
}

function elementsInRange(document, selector, range) {
  return [...document.querySelectorAll(selector)].filter((node) => isBetween(node, range.start, range.end));
}

function sectionEnd(heading, headings, rangeEnd) {
  const level = headingLevel(heading);
  return headings.find((candidate) => isAfter(heading, candidate) && headingLevel(candidate) <= level) || rangeEnd;
}

function textWithoutNestedDetails(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll(
    "ol, ul, dl, table, figure, style, .reference, .mw-editsection, .nyms-toggle, .HQToggle"
  ).forEach((element) => element.remove());
  return cleanText(clone.textContent);
}

function extractExamples(listItem) {
  const preferred = [
    ...listItem.querySelectorAll(".e-example, .quotation, .h-usage-example, dl dd")
  ];
  const examples = [];
  for (const node of preferred) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("dl, ol, ul, table, .reference, .citation-whole").forEach((child) => child.remove());
    const text = cleanText(clone.textContent);
    if (text.length < 8 || /^(synonyms?|antonyms?|coordinate terms?|see also)\s*:/i.test(text)) continue;
    if (!examples.includes(text)) examples.push(text);
    if (examples.length === 2) break;
  }
  return examples;
}

function extractDefinitionGroups(document, range) {
  const groups = [];
  const partHeadings = range.headings.filter((heading) => {
    if (!isBetween(heading, range.start, range.end)) return false;
    return PARTS_OF_SPEECH.has(headingText(heading).toLocaleLowerCase("en"));
  });

  for (const heading of partHeadings) {
    const end = sectionEnd(heading, range.headings, range.end);
    const lists = [...document.querySelectorAll("ol")].filter(
      (list) => isBetween(list, heading, end) && !list.parentElement?.closest("ol")
    );
    const list = lists[0];
    if (!list) continue;

    const definitions = [...list.children]
      .filter((child) => child.tagName === "LI")
      .slice(0, 8)
      .map((item) => ({
        text: textWithoutNestedDetails(item),
        examples: extractExamples(item)
      }))
      .filter((definition) => definition.text);

    if (!definitions.length) continue;
    const partOfSpeech = headingText(heading);
    groups.push({
      partOfSpeech,
      koreanLabel: PARTS_OF_SPEECH.get(partOfSpeech.toLocaleLowerCase("en")),
      definitions
    });
    if (groups.length === 8) break;
  }
  return groups;
}

function extractPronunciations(document, range) {
  const values = [];
  for (const node of elementsInRange(document, ".IPA", range)) {
    const value = cleanText(node.textContent);
    if (value && value.length < 80 && !values.includes(value)) values.push(value);
    if (values.length === 5) break;
  }
  return values;
}

function absoluteMediaUrl(value) {
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://en.wiktionary.org${value}`;
  return value;
}

function extractAudio(document, range) {
  const candidates = elementsInRange(document, "audio source[src], audio[src]", range);
  const urls = [];
  for (const node of candidates) {
    const url = absoluteMediaUrl(node.getAttribute("src"));
    if (url && !urls.includes(url)) urls.push(url);
    if (urls.length === 3) break;
  }
  return urls;
}

function extractKoreanTranslations(document, range) {
  const translationHeadings = range.headings.filter(
    (heading) => isBetween(heading, range.start, range.end) && /^translations?$/i.test(headingText(heading))
  );
  const translations = [];

  for (const heading of translationHeadings) {
    const end = sectionEnd(heading, range.headings, range.end);
    const nodes = [...document.querySelectorAll("[lang='ko']")].filter(
      (node) => isBetween(node, heading, end) && !node.parentElement?.closest("[lang='ko']")
    );
    for (const node of nodes) {
      const term = cleanText(node.textContent);
      if (!term || term.length > 40 || translations.some((item) => item.term === term)) continue;
      const frame = node.closest(".NavFrame, .vsSwitcher, table");
      const sense = cleanText(frame?.querySelector(".NavHead, .vsToggleElement")?.textContent)
        .replace(/^translations?\s*/i, "")
        .slice(0, 120);
      translations.push({ term, sense });
      if (translations.length === 18) return translations;
    }
  }
  return translations;
}

export function parseWiktionaryEntry({ html, title, requestedWord, sourceUrl, revisionId, license }) {
  if (typeof DOMParser === "undefined") throw new Error("DOMParser is required to parse dictionary entries.");
  const inputLanguage = detectInputLanguage(requestedWord || title || "");
  const languageName = inputLanguage === "ko" ? "Korean" : "English";
  const document = new DOMParser().parseFromString(html, "text/html");
  const range = findLanguageRange(document, languageName);

  if (!range) {
    return {
      word: title || requestedWord,
      requestedWord,
      language: inputLanguage,
      found: false,
      pronunciations: [],
      audio: [],
      translations: [],
      definitionGroups: [],
      sourceUrl,
      revisionId,
      license
    };
  }

  return {
    word: title || requestedWord,
    requestedWord,
    language: inputLanguage,
    found: true,
    pronunciations: extractPronunciations(document, range),
    audio: extractAudio(document, range),
    translations: inputLanguage === "en" ? extractKoreanTranslations(document, range) : [],
    definitionGroups: extractDefinitionGroups(document, range),
    sourceUrl,
    revisionId,
    license
  };
}
