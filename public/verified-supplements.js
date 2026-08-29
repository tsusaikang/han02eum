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
  },
  {
    id: "enwiktionary:92121812:right:verb-1:verb-1-sense-1::krdict:85281:1",
    searchTerms: ["right", "시정하다"],
    english: {
      headword: "right",
      partOfSpeech: "verb",
      partOfSpeechKo: "동사",
      definition: "To correct.",
      usageNoteKo: "영어에서는 잘못된 상황이나 일을 바로잡는 타동사 뜻입니다.",
      sourceUrl: "https://en.wiktionary.org/wiki/right",
      revisionId: 92121812
    },
    korean: {
      id: "krdict:85281:1",
      entryId: "85281",
      senseId: "1",
      headword: "시정하다",
      definition: "잘못된 것을 바르게 고치다.",
      examples: ["시정한 부조리.", "관행을 시정하다.", "잘못을 시정하다."],
      sourceName: "한국어기초사전",
      sourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=85281&nation=eng&nationCode=6",
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
  const badges = makeElement(document, "div", "supplement-badges");
  badges.append(
    makeElement(document, "span", "supplement-source-badge", `${supplement.korean.sourceName} 확인`),
    makeElement(
      document,
      "span",
      "supplement-pos",
      `${supplement.english.partOfSpeechKo} · ${supplement.english.partOfSpeech}`
    )
  );
  header.append(pair, badges);

  const koreanDefinition = makeElement(document, "p", "supplement-definition", supplement.korean.definition);
  const englishDefinition = makeElement(
    document,
    "p",
    "supplement-english-definition",
    `연결 근거인 영영 뜻: ${supplement.english.definition}`
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
  const section = makeElement(document, "div", "verified-supplements-section");
  section.setAttribute("aria-label", "출처가 확인된 보충 한국어 뜻");
  section.append(makeElement(document, "p", "supplement-group-label", "출처가 확인된 보충 뜻"));

  for (const supplement of supplements) {
    section.append(makeSupplementCard(document, supplement));
  }
  container.append(section);
  return supplements.length;
}
