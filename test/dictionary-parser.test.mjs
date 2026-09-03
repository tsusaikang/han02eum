import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "linkedom";

import {
  classifyUnmatchedTranslationFallback,
  parseWiktionaryEntry
} from "../public/dictionary-parser.js";

const previousDOMParser = globalThis.DOMParser;
globalThis.DOMParser = DOMParser;

test.after(() => {
  globalThis.DOMParser = previousDOMParser;
});

const LICENSE = {
  name: "CC BY-SA 4.0",
  url: "https://creativecommons.org/licenses/by-sa/4.0/"
};

function parseFixture(html, options) {
  return parseWiktionaryEntry({
    requestedWord: "royal",
    title: "royal",
    revisionId: 92048420,
    sourceUrl: "https://en.wiktionary.org/wiki/royal",
    license: LICENSE,
    html
  }, options);
}

test("parseWiktionaryEntry keeps UI limits by default and can disable them for collection", () => {
  const groups = Array.from({ length: 10 }, (_, groupIndex) => `
    <h3>Noun</h3>
    <ol>
      ${Array.from({ length: 10 }, (_, definitionIndex) =>
        `<li>Meaning ${groupIndex + 1}.${definitionIndex + 1} with enough detail.</li>`
      ).join("")}
    </ol>
  `).join("");
  const html = `<h2 id="English">English</h2>${groups}<h2 id="French">French</h2>`;

  const uiEntry = parseFixture(html);
  assert.equal(uiEntry.definitionGroups.length, 8);
  assert.equal(uiEntry.definitionGroups.every((group) => group.definitions.length === 8), true);

  const collectedEntry = parseFixture(html, { limits: false });
  assert.equal(collectedEntry.definitionGroups.length, 10);
  assert.equal(collectedEntry.definitionGroups.every((group) => group.definitions.length === 10), true);
});

test("parseWiktionaryEntry keeps Korean translations inside their part of speech and exposes empty boxes", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Adjective</h3>
    <ol>
      <li>Of or relating to a monarch or his family.</li>
      <li>Having unusual excellence.</li>
    </ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">of or relating to a monarch or his family</div>
      <ul><li>Korean: <span lang="ko">왕의</span>, <span lang="ko">왕실의</span></li></ul>
    </div>
    <h3>Noun</h3>
    <ol>
      <li>A royal person; a member of a royal family.</li>
      <li>A standard size of printing paper.</li>
    </ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">royal person</div>
      <ul><li>German: Royal</li></ul>
    </div>
    <h2 id="Danish">Danish</h2>
  `);

  assert.equal(entry.found, true);
  assert.deepEqual(entry.translations.map(({ term }) => term), ["왕의", "왕실의"]);

  const adjective = entry.definitionGroups.find((group) => group.partOfSpeech === "Adjective");
  const noun = entry.definitionGroups.find((group) => group.partOfSpeech === "Noun");
  assert.deepEqual(adjective.definitions[0].koreanTranslations.map(({ term }) => term), ["왕의", "왕실의"]);
  assert.equal(adjective.definitions[0].translationCoverage.status, "present");
  assert.equal(adjective.definitions[1].translationCoverage.status, "no-translation-box");
  assert.deepEqual(noun.definitions[0].koreanTranslations, []);
  assert.equal(noun.definitions[0].translationCoverage.status, "missing-in-translation-box");
  assert.equal(noun.definitions[1].translationCoverage.status, "no-translation-box");
});

test("parseWiktionaryEntry preserves the same Korean term in two different senses", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Noun</h3>
    <ol>
      <li>A financial institution.</li>
      <li>The land alongside a river.</li>
    </ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">financial institution</div>
      <span lang="ko">은행</span>
    </div>
    <div class="NavFrame">
      <div class="NavHead">land alongside a river</div>
      <span lang="ko">은행</span>
    </div>
    <h2 id="French">French</h2>
  `);

  const definitions = entry.definitionGroups[0].definitions;
  assert.equal(definitions[0].koreanTranslations[0].term, "은행");
  assert.equal(definitions[1].koreanTranslations[0].term, "은행");
  assert.deepEqual(entry.translations.map(({ term }) => term), ["은행"]);
});

test("parseWiktionaryEntry does not guess when a translation sense cannot be aligned", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Noun</h3>
    <ol><li>A person.</li><li>A sheet of paper.</li></ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">unrelated technical meaning</div>
      <span lang="ko">후보</span>
    </div>
    <h2 id="French">French</h2>
  `);

  const group = entry.definitionGroups[0];
  assert.equal(group.unmatchedTranslationBlocks.length, 1);
  assert.equal(group.definitions[0].translationCoverage.status, "unresolved");
  assert.equal(group.definitions[1].translationCoverage.status, "unresolved");
  assert.deepEqual(entry.translations, []);
});

test("parseWiktionaryEntry keeps unresolved translations as a part-of-speech summary only when none were assigned", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Adjective</h3>
    <ol>
      <li>(of material or fluid) Solid and firm.</li>
      <li>(personal or social) Having a severe property; presenting difficulty.</li>
    </ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">resistant to pressure</div>
      <span lang="ko">딱딱하다</span><span lang="ko">단단하다</span>
    </div>
    <div class="NavFrame">
      <div class="NavHead">requiring a lot of effort to do or understand</div>
      <span lang="ko">어렵다</span>
    </div>
    <h3>Verb</h3>
    <ol><li>(transitive, obsolete) To make hard, harden.</li></ol>
    <h2 id="French">French</h2>
  `);

  const adjective = entry.definitionGroups.find((group) => group.partOfSpeech === "Adjective");
  const verb = entry.definitionGroups.find((group) => group.partOfSpeech === "Verb");
  assert.deepEqual(
    adjective.summaryKoreanTranslations.map(({ term }) => term),
    ["딱딱하다", "단단하다", "어렵다"]
  );
  assert.equal(adjective.definitions.every((definition) => definition.koreanTranslations.length === 0), true);
  assert.deepEqual(verb.summaryKoreanTranslations, []);
  assert.deepEqual(entry.translations, []);
});

test("hard keeps source-backed unmatched adjective terms under general fallback rules", () => {
  const decision = classifyUnmatchedTranslationFallback({
    partOfSpeech: "Adjective",
    definitions: [
      { text: "(of material or fluid) Solid and firm." },
      { text: "Difficult, requiring much effort." },
      { text: "(slang, vulgar) Sexually aroused." }
    ],
    blocks: [
      {
        id: "translation-1",
        sense: "resistant to pressure",
        translations: [{ term: "딱딱하다" }, { term: "단단하다" }]
      },
      {
        id: "translation-2",
        sense: "requiring a lot of effort to do or understand",
        translations: [{ term: "어렵다" }]
      },
      {
        id: "translation-9",
        sense: "to be checked",
        translations: []
      }
    ]
  });

  assert.equal(decision.tier, "B");
  assert.equal(decision.publicEligible, true);
  assert.deepEqual(decision.translations.map(({ term }) => term), ["딱딱하다", "단단하다", "어렵다"]);
  assert.ok(decision.reasonCodes.includes("FALLBACK_SOURCE_USAGE_LABEL_OWNERSHIP_UNCLEAR"));
});

test("back placeholder fallback is fail-closed and never emits a term without a real gloss", () => {
  const decision = classifyUnmatchedTranslationFallback({
    definitions: [{ text: "Returned to a previous place." }],
    blocks: [{
      id: "translation-5",
      sense: "to be checked",
      translations: [{ term: "뒤쪽의" }, { term: "되돌리다" }]
    }]
  });

  assert.equal(decision.tier, "D");
  assert.deepEqual(decision.translations, []);
  assert.ok(decision.reasonCodes.includes("FALLBACK_GLOSS_PLACEHOLDER"));
});

test("state fallback is hidden when an assigned translation already exists for the part of speech", () => {
  const decision = classifyUnmatchedTranslationFallback({
    partOfSpeech: "Verb",
    definitions: [{ text: "To express in words." }],
    assignedTranslations: [{ term: "진술하다", sense: "express in words" }],
    blocks: [{
      id: "translation-1",
      sense: "declare to be a fact",
      translations: [{ term: "선언" }]
    }]
  });

  assert.equal(decision.tier, "D");
  assert.deepEqual(decision.translations, []);
  assert.ok(decision.reasonCodes.includes("FALLBACK_ASSIGNED_TRANSLATION_EXISTS_FOR_PART_OF_SPEECH"));
  assert.ok(decision.reasonCodes.includes("FALLBACK_KOREAN_TERM_PART_OF_SPEECH_SHAPE_MISMATCH"));
});

test("match file and scale repeated noun occurrences are blocked as cross-etymology fallbacks", () => {
  for (const term of ["경기", "줄", "비늘"]) {
    const decision = classifyUnmatchedTranslationFallback({
      definitions: [{ text: "A source definition." }],
      repeatedPartOfSpeech: true,
      blocks: [{
        id: "translation-1",
        sense: "a concrete source gloss",
        translations: [{ term }]
      }]
    });
    assert.equal(decision.tier, "D");
    assert.deepEqual(decision.translations, []);
    assert.ok(decision.reasonCodes.includes("FALLBACK_REPEATED_PART_OF_SPEECH_OCCURRENCE"));
  }
});

test("close removes a term reused with conflicting glosses while retaining unambiguous terms", () => {
  const decision = classifyUnmatchedTranslationFallback({
    partOfSpeech: "Verb",
    definitions: [{ text: "To shut something." }, { text: "To end something." }],
    blocks: [
      { id: "translation-1", sense: "move a door", translations: [{ term: "닫다" }] },
      { id: "translation-2", sense: "become unreceptive", translations: [{ term: "닫다" }] },
      { id: "translation-3", sense: "put an end to", translations: [{ term: "끝내다" }] }
    ]
  });

  assert.equal(decision.publicEligible, true);
  assert.deepEqual(decision.translations, [{ term: "끝내다", sense: "put an end to" }]);
  assert.ok(decision.reasonCodes.includes("FALLBACK_TERM_CONFLICTS_ACROSS_GLOSSES"));
});

test("point blocks a term whose translation gloss looks cut off", () => {
  const decision = classifyUnmatchedTranslationFallback({
    definitions: [{ text: "A decimal point." }],
    blocks: [{
      id: "translation-17",
      sense: "arithmetic: decimal point (note: many languages use a comma rather than a dot, and hence the translations into these languages reflect ",
      translations: [{ term: "점" }]
    }]
  });

  assert.equal(decision.tier, "D");
  assert.deepEqual(decision.translations, []);
  assert.ok(decision.reasonCodes.includes("FALLBACK_GLOSS_TRUNCATED_OR_INCOMPLETE"));
});

test("repeated same-POS sections suppress unmatched summaries in the parsed public payload", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Noun</h3>
    <ol><li>A sporting event.</li></ol>
    <h4>Translations</h4>
    <div class="NavFrame"><div class="NavHead">unrelated event gloss</div><span lang="ko">경기</span></div>
    <h3>Noun</h3>
    <ol><li>A fire-lighting stick.</li></ol>
    <h4>Translations</h4>
    <div class="NavFrame"><div class="NavHead">unrelated fire gloss</div><span lang="ko">성냥</span></div>
    <h2 id="French">French</h2>
  `);

  assert.equal(entry.definitionGroups.length, 2);
  assert.equal(entry.definitionGroups.every((group) => group.summaryKoreanTranslations.length === 0), true);
});

test("the eighth-to-ninth definition display boundary does not suppress an otherwise safe fallback", () => {
  const parseWithDefinitionCount = (count) => parseFixture(`
    <h2 id="English">English</h2>
    <h3>Adjective</h3>
    <ol>${Array.from({ length: count }, (_, index) =>
      `<li>Unrelated adjective definition number ${index + 1}.</li>`
    ).join("")}</ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">resistant to pressure</div>
      <span lang="ko">딱딱하다</span><span lang="ko">단단하다</span>
    </div>
    <h2 id="French">French</h2>
  `);
  const eight = parseWithDefinitionCount(8);
  const nine = parseWithDefinitionCount(9);

  assert.equal(eight.definitionGroups[0].definitions.length, 8);
  assert.equal(nine.definitionGroups[0].definitions.length, 8);
  assert.deepEqual(
    nine.definitionGroups[0].summaryKoreanTranslations,
    eight.definitionGroups[0].summaryKoreanTranslations
  );
  assert.deepEqual(nine.definitionGroups[0].summaryKoreanTranslations.map(({ term }) => term), [
    "딱딱하다", "단단하다"
  ]);
});

test("a hidden ninth assigned translation blocks fallback without leaking into flat translations", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Noun</h3>
    <ol>
      ${Array.from({ length: 8 }, (_, index) =>
        `<li>Visible unrelated definition number ${index + 1}.</li>`
      ).join("")}
      <li>A concealed assigned meaning.</li>
    </ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">A concealed assigned meaning.</div>
      <span lang="ko">숨은 정상번역</span>
    </div>
    <div class="NavFrame">
      <div class="NavHead">a concrete but unmatched meaning</div>
      <span lang="ko">미배정 후보</span>
    </div>
    <h2 id="French">French</h2>
  `);

  assert.equal(entry.definitionGroups[0].definitions.length, 8);
  assert.deepEqual(entry.definitionGroups[0].summaryKoreanTranslations, []);
  assert.deepEqual(entry.translations, []);
  assert.doesNotMatch(JSON.stringify(entry), /숨은 정상번역/);
});

test("parseWiktionaryEntry suppresses unresolved part-of-speech summaries when any translation was assigned", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Adjective</h3>
    <ol><li>Solid and firm.</li><li>Difficult to do.</li></ol>
    <h4>Translations</h4>
    <div class="NavFrame"><div class="NavHead">Solid and firm.</div><span lang="ko">단단하다</span></div>
    <div class="NavFrame"><div class="NavHead">unrelated label</div><span lang="ko">후보</span></div>
    <h2 id="French">French</h2>
  `);

  const adjective = entry.definitionGroups[0];
  assert.deepEqual(adjective.definitions[0].koreanTranslations.map(({ term }) => term), ["단단하다"]);
  assert.deepEqual(adjective.summaryKoreanTranslations, []);
  assert.deepEqual(entry.translations.map(({ term }) => term), ["단단하다"]);
});

test("parseWiktionaryEntry does not force an unrelated singleton translation block onto a sense", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Noun</h3>
    <ol><li>A member of a royal family.</li></ol>
    <h4>Translations</h4>
    <div class="NavFrame">
      <div class="NavHead">a paper size</div>
      <span lang="ko">판형</span>
    </div>
    <h2 id="French">French</h2>
  `);

  const definition = entry.definitionGroups[0].definitions[0];
  assert.equal(definition.translationCoverage.status, "unresolved");
  assert.deepEqual(definition.koreanTranslations, []);
});

test("parseWiktionaryEntry collects independent NavFrame, table, and direct Korean blocks", () => {
  const entry = parseFixture(`
    <h2 id="English">English</h2>
    <h3>Noun</h3>
    <ol>
      <li>A person in a royal family.</li>
      <li>A paper size.</li>
      <li>A small sail.</li>
    </ol>
    <h4>Translations</h4>
    <div class="NavFrame"><div class="NavHead">person in a royal family</div><span lang="ko">왕족</span></div>
    <table><caption>paper size</caption><tr><td><span lang="ko">판형</span></td></tr></table>
    <p><span lang="ko">돛</span></p>
    <h2 id="French">French</h2>
  `);

  const group = entry.definitionGroups[0];
  assert.deepEqual(group.definitions[0].koreanTranslations.map(({ term }) => term), ["왕족"]);
  assert.deepEqual(group.definitions[1].koreanTranslations.map(({ term }) => term), ["판형"]);
  assert.equal(group.unmatchedTranslationBlocks.some((block) =>
    block.translations.some(({ term }) => term === "돛")
  ), true);
});
