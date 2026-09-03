import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOMParser } from "linkedom";

import { parseWiktionaryEntry } from "../public/dictionary-parser.js";
import {
  buildMeaningSummaryGroups,
  findVerifiedSupplements,
  getVerifiedSupplementCount,
  renderMeaningSummary,
  renderVerifiedSupplements
} from "../public/verified-supplements.js";

class TestElement {
  constructor(ownerDocument, tagName) {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this._textContent = "";
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this._textContent = "";
    this.children = [...children];
  }

  get childElementCount() {
    return this.children.length;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const tagName = selector.toUpperCase();
    const matches = [];
    for (const child of this.children) {
      if (child.tagName === tagName) matches.push(child);
      matches.push(...child.querySelectorAll(selector));
    }
    return matches;
  }
}

class TestDocument {
  createElement(tagName) {
    return new TestElement(this, tagName);
  }
}

test("the verified royal and 왕족 searches resolve to the same single mapping", () => {
  const english = findVerifiedSupplements(" Royal ");
  const korean = findVerifiedSupplements("왕족");

  assert.equal(english.length, 1);
  assert.equal(korean.length, 1);
  assert.equal(english[0].id, korean[0].id);
  assert.equal(english[0].english.partOfSpeech, "noun");
  assert.equal(english[0].korean.id, "krdict:68298:1");
  assert.equal(english[0].korean.headword, "왕족");
  assert.deepEqual(english[0].korean.examples, [
    "몰락한 왕족.",
    "왕족 출신.",
    "왕족의 가문."
  ]);
});

test("the verified right and 시정하다 searches resolve to the same sourced mapping", () => {
  const english = findVerifiedSupplements(" RIGHT ");
  const korean = findVerifiedSupplements("시정하다");

  assert.equal(english.length, 1);
  assert.equal(korean.length, 1);
  assert.equal(english[0].id, korean[0].id);
  assert.equal(english[0].english.partOfSpeech, "verb");
  assert.equal(english[0].english.revisionId, 92121812);
  assert.equal(english[0].english.sourceUrl, "https://en.wiktionary.org/wiki/right");
  assert.equal(english[0].korean.id, "krdict:85281:1");
  assert.equal(english[0].korean.headword, "시정하다");
  assert.equal(english[0].korean.sourceName, "한국어기초사전");
  assert.deepEqual(english[0].korean.examples, [
    "시정한 부조리.",
    "관행을 시정하다.",
    "잘못을 시정하다."
  ]);
});

test("the verified pitch and 진 searches resolve to the same sourced mapping", () => {
  const english = findVerifiedSupplements(" PITCH ");
  const korean = findVerifiedSupplements("진");

  assert.equal(english.length, 1);
  assert.equal(korean.length, 1);
  assert.equal(english[0].id, korean[0].id);
  assert.equal(
    english[0].id,
    "enwiktionary:92085012:pitch:noun-1:noun-1-sense-1::krdict:76493:1"
  );
  assert.equal(english[0].english.partOfSpeech, "noun");
  assert.equal(english[0].english.revisionId, 92085012);
  assert.equal(english[0].english.definition, "A sticky, gummy substance secreted by trees; tree sap.");
  assert.equal(english[0].english.sourceUrl, "https://en.wiktionary.org/wiki/pitch");
  assert.equal(english[0].korean.id, "krdict:76493:1");
  assert.equal(english[0].korean.headword, "진");
  assert.equal(english[0].korean.definition, "풀이나 나무의 껍질 등에서 나오는 끈끈한 물질.");
  assert.equal(english[0].korean.sourceName, "한국어기초사전");
  assert.equal(english[0].korean.license.name, "CC BY-SA 2.0 KR");
  assert.equal(english[0].korean.license.url, "https://creativecommons.org/licenses/by-sa/2.0/kr/");
  assert.deepEqual(english[0].korean.examples, [
    "소나무의 진.",
    "진이 나오다.",
    "진이 흐르다."
  ]);
});

test("the verified figure and 숫자 searches resolve to the same sourced mapping", () => {
  const english = findVerifiedSupplements(" FIGURE ");
  const korean = findVerifiedSupplements("숫자");

  assert.equal(english.length, 1);
  assert.equal(korean.length, 1);
  assert.equal(english[0].id, korean[0].id);
  assert.equal(
    english[0].id,
    "enwiktionary:91716304:figure:noun-1:noun-1-sense-8::krdict:65425:2"
  );
  assert.equal(english[0].english.partOfSpeech, "noun");
  assert.equal(english[0].english.revisionId, 91716304);
  assert.equal(english[0].english.definition, "A number, an amount.");
  assert.deepEqual(english[0].english.examples, [
    "(i) in the 1966 edition of The Destruction of Dresden Irving contended that 135,000 were estimated authoritatively to have been killed and further contended that the documentation suggested a figure between 100,00 and 250,000;"
  ]);
  assert.equal(english[0].english.sourceUrl, "https://en.wiktionary.org/wiki/figure");
  assert.equal(english[0].korean.id, "krdict:65425:2");
  assert.equal(english[0].korean.headword, "숫자");
  assert.equal(english[0].korean.definition, "통계 등에서 숫자가 나타내는 양.");
  assert.equal(english[0].korean.sourceName, "한국어기초사전");
  assert.equal(english[0].korean.license.name, "CC BY-SA 2.0 KR");
  assert.deepEqual(english[0].korean.examples, [
    "통계 숫자.",
    "숫자가 감소하다.",
    "숫자가 증가하다."
  ]);
});

test("the verified minute and 쪼금 searches resolve to the same sourced mapping", () => {
  const englishMatches = findVerifiedSupplements(" MINUTE ");
  const english = englishMatches.find((item) => item.korean.id === "krdict:78005:2");
  const korean = findVerifiedSupplements("쪼금");

  assert.equal(englishMatches.length, 2);
  assert.ok(english);
  assert.equal(korean.length, 1);
  assert.equal(english.id, korean[0].id);
  assert.equal(
    english.id,
    "enwiktionary:91663519:minute:noun-1:noun-1-sense-2::krdict:78005:2"
  );
  assert.equal(english.english.partOfSpeech, "noun");
  assert.equal(english.english.revisionId, 91663519);
  assert.equal(english.english.definition, "(informal) A short but unspecified time period.");
  assert.deepEqual(english.english.examples, [
    "give me a minute",
    "Wait a minute, I’m not ready yet!"
  ]);
  assert.equal(english.english.sourceUrl, "https://en.wiktionary.org/wiki/minute");
  assert.equal(english.korean.id, "krdict:78005:2");
  assert.equal(english.korean.headword, "쪼금");
  assert.equal(english.korean.definition, "짧은 시간 동안.");
  assert.equal(english.korean.sourceName, "한국어기초사전");
  assert.equal(english.korean.license.name, "CC BY-SA 2.0 KR");
  assert.deepEqual(english.korean.examples, [
    "쪼금 전.",
    "쪼금 후.",
    "쪼금만 머물다."
  ]);
});

test("the verified minute adjective and 미소하다 searches resolve to the same sourced mapping", () => {
  const englishMatches = findVerifiedSupplements(" MINUTE ");
  const english = englishMatches.find((item) => item.korean.id === "krdict:56457:1");
  const korean = findVerifiedSupplements("미소하다");

  assert.equal(englishMatches.length, 2);
  assert.ok(english);
  assert.equal(korean.length, 1);
  assert.equal(english.id, korean[0].id);
  assert.equal(
    english.id,
    "enwiktionary:91663519:minute:adjective-1:adjective-1-sense-1::krdict:56457:1"
  );
  assert.equal(english.english.partOfSpeech, "adjective");
  assert.equal(english.english.revisionId, 91663519);
  assert.equal(english.english.definition, "Very small.");
  assert.deepEqual(english.english.examples, [
    "They found only minute quantities of chemical residue on his clothing."
  ]);
  assert.equal(english.english.sourceUrl, "https://en.wiktionary.org/wiki/minute");
  assert.equal(english.korean.id, "krdict:56457:1");
  assert.equal(english.korean.headword, "미소하다");
  assert.equal(english.korean.definition, "아주 작다.");
  assert.deepEqual(english.korean.examples, [
    "변화가 미소하다.",
    "차이가 미소하다.",
    "크기가 미소하다."
  ]);
});

test("the rejected hard and 굳히다 mapping is absent while the original public catalog remains", () => {
  assert.equal(getVerifiedSupplementCount(), 20);
  assert.deepEqual(findVerifiedSupplements("hard"), []);
  assert.deepEqual(findVerifiedSupplements("굳히다"), []);
  assert.deepEqual(findVerifiedSupplements("노력하다"), []);
});

for (const expected of [
  {
    englishWord: "interest",
    koreanWord: "관심사",
    id: "enwiktionary:92080669:interest:noun-1:noun-1-sense-7::krdict:23998:1",
    partOfSpeech: "noun",
    revisionId: 92080669,
    englishDefinition: "(countable) Something which, or someone whom, one is interested in.",
    englishExamples: ["Lexicography is one of my interests.", "Victorian furniture is an interest of mine."],
    englishSourceUrl: "https://en.wiktionary.org/wiki/interest",
    koreanId: "krdict:23998:1",
    definition: "관심을 끄는 일이나 대상.",
    examples: ["최대 관심사.", "공통의 관심사.", "세계적 관심사."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=23998&nation=eng&nationCode=6"
  },
  {
    englishWord: "bright",
    koreanWord: "광명하다",
    id: "enwiktionary:92082661:bright:adjective-1:adjective-1-sense-2::krdict:30718:1",
    partOfSpeech: "adjective",
    revisionId: 92082661,
    englishDefinition: "Of light: brilliant, intense.",
    englishExamples: ["Could you please dim the light? It’s far too bright."],
    englishSourceUrl: "https://en.wiktionary.org/wiki/bright",
    koreanId: "krdict:30718:1",
    definition: "밝고 환하다.",
    examples: ["광명한 빛.", "광명한 세상.", "광명한 태양."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=30718&nation=eng&nationCode=6"
  },
  {
    englishWord: "face",
    koreanWord: "면하다",
    id: "enwiktionary:91983790:face:verb-1:verb-1-sense-7::krdict:55080:1",
    partOfSpeech: "verb",
    revisionId: 91983790,
    englishDefinition: "(intransitive) To have the front in a certain direction.",
    englishExamples: ["The seats in the carriage faced backwards."],
    englishSourceUrl: "https://en.wiktionary.org/wiki/face",
    koreanId: "krdict:55080:1",
    definition: "어떤 대상이나 방향을 정면으로 향하다.",
    examples: ["바다를 면하다.", "한길을 면하다.", "골목에 면하다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=55080&nation=eng&nationCode=6"
  },
  {
    englishWord: "hand",
    koreanWord: "건네주다",
    id: "enwiktionary:91988185:hand:verb-1:verb-1-sense-1::krdict:15884:1",
    partOfSpeech: "verb",
    revisionId: 91988185,
    englishDefinition: "(ditransitive) To give, pass or transmit with the hand, literally or figuratively.",
    englishExamples: [
      "He handed them the letter. She handed me an opportunity.",
      "It has jailed environmental activists and is planning to limit the power of judicial oversight by handing a state-approved body a monopoly over bringing environmental lawsuits."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/hand",
    koreanId: "krdict:15884:1",
    definition: "남에게 무엇을 전하여 넘겨주다.",
    examples: ["돈을 건네주다.", "봉투를 건네주다.", "상자를 건네주다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=15884&nation=eng&nationCode=6"
  },
  {
    englishWord: "branch",
    koreanWord: "가지",
    id: "enwiktionary:91837451:branch:noun-1:noun-1-sense-2::krdict:59919:2",
    partOfSpeech: "noun",
    revisionId: 91837451,
    englishDefinition: "Any of the parts of something that divides like the branch of a tree.",
    englishExamples: ["the branch of an antler, a chandelier, or a railway"],
    englishSourceUrl: "https://en.wiktionary.org/wiki/branch",
    koreanId: "krdict:59919:2",
    definition: "근본이 되는 어떤 것에서 다시 갈라져 나온 것.",
    examples: [
      "이 좁은 길은 아까 그 큰길의 가지라고 할 수 있다.",
      "어떤 학문이든 그 큰 줄기에서 갈라져 나온 많은 가지들을 가지고 있다.",
      "이 책만 읽으면 그의 이론을 이해할 수 있을까요?"
    ],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=59919&nation=eng&nationCode=6"
  },
  {
    englishWord: "cell",
    koreanWord: "세포",
    id: "enwiktionary:91924215:cell:noun-1:noun-1-sense-12::krdict:74889:1",
    partOfSpeech: "noun",
    revisionId: 91924215,
    englishDefinition: "(biology) The basic unit of a living organism, consisting of a quantity of protoplasm surrounded by a cell membrane, which is able to synthesize proteins and replicate itself.",
    englishExamples: [
      "An American company has applied to experiment in Britain on Parkinson's disease sufferers by injecting their brains with cells from pigs.",
      "In multicellular organisms, groups of cells form tissues and tissues come together to form organs."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/cell",
    koreanId: "krdict:74889:1",
    definition: "생물체를 이루는 기본 단위.",
    examples: ["피부 세포.", "세포 성장.", "세포 연구."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=74889&nation=eng&nationCode=6"
  },
  {
    englishWord: "jam",
    koreanWord: "틀어넣다",
    id: "enwiktionary:92042489:jam:verb-1:verb-1-sense-2::krdict:82629:1",
    partOfSpeech: "verb",
    revisionId: 92042489,
    englishDefinition: "To brusquely force something into a space; to cram, to squeeze.",
    englishExamples: [
      "They temporarily stopped the gas tank leak by jamming a piece of taffy into the hole.",
      "The rush-hour train was jammed with commuters."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/jam",
    koreanId: "krdict:82629:1",
    definition: "비좁은 자리에 억지로 들이밀어 넣다.",
    examples: ["솜을 틀어넣다.", "수건을 틀어넣다.", "구멍에 틀어넣다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=82629&nation=eng&nationCode=6"
  },
  {
    englishWord: "fair",
    koreanWord: "행운",
    id: "enwiktionary:91955513:fair:noun-1:noun-1-sense-5::krdict:85119:1",
    partOfSpeech: "noun",
    revisionId: 91955513,
    englishDefinition: "(obsolete) Good fortune; good luck.",
    englishExamples: ["Now, fair befall thee, good Petruchio!"],
    englishSourceUrl: "https://en.wiktionary.org/wiki/fair",
    koreanId: "krdict:85119:1",
    definition: "좋은 운수. 또는 행복한 운수.",
    examples: ["행운의 여신.", "행운과 액운.", "행운이 깃들다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=85119&nation=eng&nationCode=6"
  },
  {
    englishWord: "turn",
    koreanWord: "성정",
    id: "enwiktionary:92060252:turn:noun-1:noun-1-sense-18::krdict:84610:1",
    partOfSpeech: "noun",
    revisionId: 92060252,
    englishDefinition: "Character; personality; nature.",
    englishExamples: [
      "It was fortunate for his comfort, perhaps, that the man who had been chosen to accompany him was of a talkative turn, for the prisoners insisted upon hearing the story of the explosion a dozen times over, and Rufus Dawes himself had been roused to give the name of the vessel with his own lips."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/turn",
    koreanId: "krdict:84610:1",
    definition: "성질과 마음씨. 또는 타고난 본성.",
    examples: ["성정이 거칠다.", "성정이 곧다.", "성정이 바르다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=84610&nation=eng&nationCode=6"
  },
  {
    englishWord: "round",
    koreanWord: "덤비다",
    id: "enwiktionary:92048419:round:verb-1:verb-1-sense-6::krdict:50281:1",
    partOfSpeech: "verb",
    revisionId: 92048419,
    englishDefinition: "(intransitive) To turn and attack someone or something (used with on).",
    englishExamples: [
      "As a group of policemen went past him, one of them rounded on him, grabbing him by the arm."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/round",
    koreanId: "krdict:50281:1",
    definition: "대들거나 달려들다.",
    examples: ["무작정 덤비다.", "버릇없이 덤비다.", "어른께 덤비다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=50281&nation=eng&nationCode=6"
  },
  {
    englishWord: "wave",
    koreanWord: "흔들다",
    id: "enwiktionary:92065773:wave:verb-1:verb-1-sense-8::krdict:29776:1",
    partOfSpeech: "verb",
    revisionId: 92065773,
    englishDefinition: "(transitive) To cause to move back and forth repeatedly.",
    englishExamples: [
      "The starter waved the flag to begin the race.",
      "His father has waved bills in front of face and said to him — see what you've cost me."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/wave",
    koreanId: "krdict:29776:1",
    definition: "무엇을 좌우, 앞뒤로 자꾸 움직이게 하다.",
    examples: ["고개를 흔들다.", "꼬리를 흔들다.", "머리를 흔들다."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=29776&nation=eng&nationCode=6"
  },
  {
    englishWord: "square",
    koreanWord: "네모나다",
    id: "enwiktionary:92057562:square:adjective-1:adjective-1-sense-1::krdict:41457:1",
    partOfSpeech: "adjective",
    revisionId: 92057562,
    englishDefinition: "Shaped like a square (the polygon).",
    englishExamples: [
      "The huge square box, parquet-floored and high-ceilinged, had been arranged to display a suite of bedroom furniture designed and made in the halcyon days of the last quarter of the nineteenth century,."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/square",
    koreanId: "krdict:41457:1",
    definition: "네모 모양으로 되어 있다.",
    examples: ["네모난 상자.", "네모난 얼굴.", "네모난 턱."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=41457&nation=eng&nationCode=6"
  },
  {
    englishWord: "fast",
    koreanWord: "곤하다",
    id: "enwiktionary:92093809:fast:adjective-1:adjective-1-sense-8::krdict:27691:2",
    partOfSpeech: "adjective",
    revisionId: 92093809,
    englishDefinition: "Deep or sound (of sleep); fast asleep (of people).",
    englishExamples: [
      "Since his majesty went into the field, I have seen her rise from her bed, throw her nightgown upon her, unlock her closet, take forth paper, fold it, write upon’t, read it, afterwards seal it, and again return to bed; yet all this while in a most fast sleep."
    ],
    englishSourceUrl: "https://en.wiktionary.org/wiki/fast",
    koreanId: "krdict:27691:2",
    definition: "잠든 상태가 깊다.",
    examples: ["곤한 꿈.", "곤한 숨결.", "곤한 잠."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=27691&nation=eng&nationCode=6"
  },
  {
    englishWord: "clear",
    koreanWord: "공간",
    id: "enwiktionary:91781595:clear:noun-1:noun-1-sense-1::krdict:18694:2",
    partOfSpeech: "noun",
    revisionId: 91781595,
    englishDefinition: "Empty or open area.",
    englishExamples: ["The deer were standing in the clear."],
    englishSourceUrl: "https://en.wiktionary.org/wiki/clear",
    koreanId: "krdict:18694:2",
    definition: "널리 펼쳐 있는 빈 곳.",
    examples: ["무한한 공간.", "도시 공간.", "바다 공간."],
    koreanSourceUrl: "https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=18694&nation=eng&nationCode=6"
  }
]) {
  test(`the verified ${expected.englishWord} and ${expected.koreanWord} searches resolve to the same sourced mapping`, () => {
    const english = findVerifiedSupplements(` ${expected.englishWord.toUpperCase()} `);
    const korean = findVerifiedSupplements(expected.koreanWord);

    assert.equal(english.length, 1);
    assert.equal(korean.length, 1);
    assert.equal(english[0].id, korean[0].id);
    assert.equal(english[0].id, expected.id);
    assert.equal(english[0].english.partOfSpeech, expected.partOfSpeech);
    assert.equal(english[0].english.revisionId, expected.revisionId);
    assert.equal(english[0].english.definition, expected.englishDefinition);
    assert.deepEqual(english[0].english.examples, expected.englishExamples);
    assert.equal(english[0].english.sourceUrl, expected.englishSourceUrl);
    assert.equal(english[0].korean.id, expected.koreanId);
    assert.equal(english[0].korean.headword, expected.koreanWord);
    assert.equal(english[0].korean.definition, expected.definition);
    assert.equal(english[0].korean.sourceName, "한국어기초사전");
    assert.equal(english[0].korean.sourceUrl, expected.koreanSourceUrl);
    assert.equal(english[0].korean.license.name, "CC BY-SA 2.0 KR");
    assert.equal(english[0].korean.license.url, "https://creativecommons.org/licenses/by-sa/2.0/kr/");
    assert.deepEqual(english[0].korean.examples, expected.examples);
  });
}

test("excluded and unrelated words do not receive a verified supplement", () => {
  for (const word of [
    "line", "screen", "play", "light",
    "bank", "run", "set", "record", "charge", "bear", "spring", "match", "point",
    "left", "fine", "mean", "kind", "sound", "watch", "break", "hold", "draw",
    "current", "issue", "case", "file", "key", "scale", "date", "board", "field",
    "bat", "club", "ring", "bill", "draft", "strike", "suit", "court",
    "capital", "subject", "object", "present", "second", "letter", "order", "state",
    "change", "cover", "open", "flat", "sharp",
    "cool", "warm", "dry", "wet", "head", "foot", "arm",
    "back", "shoulder", "body", "trunk", "root", "leaf", "table", "chair",
    "mouse", "port", "terminal", "network", "virus", "bug", "crash", "crane",
    "bark", "iron",
    "hello"
  ]) {
    assert.deepEqual(findVerifiedSupplements(word), []);
  }
});

function royalEntry() {
  return {
    language: "en",
    translations: [{ term: "왕의", sense: "of a monarch" }, { term: "왕실의", sense: "of a monarch" }],
    definitionGroups: [
      {
        partOfSpeech: "Adjective",
        koreanLabel: "형용사",
        definitions: [
          {
            koreanTranslations: [
              { term: "왕의", sense: "of a monarch" },
              { term: "왕실의", sense: "of a monarch" }
            ]
          }
        ]
      },
      {
        partOfSpeech: "Noun",
        koreanLabel: "명사",
        definitions: [{ koreanTranslations: [] }]
      }
    ]
  };
}

function deployedRoyalParserEntry() {
  return {
    language: "en",
    translations: [
      {
        term: "왕의",
        sense: "of or relating to a monarch or his family — see also regal, monarchic, palatial, majestic"
      },
      {
        term: "왕실의",
        sense: "of or relating to a monarch or his family — see also regal, monarchic, palatial, majestic"
      }
    ],
    definitionGroups: [
      {
        partOfSpeech: "Adjective",
        koreanLabel: "형용사",
        definitions: [
          { text: "Of or relating to a monarch or his (or her) family." },
          { text: "Having the air or demeanour of a monarch; illustrious; magnanimous." },
          { text: "In large sailing ships, of a mast right above the topgallant mast and its sails." }
        ]
      },
      {
        partOfSpeech: "Noun",
        koreanLabel: "명사",
        definitions: [
          { text: "A royal person; a member of a royal family." },
          { text: "A standard size of printing paper." },
          { text: "A small sail immediately above the topgallant sail." }
        ]
      }
    ]
  };
}

function reducedLiveRoyalPayload() {
  return {
    requestedWord: "royal",
    title: "royal",
    revisionId: 92048420,
    sourceUrl: "https://en.wiktionary.org/wiki/royal",
    license: {
      name: "CC BY-SA 4.0",
      url: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    html: `
      <h2 id="English">English</h2>
      <h3 id="Adjective">Adjective</h3>
      <ol>
        <li>Of or relating to a monarch or his (or her) family.</li>
        <li>Having the air or demeanour of a monarch; illustrious; magnanimous.</li>
      </ol>
      <h4 id="Translations">Translations</h4>
      <div class="NavFrame">
        <div class="NavHead">of or relating to a monarch or his family — see also regal, monarchic, palatial, majestic</div>
        <div class="NavContent">
          <table><tbody><tr><td>Korean</td><td><span lang="ko">왕의</span>, <span lang="ko">왕실의</span></td></tr></tbody></table>
        </div>
      </div>
      <h3 id="Noun">Noun</h3>
      <ol>
        <li>(somewhat informal, often capitalised) A royal person; a member of a royal family.</li>
        <li>(paper, printing) A standard size of printing paper, measuring 25 by 20 inches.</li>
      </ol>
      <h4 id="Translations_2">Translations</h4>
      <div class="NavFrame">
        <div class="NavHead">royal person</div>
        <div class="NavContent"><table><tbody><tr><td>German</td><td>Royal</td></tr></tbody></table></div>
      </div>
      <h2 id="French">French</h2>
    `
  };
}

function reducedLiveHardPayload() {
  return {
    requestedWord: "hard",
    title: "hard",
    revisionId: 92041120,
    sourceUrl: "https://en.wiktionary.org/wiki/hard",
    license: {
      name: "CC BY-SA 4.0",
      url: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    html: `
      <h2 id="English">English</h2>
      <h3 id="Adjective">Adjective</h3>
      <ol>
        <li>(of material or fluid) Solid and firm.</li>
        <li>(personal or social) Having a severe property; presenting difficulty.</li>
      </ol>
      <h4 id="Translations">Translations</h4>
      <div class="NavFrame">
        <div class="NavHead">resistant to pressure</div>
        <div class="NavContent"><span lang="ko">딱딱하다</span>, <span lang="ko">단단하다</span></div>
      </div>
      <div class="NavFrame">
        <div class="NavHead">requiring a lot of effort to do or understand</div>
        <div class="NavContent"><span lang="ko">어렵다</span></div>
      </div>
      <h3 id="Verb">Verb</h3>
      <ol><li>(transitive, obsolete) To make hard, harden.</li></ol>
      <h2 id="French">French</h2>
    `
  };
}

test("the Korean meaning summary merges Wiktionary and verified meanings by part of speech", () => {
  const groups = buildMeaningSummaryGroups(royalEntry(), findVerifiedSupplements("royal"));
  assert.deepEqual(groups.map((group) => ({
    partOfSpeech: group.partOfSpeech,
    partOfSpeechKo: group.partOfSpeechKo,
    meanings: group.meanings.map(({ term, verified }) => ({ term, verified }))
  })), [
    {
      partOfSpeech: "Adjective",
      partOfSpeechKo: "형용사",
      meanings: [
        { term: "왕의", verified: false },
        { term: "왕실의", verified: false }
      ]
    },
    {
      partOfSpeech: "Noun",
      partOfSpeechKo: "명사",
      meanings: [{ term: "왕족", verified: true }]
    }
  ]);
});

test("the actual royal summary DOM shows Korean meanings in order with uniform styling", () => {
  const document = new TestDocument();
  const target = document.createElement("div");
  const summary = renderMeaningSummary(target, royalEntry(), findVerifiedSupplements("royal"));

  assert.equal(summary.title, "한국어 뜻");
  assert.equal(summary.groupCount, 2);
  assert.equal(summary.meaningCount, 3);
  assert.deepEqual(target.querySelectorAll("h3").map((heading) => heading.textContent), [
    "형용사 · Adjective",
    "명사 · Noun"
  ]);
  assert.ok(target.textContent.indexOf("왕의") < target.textContent.indexOf("왕실의"));
  assert.ok(target.textContent.indexOf("왕실의") < target.textContent.indexOf("왕족"));
  assert.match(target.textContent, /왕족/);
  assert.doesNotMatch(target.textContent, /검증 보완|검증 연결/);
  const meaningItems = target.querySelectorAll("span")
    .filter((item) => item.className === "translation-item");
  assert.equal(meaningItems.length, 3);
  assert.deepEqual(meaningItems.map((item) => item.className), [
    "translation-item",
    "translation-item",
    "translation-item"
  ]);
  assert.equal(
    target.querySelectorAll("span").filter((item) => item.className.includes("is-verified")).length,
    0
  );
  const sections = target.querySelectorAll("section");
  assert.equal(sections.length, 2);
  assert.equal(sections[0].attributes.get("aria-labelledby"), "translation-group-1");
  assert.equal(sections[1].attributes.get("aria-labelledby"), "translation-group-2");
});

test("the deployed flat royal API shape safely restores adjective meanings in the summary DOM", () => {
  const document = new TestDocument();
  const target = document.createElement("div");
  const summary = renderMeaningSummary(
    target,
    deployedRoyalParserEntry(),
    findVerifiedSupplements("royal")
  );

  assert.equal(summary.groupCount, 2);
  assert.equal(summary.meaningCount, 3);
  assert.deepEqual(target.querySelectorAll("h3").map((heading) => heading.textContent), [
    "형용사 · Adjective",
    "명사 · Noun"
  ]);
  assert.ok(target.textContent.indexOf("왕의") < target.textContent.indexOf("왕실의"));
  assert.ok(target.textContent.indexOf("왕실의") < target.textContent.indexOf("왕족"));
  assert.match(target.textContent, /왕족/);
  assert.doesNotMatch(target.textContent, /검증 보완|검증 연결/);
});

test("the reduced live royal payload keeps nested-table translations under Adjective in the summary DOM", () => {
  const previousDOMParser = globalThis.DOMParser;
  globalThis.DOMParser = DOMParser;
  let entry;
  try {
    entry = parseWiktionaryEntry(reducedLiveRoyalPayload());
  } finally {
    globalThis.DOMParser = previousDOMParser;
  }

  assert.deepEqual(entry.translations.map(({ term }) => term), ["왕의", "왕실의"]);
  const adjective = entry.definitionGroups.find((group) => group.partOfSpeech === "Adjective");
  assert.deepEqual(
    adjective.definitions[0].koreanTranslations.map(({ term }) => term),
    ["왕의", "왕실의"]
  );

  const document = new TestDocument();
  const target = document.createElement("div");
  const summary = renderMeaningSummary(target, entry, findVerifiedSupplements("royal"));

  assert.equal(summary.groupCount, 2);
  assert.equal(summary.meaningCount, 3);
  assert.deepEqual(target.querySelectorAll("h3").map((heading) => heading.textContent), [
    "형용사 · Adjective",
    "명사 · Noun"
  ]);
  assert.ok(target.textContent.indexOf("왕의") < target.textContent.indexOf("왕실의"));
  assert.ok(target.textContent.indexOf("왕실의") < target.textContent.indexOf("왕족"));
  assert.equal(target.querySelectorAll("section").some(
    (section) => section.attributes.get("aria-label") === "뜻"
  ), false);
});

test("the hard fixture restores three adjective meanings without reviving the rejected verb supplement", () => {
  const previousDOMParser = globalThis.DOMParser;
  globalThis.DOMParser = DOMParser;
  let entry;
  try {
    entry = parseWiktionaryEntry(reducedLiveHardPayload());
  } finally {
    globalThis.DOMParser = previousDOMParser;
  }

  const groups = buildMeaningSummaryGroups(entry, findVerifiedSupplements("hard"));
  assert.deepEqual(groups.map((group) => ({
    partOfSpeech: group.partOfSpeech,
    meanings: group.meanings.map(({ term }) => term)
  })), [{
    partOfSpeech: "Adjective",
    meanings: ["딱딱하다", "단단하다", "어렵다"]
  }]);
  assert.deepEqual(findVerifiedSupplements("hard"), []);
  assert.deepEqual(findVerifiedSupplements("굳히다"), []);

  const document = new TestDocument();
  const target = document.createElement("div");
  const summary = renderMeaningSummary(target, entry, findVerifiedSupplements("hard"));
  assert.equal(summary.meaningCount, 3);
  assert.deepEqual(target.querySelectorAll("h3").map((heading) => heading.textContent), [
    "형용사 · Adjective"
  ]);
  assert.match(target.textContent, /딱딱하다/);
  assert.match(target.textContent, /단단하다/);
  assert.match(target.textContent, /어렵다/);
  assert.doesNotMatch(target.textContent, /굳히다|동사 · Verb/);
});

test("a flat translation stays unclassified when two parts of speech match ambiguously", () => {
  const groups = buildMeaningSummaryGroups({
    language: "en",
    translations: [{ term: "후보", sense: "a shared meaning" }],
    definitionGroups: [
      { partOfSpeech: "Noun", koreanLabel: "명사", definitions: [{ text: "A shared meaning." }] },
      { partOfSpeech: "Verb", koreanLabel: "동사", definitions: [{ text: "A shared meaning." }] }
    ]
  });

  assert.deepEqual(groups.map((group) => ({
    partOfSpeech: group.partOfSpeech,
    meanings: group.meanings.map((meaning) => meaning.term)
  })), [{ partOfSpeech: "", meanings: ["후보"] }]);
});

test("an assigned meaning suppresses unresolved summaries across repeated groups of the same part of speech", () => {
  const groups = buildMeaningSummaryGroups({
    language: "en",
    translations: [{ term: "확정", sense: "matched meaning" }],
    definitionGroups: [
      {
        partOfSpeech: "Adjective",
        koreanLabel: "형용사",
        definitions: [{ koreanTranslations: [] }],
        summaryKoreanTranslations: [{ term: "미배정", sense: "unmatched meaning" }]
      },
      {
        partOfSpeech: "Adjective",
        koreanLabel: "형용사",
        definitions: [{
          koreanTranslations: [{ term: "확정", sense: "matched meaning" }]
        }],
        summaryKoreanTranslations: []
      }
    ]
  });

  assert.deepEqual(groups.map((group) => group.meanings.map(({ term }) => term)), [["확정"]]);
});

test("a supplement-only Korean reverse search shows its linked English word instead of repeating itself", () => {
  const document = new TestDocument();
  const target = document.createElement("div");
  const entry = { language: "ko", translations: [], definitionGroups: [] };
  const summary = renderMeaningSummary(target, entry, findVerifiedSupplements("왕족"));

  assert.equal(summary.title, "연결된 영어 뜻");
  assert.equal(summary.meaningCount, 1);
  assert.match(target.textContent, /명사 · noun/);
  assert.match(target.textContent, /royal/);
  assert.doesNotMatch(target.textContent, /검증 보완|검증 연결/);
  assert.doesNotMatch(target.textContent, /왕족/);
});

test("ordinary English and Korean searches keep their existing summary behavior", () => {
  const document = new TestDocument();
  const target = document.createElement("div");
  const english = renderMeaningSummary(target, {
    language: "en",
    translations: [{ term: "안녕", sense: "greeting" }],
    definitionGroups: []
  });
  assert.equal(english.title, "한국어 뜻");
  assert.equal(english.meaningCount, 1);
  assert.match(target.textContent, /안녕greeting/);

  const korean = renderMeaningSummary(target, {
    language: "ko",
    translations: [],
    definitionGroups: []
  });
  assert.equal(korean.title, "연결된 영어 뜻");
  assert.equal(korean.meaningCount, 0);
  assert.equal(target.childElementCount, 0);
});

test("the supplement renderer keeps a concise definition and collapsed source details", () => {
  const document = new TestDocument();
  const target = document.createElement("div");

  assert.equal(renderVerifiedSupplements(target, "royal"), 1);
  assert.doesNotMatch(target.textContent, /royal의 명사 뜻/);
  assert.doesNotMatch(target.textContent, /royal\s*↔\s*왕족/);
  assert.match(target.textContent, /임금과 같은 집안인 사람/);
  assert.doesNotMatch(target.textContent, /몰락한 왕족|왕족 출신|왕족의 가문/);
  assert.match(target.textContent, /출처 보기/);
  assert.match(target.textContent, /한국어기초사전/);
  assert.match(target.textContent, /CC BY-SA 2.0 KR/);
  assert.match(target.textContent, /CC BY-SA 4.0/);
  assert.doesNotMatch(target.textContent, /자동 선별|신뢰도|사람 검수 전|한국어기초사전 예문|Wiktionary 원뜻 예문|위 뜻의 출처와 예문/);

  const section = target.children[0];
  assert.equal(section.className, "verified-supplements-section");
  assert.equal(section.attributes.get("aria-label"), "뜻 설명과 출처");
  const details = target.querySelectorAll("details");
  assert.equal(details.length, 1);
  assert.equal(details[0].attributes.has("open"), false);
  assert.equal(target.querySelectorAll("summary")[0].textContent, "출처 보기");

  const links = [...target.querySelectorAll("a")].map((link) => link.href);
  assert.equal(
    links.includes("https://krdict.korean.go.kr/eng/dicSearch/SearchView?ParaWordNo=68298&nation=eng&nationCode=6"),
    true
  );
  assert.equal(links.includes("https://creativecommons.org/licenses/by-sa/2.0/kr/"), true);
  assert.equal(links.includes("https://en.wiktionary.org/wiki/royal"), true);
  assert.equal(links.includes("https://creativecommons.org/licenses/by-sa/4.0/"), true);
  assert.equal(target.querySelectorAll("h3").length, 0);

  assert.equal(renderVerifiedSupplements(target, "hello"), 0);
  assert.equal(target.childElementCount, 0);
});

test("verified supplements are nested inside the single Korean meanings section", () => {
  const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  const koreanMeaningsStart = html.indexOf('<section id="translation-section"');
  const supplements = html.indexOf('<div id="verified-supplements">', koreanMeaningsStart);
  const koreanMeaningsEnd = html.indexOf("</section>", supplements);
  const englishDefinitions = html.indexOf('<section id="definitions-section"', koreanMeaningsEnd);

  assert.notEqual(koreanMeaningsStart, -1);
  assert.ok(supplements > koreanMeaningsStart);
  assert.ok(koreanMeaningsEnd > supplements);
  assert.ok(englishDefinitions > koreanMeaningsEnd);
  assert.match(html, /사전 자료:/);
  assert.doesNotMatch(html, /자동 선별|신뢰도|사람 검수 전/);
});

test("public supplement code contains no internal automatic grading payload or review-report labels", () => {
  const source = readFileSync(new URL("../public/verified-supplements.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /confidenceTier|numericScore|automatedConfidenceLabel|humanReviewed|reasonCodes/);
  assert.doesNotMatch(source, /자동 선별|신뢰도|사람 검수 전|한국어기초사전 예문|Wiktionary 원뜻 예문|위 뜻의 출처와 예문/);
  assert.doesNotMatch(source, /is-verified/);
});
