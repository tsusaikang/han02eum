# AI 영한 의미 연결 파일럿 보고서

초판 실행일: 2026-08-23 (KST)
v3 실패 종결 갱신일: 2026-08-24 (KST)

## 결론

`Wiktionary 영어 의미 → 한국어기초사전 한국어 의미`를 AI가 후보 안에서 자동 연결하는 방식은 기술적으로 실행 가능했고, 목표 사례인 `royal` 명사에서 `왕족`을 찾고 승인했다.

그러나 현재의 같은 모델 2회 합의만으로는 운영 사전에 자동 공개할 정도의 정확성을 확보하지 못했다. AI가 승인한 19건을 서로 결과를 보지 않은 두 독립 AI 감사가 다시 검토했을 때, 엄격한 `exact`는 각각 7건과 6건뿐이었다. 따라서 이번 결과는 운영 데이터에 병합하지 않는다.

2026-08-24 후속 v3는 다른 모델의 blind verifier와 3축 provider contract를 기술적으로 완주했지만, 고정 양성 대조군에서 두 모델이 갈려 canonical 평가에 들어갈 사전 자격을 얻지 못했다. v3는 **provider contract 성공·canonical evaluation admission/readiness 실패·gate 미실행**으로 종결했다. 과거 provider 스키마 오류 상태의 7행 partial 실행은 존재하지만 수정된 canonical attempt2 7행과 동일 100건은 실행하지 않았다. 아래 `v3-failure-close/v1` 부록이 현재 결론이다.

## 실행 계약

- 후보 원천: 한국어기초사전 2026-08-19 전체 JSON
- 후보 검색 대상: Wiktionary에서 한국어 번역이 명확히 비어 있는 의미
- 표본: 단어별 라운드로빈 100개 의미, 99개 단어
- 판정 모델: Cloudflare Workers AI `@cf/openai/gpt-oss-20b`
- 프롬프트 계약: `bilingual-equivalence/v2`
- 판정 방식: 일반 동등성 판단 1회 + 반대 사례 탐색 1회
- 승인 조건: 두 판단이 같은 후보를 양방향 `exact`로 선택하고 의미 유형·사용역·분야 일치에 동의
- 실행 경로: 127.0.0.1 전용 임시 Worker의 Workers AI binding

## 실행 결과

- 전체: 100건
- AI 승인: 19건
- 미승인: 81건
- 오류: 0건
- 두 판단의 후보 또는 관계 불일치: 14건
- 입력 토큰: 218,178
- 출력 토큰: 33,091
- 합계: 251,269 토큰
- 결과 SHA-256: `f05e44aeecf5fc43a2b6761ff2f807aa87806eae682418db47a9d2b2999eb4da`

사전 확인 2건까지 합친 실제 호출량은 입력 222,286, 출력 33,697, 합계 255,983 토큰이다. 2026-08-23 공개 단가로 환산한 이 실행 자체의 이론상 비용은 약 0.055달러, 약 4,961 Neurons다. 같은 계정의 다른 당일 사용량과 실제 청구 여부는 Cloudflare 대시보드에서만 확정할 수 있다.

## `royal` 결과

- 선박 돛대 관련 형용사 의미: 적합한 후보가 없어 두 판단 모두 미승인
- 명사 `A royal person; a member of a royal family.`: 두 판단 모두 `왕족`을 `exact`로 승인
- 한국어기초사전 대상: `왕족`, entry ID `68298`, `임금과 같은 집안인 사람.`

핵심 개념 연결은 성공했다. 다만 독립 감사 중 하나는 영어의 `somewhat informal, often capitalised` 사용역이 한국어 표제어에 그대로 대응하지 않는다는 이유로 엄격한 계약상 `near`로 분류했다. 이는 뜻의 연결과 사용역 표시를 별도 필드로 다루어야 함을 보여준다.

## 독립 AI 감사

AI 승인 19건을 두 감사자가 서로의 결론을 보지 않고 전수 검토했다.

| 판정 | 감사 A | 감사 B |
| --- | ---: | ---: |
| exact | 7 | 6 |
| near | 9 | 11 |
| false | 3 | 2 |

두 감사자가 모두 `exact`로 본 6건은 `right → 시정하다`, `figure → 숫자`, `interest → 관심사`, `bright → 광명하다`, `round → 옹글다`, `face → 면하다`다. AI가 승인한 19건 중 엄격한 합의 exact 비율은 31.6%다. 이는 사람 정답표로 측정한 최종 정확도가 아니라, 현재 자동 승인 규칙이 지나치게 느슨하다는 위험 신호다.

두 감사자가 모두 명백한 오연결로 본 사례:

- `line! → 그렇지`: 배우가 잊은 대사를 알려 달라고 요청하는 말과, 잊었던 것이 생각났을 때의 감탄사를 혼동
- `fast → 고정불변하다`: 밧줄처럼 물리적으로 고정된 상태와 시간에 따라 변하지 않는 상태를 혼동

감사자 사이에서도 `fair → 청순하다`는 `false`와 `near`, `pitch → 진`은 `exact`와 `near`, `royal → 왕족`은 `exact`와 `near`로 갈렸다. 즉 경계 정의 자체도 운영 정책으로 더 명확히 정해야 한다.

## 반복된 실패 유형

- 정의 일부의 공통 단어만 보고 양방향 동치로 승격
- 상위·하위 개념과 더 넓거나 좁은 뜻 범위를 무시
- 실제 예문에서 한국어 후보가 같은 의미로 쓰이는지 확인하지 않음
- 물리적 상태와 추상적 상태, 요청과 기억 회복처럼 사건 유형을 혼동
- 구어·고어·전문 분야·대문자 표기 같은 사용역을 사실상 무시
- 같은 모델의 두 판단이 비슷한 근거를 반복해 오류가 독립적으로 걸러지지 않음

## 운영 판단과 다음 실험

1. 현재 `ai-approved` 결과는 운영 화면과 API에 병합하지 않는다.
2. 의미 동치, 사용역 일치, 예문 대입 가능성을 서로 다른 판정 축으로 분리한다.
3. 두 번째 판정은 같은 모델의 변형 프롬프트가 아니라 다른 모델 또는 별도 규칙 기반 검증기로 독립성을 높인다.
4. `line`, `fast`, `screen`, `play`, `light`, `royal`을 고정 반례셋에 넣고 프롬프트나 판정 규칙이 바뀔 때마다 회귀 검사한다.
5. 전체 항목을 사람이 승인하는 방식은 두지 않더라도, 자동 공개 전 무작위 표본 감사와 허용 오승인률 게이트는 필요하다.

## 재현 산출물

다음 파일은 대용량 원천·실행 결과이므로 Git에서 제외된 `.local/`에 있다.

- 후보: `.local/pilot/mapping-candidates.jsonl`
- 100건 판정: `.local/pilot/ai-decisions.jsonl`
- 판정 manifest: `.local/pilot/ai-decisions.jsonl.manifest.json`
- 요약: `.local/pilot/ai-summary.json`
- `royal` 명사 사전 확인: `.local/pilot/ai-decisions.royal-noun-smoke.jsonl`

## 2026-08-24 v3 종결: provider contract 성공·canonical evaluation admission/readiness 실패·gate 미실행 (`v3-failure-close/v1`)

### 범위와 최종 판정

v3는 v2의 같은 모델 2회 호출을 다음 계약으로 교체했다.

- primary `@cf/openai/gpt-oss-20b`와 다른 모델 계열의 blind verifier `@cf/qwen/qwen3-30b-a3b-fp8`를 사용한다. verifier에는 primary 결론·근거·점수·v2 결과·회귀 기대값을 전달하지 않는다.
- 의미 동치는 target 기준 `exact`·`target-narrower`·`target-broader`·`overlap`·`disjoint`·`insufficient`, 사용역은 register·domain·temporal·regional·capitalization, 예문은 적용 가능성과 실제 sense 입증 여부로 분리한다.
- 규칙 기반 검증은 후보 밖 ID, 품사·스키마·관계 방향·모델/입력 provenance 불일치, 사용 불가능하거나 미검사인 예문, 오류·거절·잘린 응답을 차단하는 deterministic veto-only다. 모델의 non-exact·conflict·unknown·example fail을 승인으로 승격하지 않는다.
- `royal` 양성 1행, 항해 `royal` 음성 1행, `line`·`fast`·`screen`·`play`·`light` known-negative 5행을 고정한 7행 fixture와, v2와 순서까지 같은 100행 fixture를 SHA로 고정했다. ordered source ID SHA-256은 각각 `94c3d4179190dafb150ef33447adbd72418756c9aa19468f139f92e60dbfa137`, `b3b07e21cf31d973ee871b3156830c57e2b475bd422633677db8f34fb057e40c`이고 candidate input SHA-256은 `9aeb8c8a3e08dfea50a1b4dcfa500fac051c2533916dbf2217d281a14e74f90c`다.
- output·manifest·completion marker, source/candidate·call graph·provider provenance·gate 원천 재계산, 기존/부분 출력 덮어쓰기 차단, lock/partial 원자 선점과 불변 증거 pre/post seal을 구현했다.

최신 전체 로컬 검증은 Node 170/170, Worker 3/3, `npm run check`, `git diff --check` 통과다. attempt2 실행 증거의 독립 무결성 감사도 P0/P1 없이 `GO`였다. 그러나 언어·방법론 감사까지 합친 canonical evaluation admission/readiness는 P1 `NO-GO`, 동일 100건도 `NO-GO`다. 따라서 v3 provider 계약은 성공했지만 수정된 canonical attempt2 7행 bundle이 없어 gate는 실행되지 않았다. gate가 실행돼 실패한 것으로 해석하면 안 된다.

### 실제 실행 이력

| 실행 | 실제 호출과 응답 | 결과 | 보고 사용량 | 공개 단가 환산 |
| --- | --- | --- | ---: | ---: |
| 첫 counterexample 실행 | GPT primary 7회 HTTP 200 `choices`, Qwen 0회 | 7행 모두 `semantic:unexpected_rule`로 strict schema fail-closed; 오류 7건 partial | 7,086 tokens | `$0.001657100` |
| contract smoke attempt1 | GPT primary 1회 HTTP 502, Qwen 1회 HTTP 200 `choices` | primary assessment 없음; Qwen은 semantic `overlap`, register·capitalization `conflict`, domain·temporal `match`, regional `unknown`, example `fail`; 전체 `failed` | Qwen reported 1,867 tokens, primary usage 미보고 | Qwen `$0.000311341`, primary 불명 |
| contract smoke attempt2 | GPT primary와 Qwen 각 1회, 정확히 2 POST 모두 HTTP 200 `choices` | 두 strict 3축 assessment와 provenance를 가진 non-gating `completed`; approval `null` | 3,547 tokens | 약 `$0.000703` |

attempt2의 모델별 결론은 다음과 같다.

- primary: semantic `exact`, usage 전 축 `match`, example `pass`; 입력 1,182·출력 281·합계 1,463 tokens, `$0.000320700`.
- Qwen: semantic `target-narrower`, register `source-only-preservable`, domain·temporal·regional `unknown`, capitalization `conflict`, example `fail`; 입력 1,112·출력 972·합계 2,084 tokens, `$0.000382332`.

v3 실제 inference는 총 11회다. reported attempt는 10회, unreported attempt는 attempt1 primary HTTP 502 한 번이다.

| provider | 실제 attempt | reported / unreported | reported 입력 / 출력 / 합계 tokens | known reported 비용 |
| --- | ---: | ---: | ---: | ---: |
| GPT `@cf/openai/gpt-oss-20b` | 9 | 8 / 1 | 5,869 / 2,680 / 8,549 | `$0.001977800` |
| Qwen `@cf/qwen/qwen3-30b-a3b-fp8` | 2 | 2 / 0 | 2,218 / 1,733 / 3,951 | `$0.000693673` |
| 합계 | 11 | 10 / 1 | 8,087 / 4,413 / 12,500 | `$0.002671473` |

비용은 2026-08-24 공개 단가로 **사용량이 보고된 호출만** 환산한 값이며 약 242.86 Neurons다. usage가 미보고된 primary 502의 토큰·비용은 알 수 없다. 당일 무료 할당 잔여와 계정 상태를 확인하지 않았으므로 실제 추가 청구액도 확정하지 않는다.

### 실행 증거와 봉인 상태

- 첫 partial output SHA-256: `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`
- 첫 partial manifest SHA-256: `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`
- 첫 partial completion marker SHA-256: `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`
- smoke attempt1 audit SHA-256: `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`
- smoke attempt2 audit `.local/pilot/ai-contract-smoke-v3-attempt2.json` SHA-256: `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`

attempt2 audit은 exact model/family/endpoint/response shape, 모델당 1회·총 2회, reported 2/unreported 0, failure·safe category 0, canonical/gate/publication eligibility `false`, approval `null`을 보존한다. 독립 감사에서 token·Authorization·private reasoning 누출이 없고 기존 네 증거가 실행 전후 같은 regular file·non-symlink·`nlink=1`·canonical realpath·SHA임을 재확인했다. 정상 commit 뒤 smoke lock/partial은 없고, 중계기 종료 뒤 8791 listener도 없다.

수정된 canonical attempt2 7행 output·manifest·marker·gate·summary는 없으며, 동일 100건의 v3 output·manifest·marker·summary·comparison도 없다. 이와 별개로 과거 스키마 오류 7행 partial output·manifest·marker는 불변 실패 증거로 존재한다. 그 partial의 known-negative escape 0/5는 오류 7건과 verifier 0회인 실행이라 gate 통과나 재평가 완료로 해석하지 않는다.

### `royal → 왕족` 언어·방법론 감사

현 positive gold의 semantic `exact`는 방어 가능하며 유지한다. source “A royal person; a member of a royal family.”와 target “임금과 같은 집안인 사람 / A person in the king's family.”는 모두 사람·왕가 구성원을 가리킨다. 독립 언어 감사의 축별 결론은 semantic `exact`, register·capitalization `source-only-preservable`, domain·temporal·regional `unknown`, example `pass`다.

Qwen의 `target-narrower`와 example `fail` 근거는 `The Royals`라는 문법적 복수를 별도 집단 lexical sense로 오인하고, 제공된 target 예문 목록이 모든 문맥을 열거하지 않는다는 사실을 target 정의 범위의 한계로 오인한 정황이 강하다. 한국어에는 대소문자가 없으므로 source의 `often capitalised`는 target `conflict`가 아니라 source 쪽에 보존할 표시다. primary의 semantic `exact`와 example `pass`는 더 타당하지만, target에 사용역 metadata가 없는 상태에서 usage 전 축을 `match`로 확정한 것도 근거보다 강하다.

smoke와 canonical 7행의 `royal` request body는 byte-equivalent다.

- primary request SHA-256: `e412058e81ffe18e834e767e1874fdb31fc65f5926428a48f10ace4e70907360`
- verifier request SHA-256: `2c53477aa058766d4eadcbdb3c1195008e37bb55f0d978e1c52214e6fac392a1`

temperature 0과 고정 seed도 이미 사용한다. 같은 요청을 다시 실행해 기대 gold로 바뀐 결과만 채택하면 sequential cherry-picking이다. 결과가 뒤집혀도 gate 통과가 아니라 재현성 실패가 하나 더 확인된 것이다. 현재 Qwen 결과에 맞춰 gold를 완화하거나, `royal`에 동의하는 verifier를 찾는 model shopping도 하지 않는다.

고정 7행은 정밀도 추정용 benchmark가 아니라 알려진 회귀를 막는 fail-closed gate 계약이었다. gate는 정확한 7행·순서·source/candidate, 오류 0, 모든 행의 primary·verifier assessment 존재를 먼저 요구하고, 단순한 음성 승인 escape 0 외에 아래 case별 축 기대를 **두 모델 각각**에 적용한다.

| 사례 | 양 모델 의미 관계 기대 | 양 모델 사용역 기대 | 양 모델 예문 기대 | 상태 기대 |
| --- | --- | --- | --- | --- |
| `royal → 왕족` 양성 | 각각 `exact` | 각각 register·capitalization `source-only-preservable` | 모든 usable ID를 평가하고 각각 `pass` | `ai-approved` |
| 항해 `royal` 음성 | 각각 `exact` 금지 | 각각 domain `source-only-preservable` | 모든 usable ID를 평가하고 `insufficient` 금지 | 승인 금지 |
| `line → 그렇지` | 각각 `exact` 금지 | 각각 domain `source-only-preservable` | usable 0건, 각각 `insufficient`, 평가 ID `[]` | 승인 금지 |
| `fast → 고정불변하다` | 각각 `exact` 금지 | 각각 temporal `source-only-preservable` | 모든 usable ID를 평가하고 `insufficient` 금지 | 승인 금지 |
| `screen → 방충망` | 각각 `target-narrower` | 별도 보존 차원 없음 | 모든 usable ID를 평가하고 `insufficient` 금지 | 승인 금지 |
| `play → 경기하다` | 각각 `target-narrower` | 별도 보존 차원 없음 | usable 0건, 각각 `insufficient`, 평가 ID `[]` | 승인 금지 |
| `light → 밝히다` | 각각 `target-broader` | 별도 보존 차원 없음 | 모든 usable ID를 평가하고 `insufficient` 금지 | 승인 금지 |

attempt2 smoke의 동일 verifier 요청이 양성 행의 relation·usage·example 기대를 이미 위반했으므로 canonical evaluation admission/readiness가 `NO-GO`였다. 수정된 canonical attempt2 7행 bundle이 없으므로 gate는 실행되지 않았다. 같은 100건은 gate 통과 뒤에만 허용되는 계약이어서 실행하지 않았고, 사람 정답표도 없어 precision·정확도·오승인률을 주장하지 않는다.

### 종결 결정과 다음 선택지

권장안은 v3를 이 상태로 실패 종결하고 별도 v4를 시작하는 것이다.

1. 기존 7행은 개발용 회귀셋으로 보존하되, 여러 positive와 negative를 포함한 별도 held-out gold를 결과를 보지 않은 두 독립 adjudicator가 확정한다.
2. 문법적 복수와 lexical group sense, 예문 목록의 비포괄성과 실제 적용 가능성, 영어 capitalization과 한국어 비대문자 체계, target 증거 부재 때 `unknown`·`source-only-preservable` 처리 규칙을 일반 규칙으로 사전 등록한다.
3. verifier와 veto-only rule layer, 반복 횟수·집계·실패 조건을 held-out 결과와 무관하게 먼저 고정하고 모든 반복을 보존한다.
4. held-out positive 요구 충족·negative escape 0·오류 0 뒤에만 동일 100건을 정확히 1회 실행한다. 7행이 100건의 부분집합이므로 100 bundle 안의 겹치는 행도 post-run 재검사하고 하나라도 회귀하면 전체 평가를 실패 처리한다.
5. 동일 100건에서는 승인 변화·모델 합의·축별 불일치·known-negative escape·비용만 보고하고 precision을 주장하지 않는다.

조건부 대안으로 검토할 수 있는 것은 항해 `royal`과 `line`·`fast`·`screen`·`play`·`light` 여섯 음성 사례만의 별도 진단이다. 그러나 이는 **현재 미구현이며 실행 금지**다. 기존 canonical 7 fixture·`pilot:judge:v3:counterexamples:attempt2` 명령·attempt2 output 경로를 재사용해서는 안 된다. 별도의 versioned six-negative fixture와 충돌하지 않는 전용 output, 최대 12-call(6행 × primary/verifier 각 1회), permanent non-gating·100건 진입 불가 계약을 먼저 구현하고 로컬 검증·독립 감사를 통과한 뒤, 사용자의 명시적 실행 승인을 받아야만 실행할 수 있다. 이미 본 `royal` positive는 재호출하지 않는다.

이번 후속 단계에서 Git commit·push, GitHub 상태 변경, Cloudflare 운영 배포, 운영 UI/API 병합은 수행하지 않았다.

## 부록: 2026-08-24 v4 packet v2 설계·held-out admission 상태

### 결론과 범위

기존 v3 실패 종결과 packet v1 `NO-GO`를 그대로 보존한 채, fresh packet v2의 설계·독립 E/F adjudication·exact consensus·gold 파생·tamper-fail-closed gate 구현·fresh 독립 결과 감사까지 완료했다. 최종 상태는 **methodology audit `GO` + exact held-out consensus/admission 통과 + independent result audit v3 `GO`**다.

이 결과는 미래 provider held-out gate를 실행하거나 통과했다는 뜻이 아니다. 10 cases × 2 models × 3 repetitions의 60-attempt provider gate는 미실행이고 `heldoutGatePassed=false`다. `providerCallsAuthorized=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`도 그대로다.

### freshness, consensus, gold

- 기존 v3 7건·동일 100건·packet v1 10건의 exact source ID sorted-unique 합집합은 110개이고 LF SHA-256은 `690acc1c022ce319618bacfda210486014e188f3ae94fc5ef49cca014a35d71c`다. fresh packet v2의 중복 없는 10 source IDs와 이 합집합의 overlap은 0이다.
- methodology audit v3는 `GO`, P0=0/P1=0이다. 파일은 `pilot/evaluation/v4/heldout-packet-methodology-audit-v3.json`, SHA-256은 `70c19640f97f60ede0c44b630fd4d2c46d4e19db245125a5e7115e89fa3924d8`다.
- 서로 blind한 E/F가 exact five-file read-list만 사용해 만든 ordered normative core는 각각 4,672 bytes이고, SHA-256 `c160a61001fbc07ba9cd28d08b73ddc444debbfb71944a0954fda50135a74de3`로 직접 bytes까지 완전히 일치한다. 차이는 0건이다.
- semantic positive는 `v2-case-01`, `v2-case-03`, `v2-case-06`, `v2-case-08`, `v2-case-10`; semantic negative는 `v2-case-02`, `v2-case-04`, `v2-case-05`, `v2-case-07`, `v2-case-09`로 정확히 5/5다.
- `publicationEligible`은 0/10이다. usage `unknown`이 publication/final approval을 veto할 뿐 semantic-positive를 negative로 재분류하지 않는다.

### 확정된 판정 규칙

- 문법적 복수는 정의가 같은 singular member sense를 자동으로 lexical collective/group sense로 바꾸지 않는다. 정의가 별도 집단 referent를 가리킬 때만 집단 의미다.
- source/target 예문 목록은 비배타적이다. 같은 collocation의 부재만으로 `fail`·`insufficient`를 만들지 않고, usable source 예문 전체와 target sense 입증·구체적 반례를 본다.
- 한국어 target에는 영어 capitalization을 직접 적용하지 않는다. source sense-level qualifier/label에 명시 증거가 있으면 `source-only-preservable`, 없으면 `unknown`이다. 문장 첫 글자, 인용명, 고유명 예문의 대문자는 sense usage 증거가 아니다.
- 명시된 source-only register/domain/temporal/regional restriction은 보존하되 semantic non-exact를 exact로 올리지 않는다. target metadata 부재를 `match`로 추정하지 않는다.
- deterministic layer는 veto-only다. negative/non-exact/example fail·insufficient/usage unknown·conflict/approval false를 positive/exact/pass/match/true로 승격하거나 교정하지 않는다.

### 초기 result audit `NO-GO`와 v3 수정

초기 `pilot/evaluation/v4/heldout-independent-result-audit-v2.json`은 `NO-GO`, P0=0/P1=1이었다. P1-001은 gate가 caller-supplied ordered core와 gold를 기대 정답으로 받아, sealed semantic-negative `v2-case-02`의 gold만 positive·publication-eligible로 바꾸면 negative true approval 6건이 있어도 60-attempt gate가 통과하고 escape 0으로 보고될 수 있다는 결함이었다. P2-001은 missing 1건·unexpected 1건일 때 실제 평가 59건을 match 60건으로 과대 계산하는 문제였다.

v3 수정은 caller core/gold 입력을 거부하고 exact sealed evidence·consensus·gold·predecessor result seal의 raw/canonical SHA, case 순서·identity, 4,672-byte core를 검증한다. semantic gold와 publication eligibility는 gate 내부에서 sealed consensus/evidence로 재파생하며 sealed gold는 exact reference로만 사용한다. caller 주입, negative true approval, publication forgery, case reorder·identity·core·gold·seal tamper는 모두 fail-closed하고 match count는 실제 평가한 expected IDs만 센다.

- result seal v3: `pilot/evaluation/v4/heldout-result-seal-v3.json` — SHA-256 `8f2c2ad2e0758cd06f87e9c95d9091de65a0c057cb88c764b0d39ce7e3815d9f`
- 봉인 결합 테스트: v2+v3 45/45 통과(기존 v2 32 + v3 수정 13)
- v3 단독 테스트: 13/13 통과
- fresh result audit v3: `pilot/evaluation/v4/heldout-independent-result-audit-v3.json` — `GO`, P0=0/P1=0, SHA-256 `4c2e29b2cbf59db0b327a08454b7cad969f94cae820afee6b0e1f85df30293d4`

이 테스트 수치는 봉인된 result seal과 독립 감사의 기존 검증 기록이다. 이 보고서 부록 작성 중에는 테스트나 provider를 다시 실행하지 않았다.

### v3 불변 증거 7/7

- `pilot/evaluation/ai-mapping-counterexamples-v1.json` — `b2e9cd43776013b93e6e597bfb9e07b66fab308853b6be9618241d2f97a44360`
- `pilot/evaluation/ai-mapping-sample-100-v1.json` — `97229dcbbc23583e42fddef953178e1720dc37b4d27e74a887a5243c8c157c9b`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl` — `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json` — `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json.complete.json` — `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`
- `.local/pilot/ai-contract-smoke-v3-attempt1.json` — `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`
- `.local/pilot/ai-contract-smoke-v3-attempt2.json` — `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`

fresh result audit v3와 부록 작성 전 전체 SHA 재확인에서 7/7 모두 기존 기록과 일치했다.

### 주요 산출물과 현재 실행 경계

주요 설계·결과 파일은 `docs/AI_MAPPING_V4_PREREGISTRATION_V2.md`, `docs/AI_MAPPING_V4_HELDOUT_PACKET_V2_PREREGISTRATION.md`, `docs/AI_MAPPING_V4_HELDOUT_PACKET_V3_PREREGISTRATION.md`, `pilot/evaluation/v4/heldout-evidence-v2.json`, `pilot/evaluation/v4/heldout-packet-methodology-audit-v3.json`, `pilot/evaluation/v4/heldout-adjudication-form-E-v3.completed.json`, `pilot/evaluation/v4/heldout-adjudication-form-F-v3.completed.json`, `pilot/evaluation/v4/heldout-consensus-v2.json`, `pilot/evaluation/v4/heldout-gold-v2.json`, `pilot/evaluation/v4/heldout-independent-result-audit-v2.json`, `pilot/evaluation/v4/heldout-result-seal-v3.json`, `pilot/evaluation/v4/heldout-independent-result-audit-v3.json`이다. 수정된 gate는 `scripts/lib/v4/heldout-sealed-contract-v3.mjs`, `scripts/lib/v4/heldout-gate-v3.mjs`에 있고 검증은 `test/heldout-v4-v2.test.mjs`, `test/heldout-v4-v3.test.mjs`에 봉인됐다.

이번 packet v2 설계·E/F adjudication·consensus/gold·result-audit 단계의 provider 호출 0회, 프로젝트 AI 호출 0회, network 호출 0회, 기존 v3 7건 실행 0회, 동일 100건 실행 0회, Git push 0회, production deploy 0회다.

별도 범위 승인과 새 resealed gate transition 없이는 provider/프로젝트 AI, 60-attempt held-out gate, 기존 7건, 동일 100건을 호출·실행하지 않는다. sample 100에는 그 뒤에도 별도 v4 bundle contract 봉인과 별도 사용자 승인이 필요하다. push·deploy·publication/data write도 별도 명시 승인 전에는 수행하지 않는다.
