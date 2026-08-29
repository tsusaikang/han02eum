const VERIFIED_SUPPLEMENTS = [
  {
    id: "enwiktionary:92048420:royal:noun-1:noun-1-sense-1::krdict:68298:1",
    searchTerms: ["royal", "왕족"],
    english: {
      headword: "royal",
      partOfSpeech: "noun",
      partOfSpeechKo: "명사",
      definition: "A royal person; a member of a royal family.",
      usageNoteKo: "영어에서는 다소 비격식이며 첫 글자를 대문자로 쓰는 경우가 많습니다.",
      sourceUrl: "https://en.wiktionary.org/wiki/royal",
      revisionId: 92048420
    },
    korean: {
      id: "krdict:68298:1",
      entryId: "68298",
      senseId: "1",
      headword: "왕족",
      definition: "임금과 같은 집안인 사람.",
      examples: ["몰락한 왕족.", "왕족 출신.", "왕족의 가문."],
      sourceName: "한국어기초사전",
      sourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=68298&nation=eng&nationCode=6",
      license: {
        name: "CC BY-SA 2.0 KR",
        url: "https://creativecommons.org/licenses/by-sa/2.0/kr/"
      }
    }
  }
];

function normalizeSearchTerm(value) {
  const normalized = String(value || "").normalize("NFC").trim().replace(/\s+/g, " ");
  return /[A-Za-z]/u.test(normalized) && !/[가-힣]/u.test(normalized)
    ? normalized.toLocaleLowerCase("en")
    : normalized;
}

export function findVerifiedSupplements(value) {
  const term = normalizeSearchTerm(value);
  if (!term) return [];
  return VERIFIED_SUPPLEMENTS.filter((item) => item.searchTerms.includes(term));
}

function makeElement(document, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeLink(document, href, text) {
  const link = makeElement(document, "a", "", text);
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  return link;
}

function makeSupplementCard(document, supplement) {
  const card = makeElement(document, "article", "verified-supplement-card");
  card.dataset.supplementId = supplement.id;

  const header = makeElement(document, "header", "supplement-header");
  const pair = makeElement(document, "strong", "supplement-pair");
  const englishWord = makeElement(document, "span", "", supplement.english.headword);
  englishWord.lang = "en";
  const arrow = makeElement(document, "span", "supplement-arrow", "↔");
  arrow.setAttribute("aria-hidden", "true");
  const koreanWord = makeElement(document, "span", "", supplement.korean.headword);
  koreanWord.lang = "ko";
  pair.append(englishWord, arrow, koreanWord);
  header.append(
    pair,
    makeElement(
      document,
      "span",
      "supplement-pos",
      `${supplement.english.partOfSpeechKo} · ${supplement.english.partOfSpeech}`
    )
  );

  const koreanDefinition = makeElement(document, "p", "supplement-definition", supplement.korean.definition);
  const englishDefinition = makeElement(
    document,
    "p",
    "supplement-english-definition",
    `연결된 영어 뜻: ${supplement.english.definition}`
  );
  const usageNote = makeElement(document, "p", "supplement-usage", supplement.english.usageNoteKo);

  const examples = makeElement(document, "div", "supplement-examples");
  examples.append(makeElement(document, "p", "supplement-label", "한국어기초사전 예문"));
  const exampleList = makeElement(document, "div", "example-list");
  for (const example of supplement.korean.examples) {
    exampleList.append(makeElement(document, "blockquote", "example", example));
  }
  examples.append(exampleList);

  const source = makeElement(document, "footer", "supplement-source");
  const sourceText = makeElement(document, "div", "");
  sourceText.append(
    makeElement(document, "strong", "", `보완 뜻 출처: ${supplement.korean.sourceName}`),
    makeElement(
      document,
      "span",
      "",
      `표제어 ${supplement.korean.entryId} · 뜻 ${supplement.korean.senseId}`
    )
  );
  const sourceLinks = makeElement(document, "div", "supplement-source-links");
  sourceLinks.append(
    makeLink(document, supplement.korean.sourceUrl, "한국어 원문 보기 ↗"),
    makeLink(document, supplement.korean.license.url, supplement.korean.license.name),
    makeLink(
      document,
      supplement.english.sourceUrl,
      `영어 원뜻 보기 · Wiktionary 리비전 ${supplement.english.revisionId} ↗`
    )
  );
  source.append(sourceText, sourceLinks);

  card.append(header, koreanDefinition, englishDefinition, usageNote, examples, source);
  return card;
}

export function renderVerifiedSupplements(container, value) {
  const supplements = findVerifiedSupplements(value);
  container.replaceChildren();
  if (!supplements.length) return 0;

  const document = container.ownerDocument;
  const section = makeElement(document, "section", "verified-supplements-section");
  section.setAttribute("aria-labelledby", "verified-supplements-title");

  const heading = makeElement(document, "div", "supplement-section-heading");
  const headingText = makeElement(document, "div", "");
  headingText.append(
    makeElement(document, "p", "section-kicker", "한국어기초사전에서 확인"),
    makeElement(document, "h3", "", "검증해 보완한 뜻")
  );
  headingText.querySelector("h3").id = "verified-supplements-title";
  heading.append(
    headingText,
    makeElement(document, "span", "supplement-count", `${supplements.length}개`)
  );
  section.append(heading);

  for (const supplement of supplements) {
    section.append(makeSupplementCard(document, supplement));
  }
  container.append(section);
  return supplements.length;
}
