// Source recovery, checked directly in the Korean Wiktionary page on 2026-09-07.
// https://ko.wiktionary.org/wiki/tree#영어 (page last edited 2024-07-30 20:00).
// The downloaded Kaikki record contains only the later transitive-verb section.
// These two preceding English-section senses and the first sense's example are
// present in the source page. No noun heading labels them, so POS stays unknown.
// Keep the original extract and its verb entry unchanged.
export const NATIVE_ENGLISH_KO_CORRECTIONS = {
  tree: [{
    id: 'kowiktionary:tree:source-recovery-20260907',
    word: 'tree',
    pos: 'unknown',
    senses: [{
      id: 'kowiktionary:tree:source-recovery-20260907:sense-1',
      glosses: ['(식물) 나무.'],
      examples: [{
        text: 'Some trees are being grown in the back yard.',
        translation: '몇몇 나무들이 뒤뜰에서 자라는 중이다.'
      }]
    }, {
      id: 'kowiktionary:tree:source-recovery-20260907:sense-2',
      glosses: ['나뭇가지 구조, 계보.']
    }],
    sourceName: '한국어 위키낱말사전',
    sourceNote: '위키낱말사전 원문에서 확인한 뜻을 보완했습니다.',
    sourceUrl: 'https://ko.wiktionary.org/wiki/tree#영어',
    license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }
  }]
};
