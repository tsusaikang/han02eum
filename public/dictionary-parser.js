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
const DEFAULT_DEFINITIONS_PER_GROUP = 8;
const DEFAULT_GROUP_LIMIT = 8;
const MIN_TRANSLATION_MATCH = 0.5;
const MIN_TRANSLATION_MARGIN = 0.12;
const MAX_FALLBACK_GLOSS_LENGTH = 159;

const USAGE_LABELS = [
  "obsolete", "archaic", "dated", "historical", "informal", "slang", "vulgar",
  "rare", "literary", "nonstandard", "offensive", "derogatory", "dialectal",
  "chiefly", "regional"
];

const GLOSS_STOP_WORDS = new Set([
  "a", "an", "and", "any", "as", "at", "be", "by", "for", "from", "his", "her", "in",
  "into", "is", "its", "of", "on", "or", "the", "their", "to", "used", "with"
]);

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

function isAfter(start, node, order) {
  if (order) return (order.get(node) ?? -1) > (order.get(start) ?? -1);
  return Boolean(start.compareDocumentPosition(node) & FOLLOWING);
}

function isBetween(node, start, end, order) {
  return isAfter(start, node, order) && (!end || isAfter(node, end, order));
}

function findLanguageRange(document, languageName) {
  const order = new Map([...document.querySelectorAll("*")].map((node, index) => [node, index]));
  const headings = [...document.querySelectorAll("h2, h3, h4, h5, h6")];
  const start = headings.find(
    (heading) => headingLevel(heading) === 2 &&
      (heading.id === languageName || headingText(heading) === languageName)
  );
  if (!start) return null;
  const end = headings.find(
    (heading) => headingLevel(heading) === 2 && isAfter(start, heading, order)
  );
  return { start, end, headings, order };
}

function elementsInRange(document, selector, range) {
  return [...document.querySelectorAll(selector)].filter(
    (node) => isBetween(node, range.start, range.end, range.order)
  );
}

function sectionEnd(heading, headings, rangeEnd, order) {
  const level = headingLevel(heading);
  return headings.find(
    (candidate) => isAfter(heading, candidate, order) && headingLevel(candidate) <= level
  ) || rangeEnd;
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

function normalizeGloss(value) {
  return cleanText(value)
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function glossTokens(value) {
  return normalizeGloss(value)
    .split(" ")
    .filter((token) => token.length > 1 && !GLOSS_STOP_WORDS.has(token));
}

function translationMatchScore(definitionText, sourceSense) {
  const definition = normalizeGloss(definitionText);
  const sense = normalizeGloss(sourceSense);
  if (!definition || !sense) return 0;
  if (definition === sense) return 1;
  if (definition.includes(sense) || sense.includes(definition)) return 0.92;

  const definitionTokens = new Set(glossTokens(definition));
  const senseTokens = new Set(glossTokens(sense));
  if (!definitionTokens.size || !senseTokens.size) return 0;
  let shared = 0;
  for (const token of senseTokens) {
    if (definitionTokens.has(token)) shared += 1;
  }
  return shared / Math.sqrt(definitionTokens.size * senseTokens.size);
}

function extractTranslationBlocks(document, heading, headings, rangeEnd, order) {
  const sectionLimit = sectionEnd(heading, headings, rangeEnd, order);
  const structuralContainers = [...document.querySelectorAll(".NavFrame, .vsSwitcher, .mw-collapsible")]
    .filter((node) => isBetween(node, heading, sectionLimit, order))
    .filter((node) => !node.parentElement?.closest(".NavFrame, .vsSwitcher, .mw-collapsible"));
  const tableContainers = [...document.querySelectorAll("table")]
    .filter((node) => isBetween(node, heading, sectionLimit, order))
    .filter((node) => !node.parentElement?.closest("table, .NavFrame, .vsSwitcher, .mw-collapsible"));
  const containers = [...structuralContainers, ...tableContainers]
    .sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
  const directKoreanNodes = [...document.querySelectorAll("[lang='ko']")].filter(
    (node) => isBetween(node, heading, sectionLimit, order) &&
      !node.parentElement?.closest("[lang='ko'], table, .NavFrame, .vsSwitcher, .mw-collapsible")
  );
  if (directKoreanNodes.length) {
    containers.push({
      querySelector: () => null,
      querySelectorAll: (selector) => selector === "[lang='ko']" ? directKoreanNodes : []
    });
  }
  if (!containers.length) return [];

  return containers.map((container, index) => {
    const sense = cleanText(
      container.querySelector(".NavHead, .vsToggleElement, caption")?.textContent
    ).replace(/^translations?\s*/i, "");
    const translations = [];
    for (const node of container.querySelectorAll("[lang='ko']")) {
      if (node.parentElement?.closest("[lang='ko']")) continue;
      const term = cleanText(node.textContent);
      if (!term || term.length > 40 || translations.some((item) => item.term === term)) continue;
      translations.push({ term, sense });
    }
    return {
      id: `translation-${index + 1}`,
      sense,
      translations
    };
  });
}

function attachTranslationBlocks(definitions, blocks) {
  const assignments = definitions.map(() => []);
  const unmatched = [];

  for (const block of blocks) {
    if (definitions.length === 1 && blocks.length === 1) {
      const score = translationMatchScore(definitions[0].text, block.sense);
      if (!block.sense) {
        assignments[0].push({ block, score: null, method: "structural-singleton" });
      } else if (score >= MIN_TRANSLATION_MATCH) {
        assignments[0].push({ block, score, method: "normalized-gloss" });
      } else {
        unmatched.push(block);
      }
      continue;
    }

    const scores = definitions
      .map((definition, index) => ({ index, score: translationMatchScore(definition.text, block.sense) }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    const best = scores[0];
    const runnerUp = scores[1];
    if (
      best &&
      best.score >= MIN_TRANSLATION_MATCH &&
      (!runnerUp || best.score - runnerUp.score >= MIN_TRANSLATION_MARGIN)
    ) {
      assignments[best.index].push({ block, score: best.score, method: "normalized-gloss" });
    } else {
      unmatched.push(block);
    }
  }

  return { assignments, unmatched };
}

function fallbackUsageLabels(texts) {
  const normalized = texts.join(" ").toLocaleLowerCase("en");
  return USAGE_LABELS.filter((label) => new RegExp(`\\b${label}\\b`, "u").test(normalized));
}

function fallbackGlossProblem(value) {
  const gloss = cleanText(value);
  if (!gloss) return "FALLBACK_GLOSS_MISSING";
  if (/^(?:to be checked|check(?:ed)?|translation(?:s)? needed|please add|todo|tbd|n\/?a|\?+)\.?$/iu.test(gloss)) {
    return "FALLBACK_GLOSS_PLACEHOLDER";
  }
  const hasUnclosedDelimiter = [
    ["(", ")"], ["[", "]"], ["{", "}"]
  ].some(([open, close]) => gloss.split(open).length !== gloss.split(close).length);
  if (
    gloss.length > MAX_FALLBACK_GLOSS_LENGTH ||
    hasUnclosedDelimiter ||
    /(?:\.\.\.|…|[,;:(\[\{\-–—])\s*$/u.test(gloss)
  ) {
    return "FALLBACK_GLOSS_TRUNCATED_OR_INCOMPLETE";
  }
  return null;
}

function normalizedFallbackTerm(value) {
  return cleanText(value).normalize("NFKC").toLocaleLowerCase("ko");
}

export function classifyUnmatchedTranslationFallback({
  blocks = [],
  definitions = [],
  assignedTranslations = [],
  partOfSpeech = "",
  repeatedPartOfSpeech = false,
  evidenceIncomplete = false
} = {}) {
  const reasonCodes = [];
  const addReason = (reason) => {
    if (!reasonCodes.includes(reason)) reasonCodes.push(reason);
  };

  if (repeatedPartOfSpeech) addReason("FALLBACK_REPEATED_PART_OF_SPEECH_OCCURRENCE");
  if (assignedTranslations.length) addReason("FALLBACK_ASSIGNED_TRANSLATION_EXISTS_FOR_PART_OF_SPEECH");
  if (evidenceIncomplete) addReason("FALLBACK_DEFINITION_SCOPE_INCOMPLETE");

  const candidates = [];
  for (const block of blocks) {
    const translations = Array.isArray(block?.translations) ? block.translations : [];
    if (!translations.length) continue;
    const gloss = cleanText(block?.sense);
    const glossProblem = fallbackGlossProblem(gloss);
    if (glossProblem) {
      addReason(glossProblem);
      continue;
    }
    if (fallbackUsageLabels([gloss]).length) {
      addReason("FALLBACK_TRANSLATION_USAGE_LABEL_REQUIRES_ALIGNMENT");
      continue;
    }
    for (const translation of translations) {
      const term = cleanText(translation?.term);
      if (!term) {
        addReason("FALLBACK_TERM_MISSING");
        continue;
      }
      if (
        /^(?:verb|adjective)$/iu.test(cleanText(partOfSpeech)) &&
        !/다(?:\([^)]*\))?$/u.test(term)
      ) {
        addReason("FALLBACK_KOREAN_TERM_PART_OF_SPEECH_SHAPE_MISMATCH");
        continue;
      }
      candidates.push({ term, sense: gloss, blockId: String(block?.id || "") });
    }
  }

  const glossesByTerm = new Map();
  for (const candidate of candidates) {
    const termKey = normalizedFallbackTerm(candidate.term);
    if (!glossesByTerm.has(termKey)) glossesByTerm.set(termKey, new Set());
    glossesByTerm.get(termKey).add(normalizeGloss(candidate.sense));
  }

  const translations = [];
  for (const candidate of candidates) {
    const termKey = normalizedFallbackTerm(candidate.term);
    if ((glossesByTerm.get(termKey)?.size || 0) > 1) {
      addReason("FALLBACK_TERM_CONFLICTS_ACROSS_GLOSSES");
      continue;
    }
    if (translations.some((translation) =>
      normalizedFallbackTerm(translation.term) === termKey &&
      normalizeGloss(translation.sense) === normalizeGloss(candidate.sense)
    )) {
      addReason("FALLBACK_DUPLICATE_TERM_GLOSS_REMOVED");
      continue;
    }
    translations.push({ term: candidate.term, sense: candidate.sense });
  }

  const sourceUsageLabels = fallbackUsageLabels(definitions.map((definition) => String(definition?.text || "")));
  if (sourceUsageLabels.length) addReason("FALLBACK_SOURCE_USAGE_LABEL_OWNERSHIP_UNCLEAR");
  if (definitions.length > 1) addReason("FALLBACK_POS_WIDE_MULTI_SENSE_SUMMARY");
  if (translations.length > 1) addReason("FALLBACK_MULTIPLE_TERM_SUMMARY");

  const structuralBlock = repeatedPartOfSpeech || assignedTranslations.length || evidenceIncomplete;
  const publicTranslations = structuralBlock ? [] : translations;
  if (!publicTranslations.length) addReason("FALLBACK_NO_SAFE_PUBLIC_TRANSLATION");
  const tier = !publicTranslations.length
    ? "D"
    : sourceUsageLabels.length || reasonCodes.some((reason) =>
      reason === "FALLBACK_POS_WIDE_MULTI_SENSE_SUMMARY" ||
      reason === "FALLBACK_MULTIPLE_TERM_SUMMARY" ||
      reason === "FALLBACK_DUPLICATE_TERM_GLOSS_REMOVED"
    )
      ? "B"
      : "A";

  return {
    tier,
    reasonCodes,
    publicEligible: tier === "A" || tier === "B",
    translations: publicTranslations
  };
}

function extractDefinitionGroups(document, range, limits) {
  const groups = [];
  const partCounts = new Map();
  const partHeadings = range.headings.filter((heading) => {
    if (!isBetween(heading, range.start, range.end, range.order)) return false;
    return PARTS_OF_SPEECH.has(headingText(heading).toLocaleLowerCase("en"));
  });

  for (const heading of partHeadings) {
    const end = sectionEnd(heading, range.headings, range.end, range.order);
    const lists = [...document.querySelectorAll("ol")].filter(
      (list) => isBetween(list, heading, end, range.order) && !list.parentElement?.closest("ol")
    );
    const list = lists[0];
    if (!list) continue;

    const definitionItems = [...list.children]
      .filter((child) => child.tagName === "LI");
    const selectedDefinitionItems = limits
      ? definitionItems.slice(0, limits.definitionsPerGroup)
      : definitionItems;
    const rawDefinitions = selectedDefinitionItems
      .map((item) => ({
        text: textWithoutNestedDetails(item),
        examples: extractExamples(item)
      }))
      .filter((definition) => definition.text);

    if (!rawDefinitions.length) continue;
    const partOfSpeech = headingText(heading);
    const partKey = partOfSpeech.toLocaleLowerCase("en");
    const occurrence = (partCounts.get(partKey) || 0) + 1;
    partCounts.set(partKey, occurrence);
    const groupId = `${partKey.replace(/\s+/g, "-")}-${occurrence}`;
    const translationHeadings = range.headings.filter(
      (candidate) => isBetween(candidate, heading, end, range.order) && /^translations?$/i.test(headingText(candidate))
    );
    const translationBlocks = translationHeadings.flatMap((candidate) =>
      extractTranslationBlocks(document, candidate, range.headings, end, range.order)
    );
    const { assignments, unmatched } = attachTranslationBlocks(rawDefinitions, translationBlocks);
    const assignedKoreanTranslationCount = assignments.reduce(
      (count, assigned) => count + assigned.reduce(
        (subtotal, { block }) => subtotal + block.translations.length,
        0
      ),
      0
    );
    const definitions = rawDefinitions.map((definition, index) => {
      const assigned = assignments[index];
      const koreanTranslations = assigned.flatMap(({ block }) => block.translations);
      let status = "no-translation-box";
      if (assigned.length) {
        status = koreanTranslations.length ? "present" : "missing-in-translation-box";
      } else if (unmatched.length) {
        status = "unresolved";
      }
      return {
        id: `${groupId}-sense-${index + 1}`,
        ...definition,
        koreanTranslations,
        translationCoverage: {
          status,
          sourceSenses: assigned.map(({ block }) => block.sense).filter(Boolean),
          matchMethod: assigned.length
            ? [...new Set(assigned.map(({ method }) => method))].join("+")
            : null,
          matches: assigned.map(({ block, score, method }) => ({
            blockId: block.id,
            method,
            score
          }))
        }
      };
    });

    groups.push({
      id: groupId,
      partOfSpeech,
      koreanLabel: PARTS_OF_SPEECH.get(partKey),
      definitions,
      summaryKoreanTranslations: [],
      unmatchedTranslationBlocks: unmatched,
      fallbackDefinitionScopeIncomplete: selectedDefinitionItems.length < definitionItems.length
    });
  }
  const groupsByPart = new Map();
  for (const group of groups) {
    const key = group.partOfSpeech.toLocaleLowerCase("en");
    if (!groupsByPart.has(key)) groupsByPart.set(key, []);
    groupsByPart.get(key).push(group);
  }
  for (const samePartGroups of groupsByPart.values()) {
    const assignedTranslations = samePartGroups.flatMap((group) =>
      group.definitions.flatMap((definition) => definition.koreanTranslations || [])
    );
    for (const group of samePartGroups) {
      const decision = classifyUnmatchedTranslationFallback({
        blocks: group.unmatchedTranslationBlocks,
        definitions: group.definitions,
        assignedTranslations,
        partOfSpeech: group.partOfSpeech,
        repeatedPartOfSpeech: (partCounts.get(group.partOfSpeech.toLocaleLowerCase("en")) || 0) > 1,
        evidenceIncomplete: group.fallbackDefinitionScopeIncomplete
      });
      group.summaryKoreanTranslations = decision.publicEligible ? decision.translations : [];
      delete group.fallbackDefinitionScopeIncomplete;
    }
  }
  return limits ? groups.slice(0, limits.groups) : groups;
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

function flattenKoreanTranslations(definitionGroups) {
  const translations = [];
  for (const group of definitionGroups) {
    for (const definition of group.definitions) {
      for (const translation of definition.koreanTranslations) {
        if (translations.some((item) => item.term === translation.term)) continue;
        translations.push(translation);
        if (translations.length === 18) return translations;
      }
    }
  }
  return translations;
}

export function parseWiktionaryEntry(
  { html, title, requestedWord, sourceUrl, revisionId, license },
  options = {}
) {
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

  const limits = options.limits === false
    ? null
    : {
        definitionsPerGroup: DEFAULT_DEFINITIONS_PER_GROUP,
        groups: DEFAULT_GROUP_LIMIT
      };
  const definitionGroups = extractDefinitionGroups(document, range, limits);
  return {
    word: title || requestedWord,
    requestedWord,
    language: inputLanguage,
    found: true,
    pronunciations: extractPronunciations(document, range),
    audio: extractAudio(document, range),
    translations: inputLanguage === "en" ? flattenKoreanTranslations(definitionGroups) : [],
    definitionGroups,
    sourceUrl,
    revisionId,
    license
  };
}
