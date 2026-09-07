"""Regression cases for observed source structures; requires the patched engine."""
from wiktextract.config import WiktionaryConfig
from wiktextract.wxr_context import WiktextractContext
from wiktextract.extractor.ko.page import parse_page
from wikitextprocessor import Wtp

cases = [
    ('ordinary-example-not-definition', '== 영어 ==\n# 실제 뜻\n:* 한국어 예문.', ['실제 뜻']),
    ('english-example-not-definition', '== 영어 ==\n#\n:* This is an example. 한국어 번역.', []),
    ('unlinked-orphan-gloss', '== 영어 ==\n#\n:*[[역습]], [[반격]]\n#\n:* 역습하다, 반격하다', ['역습, 반격', '역습하다, 반격하다']),
    ('slang-heading', '== 영어 ==\n# 수탉\n=== 속어 ===\n# 두목', ['수탉', '두목']),
    ('onomatopoeia-heading', '== 영어 ==\n=== 의성어 ===\n# 엉엉', ['엉엉']),
    ('orphan-gloss', '== 영어 ==\n=== 구 ===\n#\n:*[[설득력 ]] 있는', ['설득력 있는']),
    ('unequal-pos-heading', '== 영어 ==\n===고유 명사==\n#\n===명사===\n# 악마', ['악마']),

    ('bare-bold-number', "== 영어 ==\n=== 인명 ===\n'''1.''' 여자 이름.", ['여자 이름.']),
    ('mixed', '== 영어 ==\n# [[나무]].\n=== 동사 ===\n# 나무로 쫓다.', ['나무.', '나무로 쫓다.']),
    ('language-html', '== 스웨덴어 ==\n<p>닫히지 않음\n== 영어 ==\n=== 형용사 ===\n# [[나쁘다]].', ['나쁘다.']),
    ('local-html', '== 영어 ==\n=== 동사 ===\n<p class="legacy">어형\n# [[spin]]의 과거분사.', ['spin의 과거분사.']),
    ('legacy-ordinal', '== 영어 ==\n=== 동사 ===\n*1.[[bite]] 의 과거분사', ['bite 의 과거분사']),
    ('meaning-heading', '== 영어 ==\n=== 뜻 ===\n# [[학생]].', ['학생.']),
    ('compound-pos', '== 영어 ==\n=== 부사, 감탄사 ===\n# [[아니요]].', ['아니요.']),
    ('etymology-sense', '== 영어 ==\n=== 어원 1 ===\n# [[정책]].', ['정책.']),
    ('legacy-link', '== 영어 ==\n=== 명사 ===\n# {{연결|중독}}.', ['중독.']),
    ('comment-is-not-sense', '== 영어 ==\n# [[뜻]].\n<!-- == 영어 ==\n# 가짜 -->', ['뜻.']),
]
for name, text, expected in cases:
    context = WiktextractContext(Wtp(lang_code='ko'), WiktionaryConfig(dump_file_lang_code='ko', capture_language_codes={'en'}))
    try:
        rows = parse_page(context, name, text)
        found = [s['glosses'][-1] for r in rows for s in r.get('senses',[]) if s.get('glosses')]
        assert found == expected, (name, found, expected)
        assert not any(t.startswith('error') for r in rows for s in r.get('senses',[]) for t in s.get('tags',[]))
        print('PASS', name)
    finally:
        context.wtp.close_db_conn()

context = WiktextractContext(Wtp(lang_code='ko'), WiktionaryConfig(dump_file_lang_code='ko', capture_language_codes={'en'}))
try:
    rows = parse_page(context, 'metadata-only', '== 영어 ==\n{{IPA|/a/}}\n=== 알 수 없는 제목 ===\n')
    assert len(rows) == 1 and rows[0].get('sounds'), rows
    assert rows[0]['senses'] == [{'tags': ['no-gloss']}], rows
    print('PASS source metadata without a gloss is retained')
finally:
    context.wtp.close_db_conn()

context = WiktextractContext(Wtp(lang_code='ko'), WiktionaryConfig(dump_file_lang_code='ko', capture_language_codes={'en'}))
try:
    rows = parse_page(context, 'legacy-example', "== 영어 ==\n# 옆집\n:* {{예문|The person '''next door''' plays music.|옆집에서 음악을 튼다.}}")
    assert rows[0]['senses'][0]['examples'][0] == {'text':'The person next door plays music.', 'translation':'옆집에서 음악을 튼다.'}, rows
    rows = parse_page(context, 'form-source', '== 영어 ==\n=== 명사 ===\n# {{plural of|en|lemma}}\n=== 동사 ===\n# {{infl of|en|lemma||ed-form}}')
    assert [s['glosses'] for r in rows for s in r['senses']] == [['Plural of lemma'], ['Inflection of lemma (ed-form)']], rows
    assert all(s['form_of'] == [{'word':'lemma'}] for r in rows for s in r['senses']), rows
    print('PASS legacy example and explicit source form relations')
finally:
    context.wtp.close_db_conn()
