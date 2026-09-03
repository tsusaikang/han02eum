import test from "node:test";
import assert from "node:assert/strict";
import { DOMParser } from "linkedom";

import { parseWiktionaryEntry } from "../public/dictionary-parser.js";

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
