# 한영이음 사전 — 공식 프로젝트 상태

마지막 갱신: 2026-08-24 (KST)

## 현재 목표와 완료 조건

Wiktionary에 한국어 번역이 없는 영어 의미를 한국어기초사전의 기존 의미와 자동으로 연결하는 파일럿을 평가한다. 항목별 사람 승인은 두지 않고, 후보 검색과 AI 의미 판정을 오프라인 배치로 자동화한다.

이번 단계의 완료 조건:

- Wiktionary 결과를 품사·의미별로 나누고 한국어 번역 유무를 누수 없이 판정
- 한국어기초사전 전체 자료에서 영어 대역 의미 색인 생성
- 누락 의미마다 같은 품사의 한국어 후보를 자동 검색
- AI가 후보 안에서만 두 번 판정하고, 양방향 `exact` 합의만 승인하는 실패 안전 계약 구성
- 100개 단어에서 추출한 100개 의미 표본을 실제 모델로 평가하고 오승인·미승인·비용을 기록
- 운영 검색에 반영하기 전 출처 표시, 라이선스, 원천 변경 시 재검토 정책 확정

2026-08-24 v3 단계의 최종 상태는 **provider contract 성공·canonical evaluation admission/readiness 실패·gate 미실행**이다. 의미 동치·사용역·예문 적용 가능성을 분리하고 다른 모델의 blind verifier와 deterministic veto-only 규칙을 추가하는 구현·로컬 검증은 완료했다. 그러나 고정 양성 대조군 `royal → 왕족`의 동일 요청에서 primary와 Qwen이 갈렸고, 독립 언어·방법론 감사 결과 현 계약으로 수정된 canonical attempt2 7행을 실행할 자격은 `NO-GO`다. 과거 provider 스키마 오류 상태의 7행 partial 실행은 존재하지만 정상 canonical 재평가가 아니며, 수정된 canonical attempt2 7행과 동일 100건은 실행하지 않았다. 따라서 gate 입력 자체가 만들어지지 않아 gate를 실행하거나 통과·실패로 판정하지 않았다. 이 중단은 비용을 더 쓰지 않고 admission/readiness 경계를 지킨 실패 안전 결과다.

100개 의미의 실제 AI 호출과 독립 품질 감사까지 완료했다. `royal → 왕족` 연결에는 성공했지만, 승인 19건 중 두 독립 AI 감사자가 모두 엄격한 `exact`로 본 항목은 6건뿐이었다. 현재 자동 승인 규칙은 운영 반영 기준을 통과하지 못했다.

기존 v2 결과를 불변 기준선으로 둔 v3 원천 재계산형 bundle hardening은 완료됐고, 별도 담당자의 독립 재감사에서 `GO`를 받았다. 이 승인은 로컬 합성 검증과 실행 계약에 대한 것이다. 첫 실제 v3 counterexample 실행은 primary 7회까지 진행됐지만 provider 응답 스키마를 모두 fail-closed로 거부해 오류 7건의 partial bundle로 끝났고, verifier와 gate·summary·고정 100건은 실행하지 않았다.

보존된 partial bundle과 현행 코드의 독립 진단 뒤 provider 계약 수정은 로컬 구현·합성 검증까지 완료했다. prompt의 `requiredOutput`을 실제 `VERDICT_SCHEMA`와 재귀적으로 같은 구조로 통일하고 판단 규칙은 출력 JSON 밖의 `judgingRules` 문장으로 분리했다. 로컬 중계기는 외부 OpenAI식 `{name, strict, schema}` envelope를 검증한 뒤 native Workers AI binding에는 bare JSON Schema만 전달한다. 엄격한 로컬 추가 필드 거부는 완화하지 않았으며, parse·validation 오류에는 토큰을 제거한 최대 2,048 UTF-8 바이트 preview·원문 SHA-256·길이·잘림 여부만 private failure record로 보존한다.

후속 독립 NO-GO 검토에서 세 P1 계약 결함을 추가로 찾았다. 첫째, smoke가 AI 호출 전에 고정 출력 경로를 원자 선점하지 않아 충돌한 실행도 비용을 쓸 수 있었다. 둘째, 진단 preview가 malformed provider body나 sibling reasoning 필드로 우회할 여지가 있었다. 셋째, native bare schema 변환에서 검증한 schema name을 잃고 `{}` 같은 비제약 schema를 binding 전에 충분히 막지 못했다. 이제 smoke는 최종 output·`.lock`·`.partial` 존재를 호출 전 확인하고 `.lock`과 `.partial`을 `wx`로 선점하며, 기존 산출물이나 stale lock/partial이 있으면 자동 삭제하지 않고 0-call로 실패한다. 완료·provider 실패 audit은 partial `fsync` 뒤 배타 hard-link publish와 directory `fsync`로 commit하고 lock/partial을 정리한다. 진단 preview는 완료 신호가 검증된 `choices[0].message.content` 문자열 또는 명시적 completed `response` 문자열만 허용하고, 그 밖의 raw body·reasoning·tool·object 필드는 SHA와 길이만 남긴다. 중계기는 검증된 `name`을 native bare schema의 `title`로 보존하고 충돌 title과 최상위 비제약 object schema를 binding 호출 전에 거부한다.

후속 P1 수정의 독립 코드 검토 뒤 고정 `royal` 명사–`왕족` 한 쌍에 대한 비게이팅 2-call contract smoke attempt1을 token-only canonical 명령으로 정확히 1회 실행했다. 총 provider 호출은 2회였다. primary `@cf/openai/gpt-oss-20b`는 HTTP 502로 실패해 response shape와 3축 assessment가 없고 사용량도 1회 미보고다. blind verifier `@cf/qwen/qwen3-30b-a3b-fp8`는 HTTP 200 `choices`로 strict 3축 parse를 통과했으며 `krdict:68298:1` `왕족`을 의미 `overlap`, 사용역 register·capitalization `conflict`/domain·temporal `match`/regional `unknown`, 예문 `fail`로 판정했다. Qwen 보고 사용량은 입력 1,106, 출력 761, 합계 1,867 토큰이다. 전체 smoke는 primary 실패 때문에 `failed`이고 canonical 평가·gate·공개·승인 자격이 모두 없다. 실패 audit은 `.local/pilot/ai-contract-smoke-v3-attempt1.json`에 배타 commit했으며 SHA-256은 `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`다. 정상 commit 뒤 `.lock`과 `.partial`은 정리됐고 중계기를 Ctrl-C로 종료해 8791 포트 폐쇄를 확인했다. 인증·OTP 프롬프트는 없었다. attempt2 7행과 고정 100건은 차단 상태다.

attempt1의 generic 502만으로 native bare JSON Schema 지원 여부나 정확한 provider 원인을 확정할 수 없다는 후속 독립 진단에 따라, 새 attempt2 계약을 로컬 합성 검증까지 구현했다. primary는 `reasoning_effort: low`와 prompt 안의 완전한 `VERDICT_SCHEMA`·JSON-only 지시는 유지하되 `response_format`을 보내지 않는다. 중계기는 primary와 Qwen 모두의 `response_format`을 `env.AI.run` 전에 거부하고, 두 모델은 HTTP 상태와 무관하게 각각 최대 1회만 호출한다. provider 예외는 원문을 노출하지 않고 `json_mode_unmet`, `input_validation`, `rate_limited`, `timeout`, `unknown` 중 하나로만 분류해 runner/smoke private failure audit에 보존한다. 새 smoke output은 `.local/pilot/ai-contract-smoke-v3-attempt2.json`으로 고정했고 attempt1과 첫 counterexample partial 3파일은 그대로 보존했다. 최신 로컬 검증은 Node 150/150, Worker 3/3, `npm run check`, `git diff --check` 통과다. 이 수정 뒤 실제 AI 호출은 0회이며, 다음 단계는 구현자와 다른 담당자의 독립 코드 감사다. 감사 `GO` 전에는 2-call smoke attempt2, 7행, 100건을 실행하지 않는다.

attempt2 실행 전 독립 주감사는 보존 증거 drift 차단 부재를 P2로, 보조감사는 같은 비용·증거 경계를 P1로 보아 심각도 이견이 있었다. 낮은 등급으로 타협하지 않고 더 보수적인 계약으로 둘 다 닫았다. smoke는 어떤 output reservation이나 fetch보다 먼저 프로젝트 루트의 첫 counterexample partial output·manifest·completion marker와 smoke attempt1을 정확한 canonical path에서 읽고 코드에 고정한 네 SHA-256을 확인한다. 하나라도 missing·unreadable·drift이면 기존 파일을 쓰지 않고 0-call로 중단하며, production API는 path·reader·SHA override를 받지 않는다. 이 smoke가 해당 `.local` 증거를 가진 현재 고정 파일럿 전용이며 일반적인 portable smoke가 아니라는 점도 양 README에 명시했다. root README 실행 절차는 독립 코드 감사 → 2-call smoke → 결과 감사 → attempt2 7행 → gate → 독립 결과 감사 → 고정 100건으로 맞췄다. package의 연속 명령은 attempt2 7행 → gate → 100건 → 요약 → 비교의 전체 문자열과 `&&` fail-stop 순서를 테스트로 고정했으며 수동 감사 지점을 자동화하지 않는다고 명시했다. batch runner에는 safe category를 가진 mocked HTTP 502가 `record.failure`에 남고 `judge-error`, 승인 `null`, manifest·marker `partial`, completed bundle·gate 불가가 되는 회귀 테스트를 추가했다. 최신 검증은 Node 157/157, Worker 3/3, `npm run check`, `git diff --check` 통과다. 이 hardening에서 실제 AI·remote 호출은 0회이며, 다음 단계는 다시 구현자와 다른 담당자의 독립 코드 감사다.

그 독립 재감사가 제기한 attempt2 실행 API·filesystem 경합 P1/P2도 실제 호출 없이 폐쇄했다. production `runAiContractSmokeV3`는 token만 받고 module 초기화 때 고정한 real global fetch와 canonical attempt2 final·lock·partial을 내부 사용하므로 import caller가 mock response나 output/path/reader/SHA를 주입할 수 없다. test-only seam은 real temporary directory 아래로 격리되고 canonical final·lock·partial, lexical `..` alias, canonical parent realpath/symlink alias, dangling final·lock·partial symlink를 reservation/fetch 전에 차단한다. 보존 네 파일은 `lstat` 일반 파일·비symlink·`nlink==1`·exact realpath·open handle/path inode와 metadata·SHA를 호출 전 확인하고 두 모델 호출 뒤 commit 직전에 같은 snapshot인지 재확인한다. 동일 SHA·동일 바이트 교체도 데이터 의미와 별개로 실행 중 provenance identity가 바뀐 것이므로 fail-closed한다. post-call drift는 completed final 없이 비밀·raw provider 원문을 제외한 strict audit partial과 lock을 stale 증거로 남기고, 외부 final 생성 경합은 hard-link `EEXIST`로 final owner를 보존하면서 자신의 partial·lock을 남긴다. 둘 다 자동 삭제·재시도하지 않는다. 이 수정 시점의 로컬 검증은 Node 170/170, Worker 3/3, `npm run check`, `git diff --check` 통과이고 실제 AI·remote 호출은 0회였으며, 당시 다음 단계는 최종 독립 코드 감사였다.

2026-08-24 최종 독립 코드 감사 결과는 당시 clean CLI 사전조건을 전제로 한 `GO`였다. 당시 실행 계약은 AI 호출 전에 보존 네 파일의 exact SHA·일반 파일·비symlink·hard-link 수 1·canonical realpath를 확인하고, attempt2 smoke final·lock·partial과 attempt2 7행 산출물 부재, 8791 listener 부재, Node preload 및 HTTP(S)/ALL proxy 관련 환경변수 부재를 확인하도록 했다. 예상 밖 artifact·stale reservation·listener·환경변수가 하나라도 있으면 삭제·수정·우회·재시도하지 않고 0-call로 중단하고, 모든 조건이 clean일 때만 canonical 중계기를 직접 `Ready`까지 시작해 token-only canonical smoke attempt2를 정확히 1회 실행하며 모델당 최대 1회·총 2회 외 실제 AI 호출을 금지했다. 이 계약은 이미 완료된 smoke attempt2의 실행 이력이며, 닫힌 v3에서 7행·100건·gate·summary·comparison 또는 추가 AI 호출을 허가하는 현재 지침이 아니다.

위 clean CLI 조건을 모두 확인한 뒤 token-only canonical contract smoke attempt2를 정확히 1회 실행했다. 중계기 access log의 POST는 정확히 2회이고 둘 다 HTTP 200이며, primary와 blind Qwen은 각각 `choices` 응답을 1회씩 반환해 strict 3축 parse와 provider provenance를 통과했다. audit status는 `completed`, failure와 provider safe category는 0건이지만 non-gating이므로 canonical evaluation·gate·publication eligibility는 모두 `false`, approval은 `null`이다. 두 모델의 판단은 일치하지 않았다. primary는 `왕족`을 semantic `exact`, usage 전 축 `match`, example `pass`로 봤고 Qwen은 semantic `target-narrower`, usage register `source-only-preservable`·domain/temporal/regional `unknown`·capitalization `conflict`, example `fail`로 봤다. 보고 사용량은 primary 입력 1,182·출력 281·합계 1,463, Qwen 입력 1,112·출력 972·합계 2,084, 전체 입력 2,294·출력 1,253·합계 3,547 토큰이며 미보고 호출은 0회다. 최종 audit `.local/pilot/ai-contract-smoke-v3-attempt2.json`의 SHA-256은 `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`다. commit 뒤 lock/partial은 없고 프록시 Ctrl-C 뒤 8791 포트가 닫혔다. 기존 보존 네 파일은 실행 뒤에도 exact SHA·일반 파일·비symlink·`nlink==1`·canonical realpath가 그대로이며 attempt2 7행 산출물은 없다. 결과 독립 감사 전까지 7행·100건은 차단한다.

고정 반례 7건의 첫 실행 시도는 workerd가 `Ready`가 되기 전에 Worker 진입 모듈의 named primitive export를 entrypoint로 해석하지 못해 중단됐다. 이때 AI 호출은 0건이었고 v3 output·manifest·completion marker·summary는 생성되지 않았으며 8791 포트도 닫혔다. 진입 모듈을 default export 하나로 제한한 뒤 실제 AI request 없이 runtime `Ready` 시작 smoke와 즉시 종료를 확인했지만, 이는 7건 추론을 실행하거나 승인한 것이 아니다.

runtime 수정 뒤 정확한 token-only 명령으로 첫 실제 7행 실행을 수행했다. primary `@cf/openai/gpt-oss-20b` 요청 7회는 모두 HTTP 200과 `choices` 응답 형태를 반환했으나, 7행 모두 `ai_judge_invalid_schema:semantic:unexpected_rule`로 primary 단계에서 `judge-error`가 됐다. Qwen verifier 호출은 0회였고 의미·사용역·예문 assessment는 모두 `null`이다. 보고된 사용량은 입력 4,687, 출력 2,399, 합계 7,086 토큰이며 미보고 호출은 0회다. 결과는 7행·오류 7건의 committed partial bundle로 보존했고, 전용 gate·summary·100건은 실행하지 않았다. 중계기는 Ctrl-C로 종료했고 8791 포트가 닫힌 것을 확인했다.

attempt2 실행 증거에 대한 구현자와 다른 담당자의 최종 독립 감사는 artifact integrity `GO`이고 P0/P1 finding은 없다. exact SHA, 두 모델·endpoint·response shape, 모델당 1회·총 2회, reported 2/unreported 0 usage, strict 3축 parse, non-gating eligibility, failure 0, token 비노출, 기존 네 증거 불변, lock/partial 부재와 8791 listener 폐쇄를 원천에서 재검산했다. 다만 같은 감사와 별도 언어·방법론 감사의 canonical 7 readiness는 P1 `NO-GO`, 동일 100건도 `NO-GO`다.

`royal` 양성 gold의 semantic `exact`는 유지한다. source의 “A royal person; a member of a royal family.”와 target의 “임금과 같은 집안인 사람 / A person in the king's family.”는 사람·왕가 구성원이라는 사전 의미가 동치다. 독립 언어 감사는 register와 capitalization을 `source-only-preservable`, domain·temporal·regional을 증거 부족에 따른 `unknown`, example을 `pass`로 판단했다. Qwen의 `target-narrower`와 example `fail`은 문법적 복수 `The Royals`를 별도 집단 어휘 의미로 오인하고 target 예문 목록의 비포괄성을 target 정의의 한계로 오인한 정황이 강하다. capitalization `conflict`도 대소문자가 없는 한국어 문자체계에는 맞지 않는다. 반대로 primary의 semantic `exact`와 example `pass`는 타당하지만 target metadata가 없는 상태에서 usage 전 축을 `match`로 확정한 것은 근거가 부족하다.

smoke와 canonical 7행의 `royal` fixed-pair request는 byte-equivalent다. 재구성한 request body SHA-256은 primary `e412058e81ffe18e834e767e1874fdb31fc65f5926428a48f10ace4e70907360`, verifier `2c53477aa058766d4eadcbdb3c1195008e37bb55f0d978e1c52214e6fac392a1`이다. 이미 temperature 0과 고정 seed를 쓰므로 같은 바이트를 다시 호출해 기대값으로 바뀐 실행만 채택하는 것은 sequential cherry-picking이며, 바뀐다면 통과가 아니라 재현성 실패의 추가 증거다. 현재 gold를 Qwen 결과에 맞춰 완화하거나 동의하는 verifier를 찾는 model shopping도 하지 않는다.

## 확정된 결정과 이유

1. 서비스 이름은 `한영이음`, 저장소와 Cloudflare Worker 이름은 `han02eum`으로 유지한다.
2. 운영 기본 데이터는 영문 Wiktionary다. 영어 정의·예문·발음과 현재 한국어 번역은 모두 여기에서 온다.
3. 한국어 번역 누락은 품사와 개별 의미 단위로 판정한다. 다른 품사의 번역을 보강 근거로 잘못 공유하지 않는다.
4. 한국어기초사전은 한국어 후보의 원천으로 사용한다. 영어 뜻풀이끼리 비교하므로 후보 생성 단계에 자동 번역기는 필요하지 않다.
5. AI는 새 한국어 뜻을 생성하지 않고, 제공된 후보 중 양방향으로 같은 개념인지 판정한다.
6. 일반 동등성 판정과 반대 사례 탐색 판정이 모두 동일 후보를 `exact`로 선택하고, 의미 유형·격식·분야가 일치하며 중대한 차이가 없을 때만 `ai-approved`로 기록한다.
7. AI 처리는 사용자 검색 때마다 호출하지 않고 오프라인 배치로 수행한다. 비용·지연·결과 변동을 운영 검색과 분리하기 위해서다.
8. 후보, 미승인, 오류 결과는 공개 검색에 합치지 않는다. 운영 반영은 평가 통과 후 별도 승인 단계다.
9. Wiktionary 번역과 한국어기초사전 보강은 출처별 레이어를 분리하고 양쪽 원문 링크와 라이선스를 보존한다.
10. `main` 푸시는 Cloudflare 자동 배포를 일으키므로, 이 파일럿 변경은 로컬 검증과 사용자 확인 전 푸시하지 않는다.

아래 11–26은 이미 끝난 v3 hardening과 smoke를 당시 어떻게 실행·차단했는지 보존한 **역사적 실행 계약**이다. 현재 추가 호출이나 기존 경로 재사용을 허가하는 지침이 아니며, 종결 후 현재 경계는 27–32에 적었다.

11. 첫 실제 v3 실행의 output·manifest·completion marker는 provider 스키마 드리프트와 실제 비용을 증명하는 불변 실행 증거다. 삭제·수정·덮어쓰기하지 않고, 원인 진단은 읽기 전용으로 시작하며 후속 smoke는 반드시 새 출력명을 사용한다.
12. provider가 낸 `semantic.rule` 같은 계약 밖 필드를 허용하거나 제거해 통과시키지 않는다. prompt와 실제 JSON Schema를 같게 고치고, provider 출력은 계속 exact-key 로컬 검증에서 fail-closed한다.
13. attempt2부터 primary와 Qwen 모두 `response_format`을 사용하지 않는다. exact `VERDICT_SCHEMA`는 prompt의 `requiredOutput`에만 넣고, 중계기는 어느 모델의 `response_format`도 `env.AI.run` 전에 거부한다. primary의 `reasoning_effort: low`와 Qwen의 reasoning option 부재는 유지한다.
14. 계약 smoke는 canonical 평가 실행기가 아니며 승인·gate·공개 결과를 만들지 않는다. exact source·candidate·입력 SHA·endpoint·두 모델·출력 경로를 코드에 고정하고 token 외 override를 받지 않는다.
15. 계약 smoke는 비용 지출 전 `.lock`과 `.partial`을 각각 `wx`로 선점한다. final output·lock·partial 중 하나라도 이미 있으면 fetch 0회로 실패하며, crash 뒤 stale lock/partial은 소유권을 추측해 자동 삭제하지 않는다.
16. 실패 진단 preview의 신뢰 경계는 완료된 provider final-content 문자열뿐이다. malformed JSON, null/missing content, unexpected object, `reasoning_content`, tool/internal 필드는 preview하지 않고 raw 응답의 SHA-256과 byte length만 남긴다.
17. provider 예외는 원문·prompt·reasoning·token을 audit에 복사하지 않고 닫힌 분류값 `json_mode_unmet`, `input_validation`, `rate_limited`, `timeout`, `unknown`만 보존한다. 확실히 분류할 수 없으면 `unknown`으로 fail-closed한다.
18. contract smoke attempt1은 primary HTTP 502 때문에 실패했으므로 최종 audit을 불변 보존하고 같은 경로로 재실행하지 않는다. 원인을 먼저 읽기 전용으로 진단하며 primary와 Qwen 모두의 정상 assessment를 확인하기 전 attempt2 7행과 고정 100건을 실행하지 않는다.
19. v3의 primary·verifier는 HTTP 429·5xx·timeout을 포함한 모든 실패에서 자동 재시도하지 않고 모델당 최대 1회만 호출한다. 오류가 transient인지와 무관하게 비용과 호출 그래프를 고정하고 다음 실행 여부를 별도로 판단한다.
20. 다음 비게이팅 smoke는 `.local/pilot/ai-contract-smoke-v3-attempt2.json`만 사용한다. final·`.lock`·`.partial` 중 하나라도 있으면 AI 호출 전에 실패하며 attempt1 파일을 삭제하거나 재사용하지 않는다.
21. attempt2 코드는 구현자와 다른 담당자의 독립 감사 `GO` 뒤에만 정확히 2-call smoke로 실행한다. 두 strict assessment와 provider provenance가 모두 있어야 smoke `completed`이며, 그 전에는 7행·100건을 계속 차단한다.
22. attempt2 smoke는 기존 counterexample partial 3파일과 smoke attempt1의 canonical project-root 경로·코드 고정 SHA를 output reservation과 fetch 전에 모두 확인한다. 하나라도 없거나 바뀌면 0-call로 중단하며 production API는 이 경로·reader·SHA를 바꿀 수 없다. 이는 현재 고정 파일럿의 불변 증거를 전제로 한 로컬 전용 계약이며 다른 checkout을 위한 portable 도구로 일반화하지 않는다.
23. production smoke API는 token 외 인자를 받지 않고 canonical output 3경로와 module 초기화 시점의 real global fetch를 내부 고정한다. 합성 response 주입은 real temporary directory 하위의 test-only seam으로만 허용하며 canonical·lexical·realpath·symlink alias로 production output을 만들 수 없게 한다.
24. 보존 네 파일은 SHA 외에 일반 파일·비symlink·hard-link 수 1·exact realpath·open handle과 path identity를 요구하고, 호출 전과 final commit 직전에 같은 metadata/SHA snapshot인지 확인한다. 같은 SHA·같은 내용으로 교체해도 provenance identity가 바뀌었으면 이 고정 실행은 중단한다.
25. post-call 보존 증거 drift나 외부 final commit 경합은 completed final을 만들지 않는다. 전자는 safe strict audit을 담은 partial과 lock, 후자는 배타 commit 직전 partial과 lock을 stale evidence로 보존하며 소유권을 추측해 자동 삭제·재시도하지 않는다.
26. attempt2 smoke의 `completed`는 두 provider 호출·strict parse·provenance 계약이 완주했다는 뜻일 뿐 의미 승인이나 다음 batch 허가가 아니다. primary와 Qwen의 3축 결론이 갈렸으므로 attempt2 audit을 불변 보존하고 같은 경로로 재실행하지 않으며, 구현자와 다른 담당자의 결과 독립 감사 전에는 7행을 실행하지 않는다.
27. attempt2 결과 독립 감사의 artifact integrity는 `GO`지만 canonical evaluation admission/readiness는 P1 `NO-GO`다. provider contract 성공과 gate 실행·통과를 구분하며, `completed` audit을 양성 대조군 승인이나 7행 실행 허가로 승격하지 않는다. 수정된 canonical attempt2 7행 bundle이 없어 gate는 미실행이다.
28. `royal → 왕족`의 현 gold는 semantic `exact`, register·capitalization `source-only-preservable`, domain·temporal·regional `unknown`, example `pass`로 유지한다. Qwen의 복수/집단 및 예문 비포괄성 오판에 맞춰 gold를 바꾸거나, 현 결과에 동의하는 verifier를 사후 탐색하지 않는다.
29. smoke와 canonical 7행의 `royal` 요청은 byte-equivalent이므로 같은 요청의 확률적 재실행으로 기대 결과만 채택하지 않는다. 반복 안정성 연구가 필요하면 별도 버전에서 횟수·집계·실패 조건을 사전 등록하고 모든 결과를 보존한다.
30. v3는 실패한 실험으로 닫는다. 과거 오류 7행 partial 실행과 별개로 수정된 canonical attempt2 7행과 동일 100건은 실행하지 않았으며, 현 v3에서 추가 비용을 쓰거나 기존 fixture·gate를 완화해 소급 통과시키지 않는다.
31. 다음 정식 실험은 별도 v4로 설계한다. 여러 독립 이중 adjudication positive/negative held-out gold, 일반화된 복수·예문·capitalization·source-only 규칙, veto-only rule layer, 반복 정책 사전 등록, 100건 안에 겹치는 회귀행의 post-run gate를 결과를 보기 전에 고정한다.
32. six-negative 진단은 미구현·실행 금지다. 기존 canonical 7 명령·attempt2 경로를 재사용하지 않고 별도 versioned fixture/output, 최대 12-call, permanent non-gating 계약을 구현해 로컬 검증과 독립 감사를 통과한 뒤 사용자의 명시적 실행 승인을 받아야만 가능하다.

## 완료한 작업

- 운영 도메인 `https://han02eum.com/` 연결 및 기존 사전 동작 확인
- `royal`의 형용사 번역은 Wiktionary 번역표에 있으나 명사 한국어 행은 없다는 원인 확인
- 브라우저 파서를 품사·의미별 한국어 번역 구조로 변경
- 번역 상태를 `present`, `missing-in-translation-box`, `no-translation-box`, `unresolved`로 구분
- 한국어기초사전 2026-08-19 전체 JSON을 로컬에서 받아 영어 대역 의미 71,058개 색인
- 100개 다의어 시험 목록과 Wiktionary 수집 자동화
- 같은 품사, 영어 대역어, 영어 뜻풀이 토큰을 이용한 상위 8개 후보 검색기 구현
- 후보 밖의 단어 생성을 금지한 AI 판정 계약과 두 번의 합의 규칙 구현
- AI 출력 형식·후보 ID·관계 값을 재검증하고 오류 시 미승인 처리
- 단어별 라운드로빈 표본 추출로 첫 100개 의미가 일부 다의어에 편중되지 않게 수정
- 모델, 실행 시각, 판단 내용, 토큰 사용량을 남기는 결과 형식 구현
- Cloudflare API 토큰 없이 Workers AI binding을 사용하는 127.0.0.1 전용 임시 중계기 구현
- `@cf/openai/gpt-oss-20b`로 100개 의미, 의미당 2회 실제 판정 실행
- AI 승인 19건을 서로 결과를 보지 않은 두 독립 AI 감사가 전수 재검토
- 실행 결과·비용·오류 유형·운영 보류 결정을 `docs/AI_MAPPING_PILOT_REPORT.md`에 기록
- 파서·한국어기초사전 정규화·후보 검색·AI 합의 규칙에 대한 자동 테스트 추가
- 기존 v2 코드·결과를 덮어쓰지 않는 v3 별도 실행기·판정기·deterministic gate·요약기·v1-v3 비교기와 고정 100행/7행 평가 fixture 구현
- v3에서 의미 동치·사용역·예문 적용 가능성을 독립 축으로 분리하고, primary `@cf/openai/gpt-oss-20b`와 blind verifier `@cf/qwen/qwen3-30b-a3b-fp8`의 모델 계열 상이성 및 엄격한 로컬 스키마 검증 구현
- 1차 독립 리뷰 findings에 따라 내부 canonical count/SHA pin, candidate 입력 단일 바이트 읽기, 6개 fixed-pair audit와 nautical negative-control 분리, primary pair 거부 시에도 verifier 강제 평가, 응답 완료 신호 fail-closed, 제한 재시도, 기존·부분 출력 덮어쓰기 차단과 completion marker를 구현
- 2차 NO-GO 수정에서 7행 전체의 `preserveSourceUsage`·`exampleExpectation` 대조, source usage·example evidence 재검증, manifest+`.complete.json` bundle 검증, comparison same-bytes SHA, production override 차단, `usageReported`·미보고 호출 분리를 구현
- v3 summary와 comparison은 raw decision JSONL만으로 진행하지 않고 canonical 7행/100행의 output·manifest·completion marker 계약을 통과해야 하며, README 실행 순서도 7행 gate 성공 뒤 100행으로 이어지게 수정
- 최종 hardening에서 전용 counterexample summary/gate의 `expectedSuite` 강제, canonical candidate·v1 baseline 바이트의 직접 SHA·내용 검증, 행별 source/candidate·호출 그래프·provider provenance·`decideMappingV3` 결과 원천 재계산을 구현
- primary·verifier 모델군과 `http://127.0.0.1:8791/v1/chat/completions` endpoint를 정확히 고정하고, 항해 음성 대조군에도 독립 Qwen full-selection assessment를 추가해 7행 모두 두 모델, 총 14회 호출 계약으로 보강
- 최종 hardening은 로컬 합성 응답으로만 검증했으며 별도 담당자의 독립 재감사에서 `GO`를 받았다. 이 hardening 완료 시점의 v3 실제 AI 호출은 0건이었다
- 첫 7행 실행 시도에서 workerd `Ready` 전 `Incorrect type for map entry 'PRIMARY_MODEL': provided value is not function or ExportedHandler`로 실패했고, AI 호출 0건·v3 산출물 부재·8791 종료 상태를 확인
- `pilot/ai-proxy-core.js`로 모델 allowlist·입력 검증·요청 처리를 분리하고 `pilot/ai-proxy-worker.js`는 default handler만 export하도록 수정했다. 기존 config main, loopback 제한, remote AI binding, 정확한 모델 allowlist 동작은 보존
- runtime 수정 뒤 `npm run pilot:ai-proxy`의 `Ready`를 확인하고 token-only counterexample 명령으로 첫 실제 v3 7행을 실행했다. primary 7회는 모두 HTTP 200 `choices`였지만 공통 스키마 오류로 7행 모두 fail-closed됐고 Qwen verifier는 호출하지 않았다
- 오류 7건의 output·manifest·completion marker를 committed partial bundle로 원자적으로 보존하고, gate·summary·100건을 실행하지 않은 채 중계기를 Ctrl-C로 종료해 8791 포트 종료를 확인
- 보존 partial의 공통 `semantic.rule`을 prompt의 의사 출력 구조가 유도했고, native `env.AI.run`에는 OpenAI envelope가 아니라 bare JSON Schema가 필요하다는 두 원인을 분리 진단
- primary·pair verifier·full-selection verifier의 `requiredOutput`을 실제 `VERDICT_SCHEMA`와 완전히 같은 nested keys·enums·types로 통일하고 semantic·usage·example 판단 규칙을 별도 `judgingRules` prose로 이동
- Qwen에는 계속 `response_format`과 `reasoning_effort`를 보내지 않고, primary의 OpenAI식 schema envelope만 로컬 중계기에서 검증 후 native Workers AI bare schema로 변환하도록 수정
- strict local verdict validator의 exact-key·type·enum·후보 ID·축별 일관성 검사를 그대로 유지하고, 예상 밖 필드를 strip하거나 허용하지 않음
- provider parse·validation 실패에 raw content SHA-256·UTF-8 byte length·최대 2,048-byte token-redacted preview·preview length·truncated만 추가하고, runner의 private failure record까지 보존하도록 구현. Authorization·request token·요청 본문·전체 reasoning은 기록하거나 console 출력하지 않음
- 첫 partial 경로와 충돌하지 않는 `attempt2` counterexample output·manifest·completion marker·summary 경로를 package와 README에 고정하고 후속 comparison 기본 입력도 attempt2로 변경. sample 출력 경로는 변경하지 않음
- canonical runner에 override를 추가하지 않고 exact input SHA/source/candidate/endpoint/models/output을 고정한 별도 비게이팅 1행 contract smoke를 구현. primary와 blind Qwen pair verifier를 재시도 없이 각 1회 호출하고 성공·오류·usage·provider provenance를 배타적 atomic JSON audit로 보존하되 승인·gate·공개 판단은 생성하지 않음
- 후속 P1 수정에서 smoke final output·lock·partial 충돌을 추론 전에 차단하고 lock/partial `wx` 선점, partial·directory `fsync`, 배타 hard-link publish, 성공·provider 실패 audit commit, stale reservation 자동 삭제 금지를 구현. existing output/lock/partial과 동시 실행은 모두 추가 fetch 0회로 실패함
- 오류 diagnostic preview를 검증된 완료 final-content 문자열로만 제한. malformed provider JSON, null/missing content, unexpected response object, sibling reasoning/tool/internal 값은 preview하지 않으며 token redaction·UTF-8 2,048-byte 상한·raw SHA/length와 runner 보존 계약은 유지
- proxy가 validated schema name을 native bare schema `title`로 보존하도록 하고 기존 title 충돌은 fail-closed 처리. `{}`와 최상위 type/properties/required/additionalProperties 제약이 불완전한 schema는 `env.AI.run` 전에 거부하며 Qwen adapter에는 계속 response format을 전달하지 않음
- final·`.lock`·`.partial` 부재와 중계기 `Ready`를 확인한 뒤 token-only `npm run pilot:smoke:ai-contract:v3`를 정확히 1회 실행. primary 1회는 HTTP 502·usage 미보고로 실패했고 blind Qwen 1회는 HTTP 200 `choices`와 strict 3축 assessment를 반환함. 총 2회 호출의 `failed` audit을 배타 commit하고 재시도하지 않았으며 lock/partial 정리와 8791 포트 폐쇄를 확인함
- attempt1 502의 후속 독립 진단 결과에 따라 primary request의 `response_format`을 완전히 제거하고 `reasoning_effort: low`, exact schema-derived prompt, JSON-only 지시, strict local validator, finish/refusal/truncation guard를 유지함. Markdown code fence도 정규화하지 않고 fail-closed하도록 보강
- proxy는 primary·Qwen의 `response_format`을 모두 binding 전에 거부하고, provider 예외를 다섯 닫힌 category로만 분류해 원문 없이 반환하도록 수정. runner와 smoke는 이 category를 failure audit에 보존하며 어느 HTTP 실패도 자동 재시도하지 않음
- contract smoke 고정 output을 `.local/pilot/ai-contract-smoke-v3-attempt2.json`으로 분리하고 기존 attempt1과 첫 counterexample partial bundle을 건드리지 않음. 기존 final/lock/partial·동시 실행 0-call 차단, durable commit, 양 assessment+provenance 완료 조건은 유지
- clean CLI preflight 뒤 token-only canonical attempt2 smoke를 정확히 1회 실행. primary·Qwen 각각 1회, 총 POST 2회가 모두 HTTP 200 `choices`였고 두 strict assessment와 provenance를 가진 non-gating `completed` audit을 배타 commit함. 자동 재시도·7행·gate·summary·comparison·100건은 실행하지 않았고 lock/partial 정리, 프록시 종료, 8791 폐쇄를 확인
- 구현자와 다른 담당자가 attempt2 artifact를 읽기 전용으로 독립 재감사해 P0/P1 없는 integrity `GO`를 확인하고, 별도 언어·방법론 감사에서 `royal` gold의 방어 가능성, 두 모델의 상반된 과확정·오판, 동일 request byte, cherry-picking·model-shopping 금지를 확인
- v3를 **provider contract 성공·canonical evaluation admission/readiness 실패·gate 미실행**으로 종결. 과거 오류 7행 partial은 보존하고 수정된 canonical attempt2 7행과 동일 100건은 실행하지 않았으며, 차기 v4와 아직 미구현·실행 금지인 six-negative 조건부 진단 경계를 공식 상태에 기록

## 주요 산출물과 파일 위치

- 운영 Worker: `src/worker.js`, `src/handler.js`, `src/dictionary-api.js`
- Wiktionary 파서: `public/dictionary-parser.js`
- 파일럿 설명과 100개 단어: `pilot/README.md`, `pilot/words.txt`
- 한국어기초사전 색인기: `scripts/build-krdict-index.mjs`, `scripts/lib/krdict.mjs`
- Wiktionary 수집기: `scripts/collect-wiktionary-senses.mjs`
- 후보 검색기: `scripts/generate-mapping-candidates.mjs`, `scripts/lib/candidate-ranking.mjs`
- AI 판정기: `scripts/judge-mapping-candidates.mjs`, `scripts/lib/ai-judge.mjs`
- 로컬 AI 중계기: `pilot/ai-proxy-worker.js`, `pilot/wrangler.ai-pilot.jsonc`
- 결과 요약기: `scripts/summarize-ai-decisions.mjs`
- 테스트: `test/dictionary-parser.test.mjs`, `test/pilot-pipeline.test.mjs`, `test/ai-proxy-worker.test.mjs`, `test/summarize-ai-decisions.test.mjs`
- 파일럿 결과 보고서: `docs/AI_MAPPING_PILOT_REPORT.md`
- 출처 정책: `docs/DATA_SOURCES.md`
- 원본과 파생 데이터: `.local/krdict/`, `.local/pilot/` — Git 제외
- 첫 실제 v3 partial output: `.local/pilot/ai-decisions-v3-counterexamples.jsonl` — SHA-256 `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`
- 첫 실제 v3 partial manifest: `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json` — SHA-256 `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`
- 첫 실제 v3 completion marker: `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json.complete.json` — SHA-256 `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`
- 첫 실제 v3 counterexample summary: 생성하지 않음
- 비게이팅 contract smoke 실행기: `scripts/smoke-ai-contract-v3.mjs`
- contract smoke attempt1 실패 audit: `.local/pilot/ai-contract-smoke-v3-attempt1.json` — SHA-256 `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`; 불변 보존
- contract smoke attempt1 예약 경로: 위 출력에 이어지는 `.lock`, `.partial` — audit commit 뒤 모두 정리돼 현재 없음
- contract smoke attempt2 완료 audit: `.local/pilot/ai-contract-smoke-v3-attempt2.json` — SHA-256 `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`; 불변 보존, `.lock`과 `.partial`은 commit 뒤 없음
- attempt2 counterexample 예정 output: `.local/pilot/ai-decisions-v3-counterexamples-attempt2.jsonl` — 현재 생성하지 않음
- attempt2 예정 manifest·marker: 위 output에 이어지는 `.manifest.json`, `.manifest.json.complete.json` — 현재 생성하지 않음
- attempt2 예정 summary: `.local/pilot/ai-summary-v3-counterexamples-attempt2.json` — 현재 생성하지 않음

## 로컬 데이터 결과

- 한국어기초사전 LexicalEntry 객체: 56,555개, 고유 표제어 ID 53,671개
- 한국어기초사전 영어 대역 의미: 71,058개
- 시험 단어: 100개
- Wiktionary 파싱 의미: 2,737개
- 한국어 번역 있음: 205개
- 명확한 보강 대상: 1,005개
- 구조상 자동 귀속 보류 및 별도 보존: 1,527개
- Wiktionary 수집 실패: 0개
- 후보 세트 생성: 1,002개, 후보 없음 3개
- `royal` 명사 `A royal person; a member of a royal family.`의 1순위 후보: `왕족`
- 실제 AI 표본: 100개 의미, 99개 단어
- AI 승인: 19개, 미승인: 81개, 오류: 0개
- 판정 간 후보 또는 관계 불일치: 14개
- 100건 판정 토큰: 입력 218,178, 출력 33,091, 합계 251,269
- 사전 확인 2건 포함 전체 실행량: 255,983 토큰, 공개 단가 환산 약 0.055달러·약 4,961 Neurons
- 독립 AI 감사 A: exact 7, near 9, false 3
- 독립 AI 감사 B: exact 6, near 11, false 2
- 두 감사자의 엄격한 exact 합의: 6/19, 31.6%
- 첫 실제 v3 counterexample 실행: 7행, 승인 0, 미승인 0, `judge-error` 7
- 첫 실제 v3 호출: primary 7회, Qwen verifier 0회; reported 7회, unreported 0회
- 첫 실제 v3 토큰: 입력 4,687, 출력 2,399, 합계 7,086
- 첫 실제 v3 실패 실행의 공개 단가 환산 sunk usage: 2026-08-24 [Cloudflare Workers AI 공개 단가](https://developers.cloudflare.com/workers-ai/platform/pricing/)의 `@cf/openai/gpt-oss-20b` 입력 $0.20/M·출력 $0.30/M 기준 약 `$0.00166`, 약 151 Neurons 상당. 실제 청구액은 일일 무료 할당과 계정 상태에 따라 다르며 dashboard 청구값을 확인하지 않음
- contract smoke attempt1: provider 호출 2회(primary 1, Qwen 1), status `failed`; primary HTTP 502·response shape `null`·assessment `null`·usage 미보고 1회, Qwen HTTP 200·response shape `choices`·usage 보고 1회
- contract smoke Qwen 토큰: 입력 1,106, 출력 761, 합계 1,867; 전체 aggregate는 reported attempt 1, unreported attempt 1이므로 실제 총사용량으로 해석하지 않음
- contract smoke Qwen 판정: candidate `krdict:68298:1`; semantic `overlap`, usage register `conflict`/domain `match`/temporal `match`/regional `unknown`/capitalization `conflict`, example applicability `fail`
- attempt2 smoke 보존 preflight: 첫 counterexample partial output·manifest·completion marker와 smoke attempt1의 exact canonical path·SHA를 output reservation/fetch 전에 검증하고 missing·unreadable·drift를 0-call로 차단. 네 파일의 drift와 대표 missing, cwd 독립 경로, production override 거부를 회귀 테스트로 고정
- attempt2 smoke API/filesystem seal: production token-only·captured global fetch·canonical final/lock/partial 내부 고정, tmp-only test seam, canonical/lexical/realparent/symlink alias 0-call 차단, 보존 증거 regular-file/nlink/realpath/inode/metadata/SHA pre/post 재검증, same-byte replacement stale audit, final `EEXIST` 증거 보존을 합성 회귀 테스트로 고정
- root·pilot README를 수동 승인 경계가 포함된 smoke → 결과 감사 → attempt2 7행 → gate → 독립 결과 감사 → 100건 순서로 통일하고, package 연속 명령의 7행 → gate → 100건 → 요약 → 비교 exact `&&` fail-stop 순서를 테스트로 고정
- batch runner의 categorized HTTP 502 회귀: `providerErrorCategory: json_mode_unmet` 보존, 첫 행 `judge-error`, 승인 `null`, gate `judge-error`, manifest·marker `partial`, completed bundle loader 거부를 확인
- contract smoke attempt2: provider 호출 2회(primary 1, Qwen 1), 둘 다 HTTP 200·response shape `choices`, status `completed`, failure·safe category 0건; reported attempt 2, unreported attempt 0
- attempt2 primary 판정: candidate `krdict:68298:1`; semantic `exact`, referent/event/necessary-condition 일치, usage register/domain/temporal/regional/capitalization 모두 `match`, example `pass`; 입력 1,182·출력 281·합계 1,463 토큰
- attempt2 Qwen 판정: 같은 candidate; semantic `target-narrower`, referent 일치·event/necessary-condition 불일치, usage register `source-only-preservable`·domain/temporal/regional `unknown`·capitalization `conflict`, example `fail`; 입력 1,112·출력 972·합계 2,084 토큰
- attempt2 합계: 입력 2,294·출력 1,253·합계 3,547 토큰. 2026-08-24 [Cloudflare Workers AI 공개 단가](https://developers.cloudflare.com/workers-ai/platform/pricing/) 환산은 약 `$0.000703`, 약 64 Neurons이며, 당일 10,000 Neurons 무료 할당 잔여 여부에 따라 추가 청구 가능 범위는 `$0`부터 약 `$0.000703`이다. dashboard 청구값은 확인하지 않음
- v3 실제 inference 누계: 11회(첫 invalid-schema primary 7회 + smoke attempt1 primary/Qwen 각 1회 + smoke attempt2 primary/Qwen 각 1회). reported attempt 10회, unreported attempt 1회(attempt1 primary HTTP 502)
- v3 보고 사용량 누계: 정확히 12,500 토큰. GPT 계열 reported는 입력 5,869·출력 2,680·합계 8,549 토큰, Qwen reported는 입력 2,218·출력 1,733·합계 3,951 토큰이다. usage 미보고 primary 502의 실제 토큰은 이 합계에 포함하지 않음
- v3 공개 단가 환산 known reported 비용: GPT `$0.001977800`(첫 7회 `$0.001657100` + attempt2 `$0.000320700`), Qwen `$0.000693673`(attempt1 `$0.000311341` + attempt2 `$0.000382332`), 합계 `$0.002671473`, 약 242.86 Neurons. 미보고 primary 502의 비용은 알 수 없고, 일일 무료 할당과 계정 상태 때문에 실제 추가 청구액은 dashboard 확인 전 확정하지 않음
- attempt2 실행 무결성 감사: `GO`, P0/P1 없음. canonical 7 readiness: P1 `NO-GO`; 동일 100건: `NO-GO`
- canonical attempt2 7행 bundle·gate·summary와 동일 100건 output·manifest·marker·summary·comparison은 모두 생성하지 않음

한국어기초사전의 `왕족` 영어 대역어는 정확히 `royal`이 아니라 `being of royal blood`이고 영어 뜻풀이는 `A person in the king's family.`다. 따라서 단순 영문 표제어 일치가 아닌 의미 검색이 필요하다는 점을 실데이터로 확인했다.

## 검증 결과

- 최신 API/filesystem seal 뒤 `npm run test:node`: 170/170 통과
- 같은 seal 뒤 `npm run test:worker`: 제한 sandbox에서는 `listen EPERM 127.0.0.1`로 중단됐고, 외부 네트워크·AI 없이 로컬 포트 권한만 허용한 동일 테스트는 3/3 통과
- 같은 seal 뒤 `npm run check`, `git diff --check` 통과
- attempt2 실제 실행 전 보존 네 파일의 exact SHA·Regular File·비symlink·`nlink=1`·canonical realpath, attempt2 final/lock/partial과 7행 bundle·summary 부재, 8791 listener 부재, Node preload·대소문자 HTTP(S)/ALL proxy·npm/global-agent·동적 preload 환경변수 부재를 값 노출 없이 확인
- canonical `npm run pilot:ai-proxy`의 `Ready` 뒤 token-only canonical smoke 명령을 정확히 1회 실행했고 access log POST 2회가 모두 HTTP 200임을 확인. audit의 expected call count 2와 실제 assessment attempt count 2가 일치함
- attempt2 audit은 양 모델·family·endpoint·candidate ID와 `choices` shape, strict semantic·usage·example assessment를 보존하고 failure 0·reported 2·unreported 0이다. token/Authorization 표식은 audit에 없음
- attempt2 final SHA-256 `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`, Regular File·비symlink·`nlink=1`·canonical realpath를 확인. commit 뒤 lock/partial 부재, 프록시 Ctrl-C 뒤 8791 listener 부재를 확인
- 실행 뒤 기존 보존 네 파일의 네 SHA와 Regular File·비symlink·`nlink=1`·canonical realpath를 재확인했고 attempt2 counterexample output·manifest·marker·summary는 계속 없음
- 최종 독립 실행 증거 감사에서 attempt2 status·eligibility·exact models/families/endpoint/response shape·2-call graph·reported/unreported usage·strict assessment·failure 부재·token 비노출·old-evidence post-run provenance·atomic cleanup을 원천 재계산해 artifact integrity `GO`, P0/P1 finding 0건을 확인
- 별도 언어·방법론 감사는 `royal` positive gold를 유지하면서 Qwen의 semantic/example/capitalization 결론과 primary의 usage 전 축 `match`를 모두 증거보다 과한 판정으로 보았고, byte-equivalent 재실행을 금지해 canonical 7 readiness P1 `NO-GO`와 동일 100건 `NO-GO`를 확정
- production API의 `fetchImpl`·output/path/reader/SHA override가 canonical reservation·fetch 0으로 거부되고 test-only helper도 canonical final·lock·partial, lexical alias, canonical real-parent alias, dangling symlink alias를 모두 0-call 차단함을 확인
- 보존 artifact missing·unreadable·SHA drift가 실제 reserved execution wiring에서 fetch 0·output/lock/partial 미생성으로 끝나고, symlink와 `nlink>1` hard link도 차단됨을 확인
- 호출 뒤 same-SHA same-byte inode 교체는 completed final 없이 `staleReservation` partial·lock을 남기고, partial에 Authorization token과 합성 private provider raw 원문이 없으며 재호출도 lock에서 fetch 0으로 차단됨을 확인
- 외부 프로세스가 final을 먼저 생성한 합성 경합은 hard-link commit `EEXIST`로 외부 bytes를 보존하고 자신의 synced partial·lock을 남기며 자동 재시도하지 않음을 확인
- 보수적 pre-smoke hardening 뒤 `npm run test:node`: 157/157 통과
- 같은 hardening 뒤 `npm run test:worker`: 제한 sandbox 첫 시도는 `listen EPERM 127.0.0.1`로 중단됐고, 외부 네트워크나 AI 없이 로컬 포트 권한을 허용한 동일 테스트는 3/3 통과
- 같은 hardening 뒤 `npm run check`, `git diff --check` 통과
- 보존 네 파일은 hardening 뒤 SHA-256 `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`, `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`, `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`, `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`로 일치했고, 그 pre-execution 시점에는 attempt2 smoke final·lock·partial과 attempt2 counterexample output·manifest·marker가 모두 없었음
- prompt-only attempt2 수정 뒤 `npm run test:node`: 150/150 통과
- `npm run test:worker`: 제한 sandbox 첫 시도는 `listen EPERM 127.0.0.1`로 중단됐고, 로컬 포트 권한을 허용한 동일 테스트는 3/3 통과
- prompt-only attempt2 수정 뒤 `npm run check`, `git diff --check` 통과
- primary 합성 request에 `reasoning_effort: low`가 있고 `response_format`은 없으며, prompt `requiredOutput`이 `VERDICT_SCHEMA`와 deep-equal이고 JSON object only·no Markdown/code-fence 지시가 있음을 확인
- proxy 합성 테스트에서 primary `response_format` 요청이 `env.AI.run` 전 fetch 0회로 거부되고, Qwen에는 계속 `response_format`과 `reasoning_effort`가 전달되지 않음을 확인
- extra/missing field, 잘못된 enum, 축별 불일치, code fence, malformed JSON, truncation, refusal이 `maximumAttempts` override 값과 무관하게 각각 1회 호출 뒤 fail-closed함을 확인. HTTP 400·408·429·500·501·502·503·504도 모두 1회로 종료
- provider 오류 분류 합성 테스트에서 다섯 category 외 값은 `unknown`으로 축약되고 raw provider message·prompt·reasoning·token이 proxy response와 runner/smoke audit에 포함되지 않음을 확인
- contract smoke 합성 테스트에서 exact candidate input SHA와 `royal` source·`왕족` candidate, exact endpoint/models, primary 후 blind Qwen의 정확히 2회 호출, 두 strict assessment와 provenance가 모두 있을 때만 `completed`, 한쪽이라도 실패하면 non-gating `failed`임을 확인
- smoke reservation 합성 테스트에서 기존 final output·lock·partial 각각과 동시 실행이 모두 fetch 0회로 실패하고 기존 bytes를 보존함을 확인. 성공·provider 실패는 audit을 commit한 뒤 lock/partial을 정리하며, commit 전 crash 흔적은 자동 정리하지 않는 fail-closed 정책으로 고정
- diagnostic privacy 합성 테스트에서 trusted completed content만 bounded preview되고 malformed raw body, null content, unexpected object, `reasoning_content`, tool/internal의 `PRIVATE_REASONING`과 request token이 preview·failure record에 들어가지 않음을 확인
- 보존 partial output·manifest·completion marker SHA가 각각 `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`, `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`, `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`이고 contract smoke attempt1 SHA가 `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`임을 pre-execution 시점에 확인했으며, 당시 attempt2 final·lock·partial은 없었음
- `npm run test:node`: runtime entrypoint 회귀 테스트 추가 뒤 133/133 통과
- `npm run test:worker`: 3/3 통과
- `npm run check`: 통과
- `npm run verify`: 통과
- `npm run deploy:dry-run`: 통과 — 정적 파일 6개, Worker 번들 8.81 KiB / gzip 3.15 KiB
- 파일럿 Worker dry-run: 통과 — AI binding, 번들 9.43 KiB / gzip 2.79 KiB
- `royal` 실 HTML 파싱: 형용사 첫 의미 `present` 및 `왕의`, `왕실의`; 명사 첫 의미 `missing-in-translation-box`
- 기존 Cloudflare OAuth 로그인과 Workers AI 실행 권한 확인
- 127.0.0.1 전용 임시 Worker를 통해 Workers AI 100건 및 사전 확인 2건 실행, 실행 뒤 중계기 종료
- `royal` 명사에 대해 두 판단 모두 `왕족`을 `exact`로 승인
- 운영 UI/API 병합, Cloudflare 계정 설정 변경, Git 커밋·푸시, 운영 배포는 실행하지 않음
- v3 정본 로더 사전 검증: 7행 ordered source ID SHA-256 `94c3d4179190dafb150ef33447adbd72418756c9aa19468f139f92e60dbfa137`, 100행 ordered source ID SHA-256 `b3b07e21cf31d973ee871b3156830c57e2b475bd422633677db8f34fb057e40c`, candidate 입력 SHA-256 `9aeb8c8a3e08dfea50a1b4dcfa500fac051c2533916dbf2217d281a14e74f90c` 일치
- 최종 hardening 뒤 `npm run check`, `git diff --check`, canonical 7행/100행 loader dry validation 통과
- 별도 담당자의 독립 재감사 결과: `GO`
- `npm run pilot:ai-proxy`를 실제 AI request 없이 실행해 `[wrangler:info] Ready on http://127.0.0.1:8791`을 확인한 즉시 종료했고, 종료 뒤 8791 포트가 닫힌 것을 확인
- startup smoke 전후 v3 counterexample/sample output·manifest·completion marker와 counterexample summary가 모두 부재함을 확인한 뒤 첫 실제 실행을 시작
- 첫 실제 실행에서 primary POST 7회가 모두 HTTP 200과 provider `choices` 형태로 응답했지만, 7행 모두 `ai_judge_invalid_schema:semantic:unexpected_rule`로 primary 단계에서 fail-closed
- 7행 모두 semantic·usage·example assessment가 `null`, status와 gate status가 `judge-error`, reason code가 `judge_error`이며 Qwen verifier 호출은 0회
- output 7행, manifest `completionStatus=partial`, completion marker `status=committed`와 세 SHA를 확인; counterexample gate·summary·100건은 미실행
- 관측된 known-negative 승인 escape는 0/5지만 오류 7건이므로 gate 통과로 해석하지 않음
- 실제 실행 뒤 중계기를 Ctrl-C로 종료했고 8791 포트가 닫힌 것을 확인
- contract smoke 실행 전 final·`.lock`·`.partial` 부재와 중계기 `Ready`를 확인했고 token-only canonical smoke 명령은 재시도 없이 정확히 1회만 실행
- 중계기 access log에서 primary HTTP 502와 Qwen HTTP 200의 POST 2회를 확인. audit의 expected provider call count 2와 실제 attempt count 2가 일치하며 primary failure 1회·Qwen assessment 1회임을 재계산
- Qwen 응답은 provider model/family/endpoint와 `choices` shape, candidate ID, semantic·usage·example 3축을 strict parse했고 primary는 `ai_judge_http_502`, response diagnostic `null`, usage 미보고 1회로 보존됨
- smoke audit은 canonical evaluation·gate·publication eligibility가 모두 `false`이고 approval decision이 `null`이다. Authorization·API token 표식은 audit에 없고 commit 뒤 lock/partial 부재, Ctrl-C 뒤 8791 포트 폐쇄를 확인

제한된 샌드박스 안의 첫 Worker 테스트는 로컬 포트 권한 때문에 실행되지 않았으나, 로컬 포트 권한을 허용한 동일 검증은 모두 통과했다.

## 미해결 문제

- 기존 v2의 2회 판정은 같은 모델과 같은 프롬프트 계약의 변형이라 오류가 독립적으로 걸러지지 않았다. `line → 그렇지`, `fast → 고정불변하다`를 두 번 모두 승인한 결과는 불변 기준선으로만 보존한다.
- 기존 v2 AI 승인 19건 중 독립 감사자의 엄격한 exact 합의는 6건뿐이므로 운영 자동 공개에는 부적합하다.
- 엄격한 동치와 실제 사전 번역의 허용 범위를 구분해야 한다. `royal → 왕족`은 핵심 개념은 일치하지만 영어의 비격식·대문자 사용역을 한국어 표제어가 그대로 담지는 않는다.
- 1,527개 `unresolved` 의미는 번역표 설명과 정의를 안전하게 자동 귀속하지 못한 경우다. 원문 블록과 함께 별도 파일에 보존하되 현재 보강 대상에서는 제외한다.
- 사람 정답표에 기반한 고정 평가셋과 허용 오승인률은 아직 없다. 최소한 `royal`, `line`, `fast`, `screen`, `play`, `light`를 포함해야 한다.
- 첫 실제 Workers AI 실행의 `semantic.rule`은 모델이 임의로 만든 필드라기보다 당시 prompt의 의사 `requiredOutput.semantic.rule`이 직접 요구하면서 실제 strict schema와 충돌한 것이었다. provider 계약은 attempt2에서 양 모델 HTTP 200·strict 3축 parse로 복구됐지만 첫 7행 partial은 오류 7건의 불변 실패 증거이며 정상 canonical 7 bundle이 아니다.
- primary prompt-only와 Qwen pair 계약은 attempt2 실제 provider에서 모두 정상 응답했지만 `royal`의 semantic·usage·example 결론이 갈렸다. 독립 결과 감사는 실행 무결성만 `GO`, canonical 7 readiness와 100건은 `NO-GO`로 판정했다. Qwen nullable full-selection JSON과 정상 7행 bundle은 실제 확인하지 않았으며 v3를 실패 종결했으므로 더 실행하지 않는다.
- 고정 7행은 동일 100건의 부분집합이다. 별도 7행 gate가 통과해도 100건 실행에서 겹치는 행의 판단이 뒤집힐 수 있으므로, 차기 버전은 100 bundle 내부의 겹치는 회귀행을 다시 검사해 하나라도 실패하면 전체 평가를 실패 처리하는 post-run gate가 필요하다.
- target metadata가 없는 상태에서 `unknown`, `source-only-preservable`, `match`, `conflict`를 어떻게 구분할지 일반 정책이 부족하다. 특히 문법적 복수와 lexical group sense, 예문 목록의 비포괄성과 정의 범위, 영어 capitalization과 한국어 비대문자 체계를 결과와 무관하게 사전 명문화해야 한다.
- trusted final-content response preview는 원인 재현성을 높이지만 최대 2,048 UTF-8 바이트만 보존하므로 그 이후의 세부 내용은 SHA와 길이만 남는다. malformed/raw/object 응답은 preview가 비어 있고 전체 body의 SHA와 길이만 남는다. 이는 의도된 비밀·reasoning 노출 제한이며 원문 전체 보존 기능이 아니다.
- smoke의 atomic reservation·durable commit·정상 lock/partial 정리는 attempt1 실패 audit과 attempt2 completed audit에서 실제 확인했다. 두 final audit과 첫 counterexample partial 3파일을 모두 삭제·덮어쓰기하거나 stale로 간주하지 않는다.
- Wiktionary CC BY-SA 4.0과 한국어기초사전 CC BY-SA 2.0 KR 사이의 결합 결과 배포 정책을 운영 반영 전에 검토해야 한다.
- 코드 공개 라이선스와 상업 이용 여부는 아직 사용자 확정이 필요하다.

## 닫힌 v3 실험 계약과 실행 이력 체크포인트

아래 항목은 v3를 설계·검증할 때 고정했던 계약과 그 이력이다. v3가 admission/readiness `NO-GO`로 종결된 현재, 이 절의 미래형 표현은 당시 계약을 설명할 뿐 기존 명령이나 경로로 추가 실행하라는 지침이 아니다.

- 기존 v2 판정 코드와 `.local/pilot/ai-decisions.jsonl`, manifest, 요약은 기준선으로 불변 보존한다. v3는 별도 코드 경로와 `.local/pilot/ai-decisions-v3.jsonl`, 별도 manifest·요약·비교 결과로만 생성하며 기존 파일을 덮어쓰지 않는다.
- 재평가 표본은 기존 결과의 순서까지 같은 100개 source ID로 고정한다. ordered source ID SHA-256은 `b3b07e21cf31d973ee871b3156830c57e2b475bd422633677db8f34fb057e40c`, 후보 입력 SHA-256은 `9aeb8c8a3e08dfea50a1b4dcfa500fac051c2533916dbf2217d281a14e74f90c`다. 개수·순서·중복·두 SHA 중 하나라도 다르면 AI 호출 전에 실패시킨다.
- primary judge는 `@cf/openai/gpt-oss-20b`, 독립 verifier는 다른 모델 계열인 `@cf/qwen/qwen3-30b-a3b-fp8`로 고정한다. verifier에는 primary의 결론·근거·점수·기존 v2 결과·회귀 기대값을 전달하지 않고, 선택된 source-candidate 쌍과 원천 증거만 전달한다.
- 모델 판정 뒤에는 deterministic veto를 적용한다. 후보 집합 밖 ID, 품사 불일치, 스키마·타입·관계 방향 불일치, 모델 동일성, source/candidate drift, 사용 불가능한 예문, 예문 미검사, 오류·거절·잘린 응답은 모두 승인 차단 사유다.
- 판정 계약은 의미 동치, 사용역, 예문 적용 가능성을 독립 축으로 기록한다. 의미 관계는 target 기준 `exact`, `target-narrower`, `target-broader`, `overlap`, `disjoint`, `insufficient`로 방향을 명시하고, 사용역은 격식·분야·시대·지역·대문자 표기를 분리한다. 원천의 실제 예문과 `Hypernym:`·`Hyponym:` 같은 관계 메타데이터도 원문을 보존한 채 구분한다.
- 회귀셋은 단어명이 아니라 다음 7개 source ID 행으로 고정한다. `royal` 명사 1건은 의미 동치 양성 대조군, `royal` 항해 형용사 1건은 기존 미승인 음성 대조군, 나머지 5건은 알려진 오승인 방지 사례다.

| 역할 | 기준 후보 | 양 모델 의미 기대 | 양 모델 사용역 기대 | 양 모델 예문 기대 | 최종 상태 기대 |
| --- | --- | --- | --- | --- | --- |
| `royal` 명사 양성 | `왕족` | 각각 `exact` | 각각 register·capitalization `source-only-preservable` | 모든 usable source example ID를 평가하고 각각 `pass` | `ai-approved` |
| 항해 `royal` 음성 | full selection | 각각 `exact` 금지 | 각각 domain `source-only-preservable` | 모든 usable source example ID를 평가하고 `insufficient` 금지 | 승인 금지 |
| `line → 그렇지` | 고정 pair | 각각 `exact` 금지 | 각각 domain `source-only-preservable` | usable source example 0건, 각각 `insufficient`, 평가 ID `[]` | 승인 금지 |
| `fast → 고정불변하다` | 고정 pair | 각각 `exact` 금지 | 각각 temporal `source-only-preservable` | 모든 usable source example ID를 평가하고 `insufficient` 금지 | 승인 금지 |
| `screen → 방충망` | 고정 pair | 각각 `target-narrower` | 별도 보존 차원 없음 | 모든 usable source example ID를 평가하고 `insufficient` 금지 | 승인 금지 |
| `play → 경기하다` | 고정 pair | 각각 `target-narrower` | 별도 보존 차원 없음 | usable source example 0건, 각각 `insufficient`, 평가 ID `[]` | 승인 금지 |
| `light → 밝히다` | 고정 pair | 각각 `target-broader` | 별도 보존 차원 없음 | 모든 usable source example ID를 평가하고 `insufficient` 금지 | 승인 금지 |

- 실행 품질 gate는 7행의 정확한 개수·순서·source/candidate와 오류 0, 모든 행의 primary·verifier assessment 존재를 먼저 요구한다. 그 위에서 표의 **case별 의미 관계·사용역·예문 기대를 두 모델 각각이 모두 충족**해야 하고, `royal` positive는 승인되며 항해 음성 대조군과 5개 known-negative의 `ai-approved` escape는 정확히 0이어야 한다. 단순히 음성 승인 escape가 0이라는 이유만으로 통과하지 않는다. 이 gate는 회귀 안전성 확인이지 전체 정확도 추정치가 아니다.
- 전체 100건에는 사람이 확정한 정답표가 아직 없으므로 v3 결과에서 `precision`, 정확도, 오승인률을 주장하지 않는다. 기존 19건의 유지·취소, 신규 승인, 두 모델 합의, 축별 불일치, known-negative escape, 비용만 비교하고, 실제 precision 평가는 별도 사람 정답표가 생긴 뒤 수행한다.
- 공유 파일과 실제 AI 비용이 걸린 단계이므로 작업은 `구현 → 로컬 테스트와 고정 표본 사전 검증 → 실제 실행 → 결과 요약 → 독립 감사 → 문서 갱신` 순서로 하위 에이전트에 직렬 위임한다. 구현·실행·감사를 병렬로 진행하지 않는다.
- 이 체크포인트는 로컬 실험 설계 승인일 뿐 운영 변경 승인이 아니다. Git 커밋·푸시, GitHub 상태 변경, Cloudflare 운영 배포와 운영 UI/API 병합은 별도 사용자 확인 전까지 금지한다.
- v3 최종 hardening과 runtime entrypoint, prompt-only attempt2 및 보존 증거 pre/post seal을 완료해 7행 사용역·예문 계약, bundle marker/SHA/count, comparison same-bytes SHA, production token-only/canonical 경로 고정, tmp-only test seam, 미보고 usage 표현, 전용 counterexample suite 강제, canonical 바이트·행 source/candidate·호출 그래프·provider·gate 원천 재계산, default-only Worker export, 모델당 1-call, 안전 오류 category, old-evidence missing/unreadable/drift·identity 교체 0-call 또는 stale 차단을 로컬 회귀 테스트했다. 최신 로컬 검증은 Node 170/170, Worker 3/3, `npm run check`, `git diff --check` 통과다.
- 과거 독립 재감사의 P1/P2/P3 findings는 모두 닫혔다. 모델·endpoint exact pin, 7행 전부의 두 모델 assessment, token-only 실행 안내까지 반영했고 최종 독립 재감사는 `GO`다.
- 현재 partial output·manifest·completion marker 세 파일, contract smoke attempt1과 attempt2 audit 및 기록된 다섯 SHA를 모두 불변 보존한다. 어느 경로도 후속 감사·실행에서 삭제하거나 덮어쓰지 않는다.
- prompt-only attempt2는 actual 2-call provider contract와 strict parsing을 완료했고 독립 실행 증거 감사에서 integrity `GO`를 받았다. 그러나 같은 요청의 Qwen 결과가 현 positive gold를 위반해 canonical 7 readiness는 P1 `NO-GO`다. smoke는 canonical/gate/publication/approval에 사용할 수 없다. 과거 오류 7행 partial 실행과 구분되는 수정된 canonical attempt2 7행·gate·100건은 미실행 상태로 종결한다.
- 현 v3 fixture·gold·모델을 완화하거나 같은 byte를 재실행해 gate를 소급 통과시키지 않는다. 여섯 음성 사례의 별도 비게이팅 진단은 현재 구현돼 있지 않으므로 실행 금지다. 필요하면 기존 canonical 7 fixture·명령·attempt2 출력 경로와 다른 versioned fixture·전용 output·최대 12회 호출(6행 × 2모델)·영구 non-gating 계약을 먼저 구현하고, 로컬 검증·독립 감사와 사용자의 명시적 실행 승인을 모두 받은 뒤에만 수행할 수 있다.

## 다음 단계

1. **권장:** v3를 실패 실험으로 닫고 별도 v4 평가 계약을 설계한다. 현재 7행은 개발용 회귀셋으로 보존하되, 결과를 보지 않은 두 독립 adjudicator가 확정한 여러 positive·negative held-out gold를 별도로 만든다.
2. v4 시작 전에 문법적 복수와 lexical group sense, source/target 예문 목록의 비포괄성과 실제 적용 가능성, 영어 capitalization과 한국어 비대문자 체계, target metadata 부재 때 `unknown`과 `source-only-preservable` 처리 규칙을 일반 규칙으로 사전 등록한다. rule layer는 모델의 non-exact·conflict·unknown·example fail을 승격하지 않는 veto-only로 유지한다.
3. verifier/규칙/반복 횟수·집계·실패 조건을 held-out 결과와 무관하게 먼저 고정하고 모든 실행을 보존한다. held-out positive 요구 충족·negative escape 0·오류 0을 통과할 때만 동일 100건을 정확히 1회 실행하며, 100건 안에 겹치는 회귀행을 post-run 재검사해 하나라도 실패하면 100 bundle을 평가 실패로 표시한다.
4. **조건부 대안(현재 미구현·실행 금지):** 추가 진단 가치가 필요하면 `royal` positive를 재호출하지 않고 항해 `royal`과 `line`·`fast`·`screen`·`play`·`light` 여섯 음성 사례만 별도 진단 대상으로 설계할 수 있다. 다만 기존 canonical 7 fixture·`pilot:judge:v3:counterexamples:attempt2` 명령·attempt2 출력 경로를 재사용하지 않는다. 별도의 versioned six-negative fixture와 충돌하지 않는 전용 output, 최대 12-call(각 사례 primary 1회 + verifier 1회), 영구 non-gating·100건 진입 불가 계약을 구현한 뒤 로컬 검증·독립 감사와 사용자의 명시적 실행 승인을 모두 받아야만 실행할 수 있다.
5. 현재 `royal` gold를 완화하거나 Qwen 결론에 맞게 fixture를 바꾸거나 동의하는 모델을 사후 탐색하지 않는다. 동일 byte 재실행 결과 중 기대값만 채택하지 않는다.
6. 동일 100건에는 사람 정답표가 없으므로 차기 실행에서도 승인 변화·모델 합의·축별 불일치·known-negative escape·비용만 보고하고 precision·정확도·오승인률을 주장하지 않는다.
7. Git commit·push, GitHub 상태 변경, Cloudflare 운영 배포와 운영 UI/API 병합은 별도 사용자 확인 전까지 수행하지 않는다.

## 중요한 제약과 주의사항

- AI가 생성한 한국어 뜻을 사전 데이터처럼 표시하지 않는다.
- 후보 검색 점수만으로 한국어 항목을 공개하지 않는다.
- `unresolved` 번역표는 억지로 의미에 붙이지 않는다.
- 원천 리비전, 의미 정의, 한국어기초사전 entry ID, 모델명, 두 판단과 사용량을 보존한다.
- 첫 실제 v3 partial output·manifest·completion marker와 contract smoke attempt1·attempt2 audit은 모두 불변 실행 증거이므로 삭제·수정·덮어쓰기하지 않는다.
- contract smoke attempt1 결과는 canonical gate나 사전 연결 승인에 입력하지 않는다. final audit이 이미 존재하므로 같은 고정 명령은 추가 fetch 전에 실패해야 하며, 파일을 지우고 재실행해서는 안 된다.
- smoke attempt1과 attempt2의 `.lock`·`.partial`은 각 final audit commit 뒤 정상 정리돼 현재 없다. attempt2 final은 이미 존재하므로 같은 canonical smoke 명령을 재실행하거나 final을 삭제해 경로를 재사용하지 않는다.
- attempt2 `completed` audit은 non-gating이고 두 모델 결론도 다르다. 독립 감사에서 artifact integrity는 `GO`였지만 canonical evaluation admission/readiness는 P1 `NO-GO`로 종결됐으므로, 현 v3에서 실제 AI를 추가 호출하거나 수정된 canonical attempt2 7행·gate·100건을 실행하지 않는다.
- attempt2에서 post-call 증거 drift나 외부 final 경합으로 `.lock`·`.partial`이 남으면 stale evidence다. 같은 SHA·같은 내용이라는 이유만으로 파일 정체성 교체를 자동 수락하거나, lock/partial을 자동 삭제하고 재시도하지 않는다. final·partial·lock과 계정 호출 내역을 독립 감사해 별도 결정을 기록한다.
- 수정된 canonical attempt2 7행은 admission/readiness `NO-GO`로 닫혔다. 기존 7행 fixture·`pilot:judge:v3:counterexamples:attempt2` 명령·attempt2 output 경로는 후속 실행이나 six-negative 진단에 사용하지 않는다. 과거 partial 경로와 아직 비어 있는 sample 경로도 재사용하지 않는다.
- six-negative 진단은 아직 fixture·runner·output contract가 구현되지 않았으므로 실제 AI 호출을 금지한다. 별도 versioned 구현, 최대 12-call 상한, permanent non-gating 표시, 로컬 검증, 독립 감사, 사용자 명시 승인이 모두 충족되기 전에는 실행 준비가 완료된 것으로 간주하지 않는다.
- 동일 request 재호출, current gold 완화, 결과에 동의하는 모델 탐색, 여섯 음성 진단을 100건 진입 자격으로 사용하는 행위를 금지한다.
- validation 실패 preview는 private `.local` audit에만 두고 console, Git, 공개 보고서에 복사하지 않는다. Authorization·API token·요청 전체·full reasoning을 기록하지 않는다.
- 원천 의미가 바뀌면 기존 연결을 자동 재검토 대상으로 돌린다.
- 한국어기초사전 원본·파생 대용량 파일과 인증값을 Git에 추가하지 않는다.
- 운영 `WIKIMEDIA_USER_AGENT`, 출처 링크, 라이선스 표시, 검색어 로그 보호 설정을 훼손하지 않는다.
- `main` 푸시 전 `npm run verify`와 `npm run deploy:dry-run`을 통과시킨다.

## Git 및 배포 체크포인트

- 로컬 브랜치: `main`
- 작업 시작 기준 커밋: `8d349ee`
- 원격: `git@github.com:tsusaikang/han02eum.git`
- GitHub `main` 푸시는 Cloudflare Worker `han02eum` 자동 배포를 유발한다.
- 이번 파일럿 변경은 아직 커밋·푸시하지 않았다.
- contract smoke attempt1·attempt2 동안 Git commit·push·GitHub 상태 변경·Cloudflare 운영 배포는 없었고 인증·OTP 입력 요구도 없었다. attempt2 실행 뒤 수정된 canonical attempt2 7행·100건·gate·summary·comparison은 실행하지 않았다.
- 운영 주소는 `https://han02eum.com/`이다.

## 인수인계 체크포인트

영한 보강 문제를 `Wiktionary 영어 의미 → 한국어기초사전 한국어 의미`의 자동 연결 문제로 정의하고, 100개 단어에서 2,737개 의미와 1,005개 명확한 누락을 수집했다. 한국어기초사전 영어 의미 71,058개에서 1,002개 후보 세트를 만들었고, Workers AI `@cf/openai/gpt-oss-20b`로 100개 의미를 두 번씩 실제 판정했다. 19개를 승인했으며 `royal` 명사는 `왕족`에 연결됐다. 그러나 승인 19건의 독립 AI 전수 감사에서 엄격한 exact 합의는 6건뿐이고 `line → 그렇지`, `fast → 고정불변하다` 같은 명백한 오연결도 발견됐다. 따라서 운영에는 반영하지 않았다. 이 v2 결과는 불변 기준선이며, 의미·사용역·예문을 분리하고 다른 모델의 blind verifier와 원천 재계산형 bundle verifier를 둔 v3 구현은 독립 재감사 `GO` 상태다. 상세 v2 결과는 `docs/AI_MAPPING_PILOT_REPORT.md`에 있다.

2026-08-24 당시 다음 실험 설계로 v3 계약을 확정했다. 기존 v2 코드·결과는 불변 기준선으로 보존하고 v3는 별도 출력만 사용하도록 했다. 동일 100건은 ordered source ID SHA-256 `b3b07e21cf31d973ee871b3156830c57e2b475bd422633677db8f34fb057e40c`와 후보 SHA-256 `9aeb8c8a3e08dfea50a1b4dcfa500fac051c2533916dbf2217d281a14e74f90c`로 고정했다. primary는 `@cf/openai/gpt-oss-20b`, blind verifier는 `@cf/qwen/qwen3-30b-a3b-fp8`, 마지막 단계는 deterministic veto로 정했다. 당시 gate 계약은 7행 모두에서 두 모델이 case별 의미·사용역·예문 기대를 충족하고, 양성 `royal`이 승인되며 여섯 음성 사례의 승인 escape가 0일 때만 고정 100건을 허용하는 것이었다. admission/readiness에서 이미 `NO-GO`가 나와 gate는 실행하지 않았고 이 v3 실행 계약은 현재 닫혀 있다. 전체 100건에는 사람 정답표가 없으므로 precision을 주장하지 않는다. 다음 담당자는 하위 에이전트에 구현·실행·독립 감사를 직렬로 위임하고 각 단계 산출물을 확인해야 하며, 별도 사용자 확인 전 Git 푸시와 운영 배포를 해서는 안 된다.

v3 1차 구현과 최초 리뷰 findings 수정은 완료됐고 `npm run test:node` 79/79 및 `npm run check`를 통과했다. 내부 canonical count/SHA, candidate 단일 snapshot 읽기, 6개 fixed-pair audit, nautical negative-control, primary가 pair를 거부해도 수행하는 blind verifier, response completion fail-closed, 제한 재시도, 배타적 출력과 completion marker까지 구현됐다. 이 검증은 모두 로컬 합성 응답이며 v3 실제 AI 호출은 0건이다.

2차 NO-GO 수정에서 7행 전체 사용역·예문 기대 대조, complete bundle 검증, comparison same-bytes SHA, production override 차단, 미보고 usage 분리를 구현했다. 당시 `npm run test:node` 112/112와 로컬 검증을 통과했지만, 후속 독립 재감사에서 counterexample suite 미강제, canonical 바이트·호출 그래프·gate 미재계산, provider·endpoint provenance 부족, 항해 음성 대조군의 verifier 부재, 실행 문서 드리프트가 발견됐다. 이는 닫힌 finding의 이력이며 현재 미해결 blocker가 아니다.

최종 hardening에서 전용 counterexample gate의 `expectedSuite` 강제, canonical candidate·v1 baseline의 직접 바이트/SHA/행 검증, source/candidate·호출 그래프·provider provenance·`decideMappingV3` 결과 원천 재계산, exact 모델·endpoint pin을 구현했다. 항해 음성 대조군도 Qwen 독립 full-selection을 수행해 7행 모두 두 모델의 assessment를 요구한다. 별도 담당자의 독립 재감사 결과는 `GO`다. 검증은 로컬 합성 응답만 사용했으며 v3 실제 AI 호출은 0건이었다.

첫 7행 실행 시도는 workerd `Ready` 이전에 Worker 모듈의 named primitive export 오류로 중단됐다. AI 호출은 0건이고 v3 산출물은 없었으며 포트도 닫혔다. 테스트 가능한 계약·handler를 `pilot/ai-proxy-core.js`로 분리하고 Worker 진입 모듈은 default export 하나만 남겼다. `npm run test:node` 133/133, `npm run test:worker` 3/3, `npm run check`, `git diff --check`를 통과했다. 이어서 실제 AI request 없이 정확한 `npm run pilot:ai-proxy`로 runtime `Ready`를 확인한 즉시 종료했고 8791 종료와 v3 산출물 부재를 다시 확인했다.

runtime 수정 뒤 첫 실제 v3 counterexample 7행을 실행했다. primary 7회는 모두 HTTP 200 `choices` 형태였으나 7행 모두 `ai_judge_invalid_schema:semantic:unexpected_rule`로 거부됐고 Qwen verifier는 0회였다. reported 토큰은 입력 4,687, 출력 2,399, 합계 7,086이고 unreported 호출은 0회다. output SHA `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`, manifest SHA `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`, completion marker SHA `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`의 committed partial bundle을 보존했다. gate·summary·100건은 실행하지 않았고 중계기와 8791 포트는 종료했다.

보존 bundle과 계약의 원인 진단, 최소 수정, 후속 P1 수정, 합성 회귀 테스트, attempt2 경로와 별도 contract smoke 준비는 완료됐다. 후속 P1은 pre-fetch 원자 reservation 부재, untrusted raw/reasoning preview 위험, native schema name/title·제약 검증 부족이었다. smoke는 lock/partial `wx` 선점과 durable audit publish를 사용하고, preview는 trusted completed content 문자열만 허용하며, proxy는 canonical title과 constrained top-level object를 강제한다. 최신 로컬 검증은 Node 144/144, Worker 3/3, `npm run check`, `git diff --check` 통과다. 첫 실패 7행 실행은 입력 4,687·출력 2,399·합계 7,086 tokens와 공개 단가 환산 약 `$0.00166`·151 Neurons 상당의 sunk usage로 남고 기존 partial bundle은 삭제·수정·덮어쓰기하지 않는다.

후속 독립 검토 뒤 비게이팅 2-call contract smoke attempt1을 정확히 1회 실행했다. source는 `enwiktionary:92048420:royal:noun-1:noun-1-sense-1`, candidate는 `krdict:68298:1` `왕족`, 총 호출은 primary 1회와 blind Qwen 1회다. primary는 HTTP 502로 assessment 없이 실패했고 usage 1회가 미보고다. Qwen은 HTTP 200 `choices`로 semantic `overlap`, usage register·capitalization `conflict`/domain·temporal `match`/regional `unknown`, example `fail`을 반환했으며 입력 1,106·출력 761·합계 1,867 tokens를 보고했다. audit status는 `failed`, canonical/gate/publication eligibility는 모두 `false`, approval은 `null`이다. `.local/pilot/ai-contract-smoke-v3-attempt1.json` SHA-256 `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`를 불변 보존한다. commit 뒤 lock/partial은 없고 Ctrl-C 뒤 8791 포트가 닫혔다. 인증·OTP 프롬프트, Git commit·push, GitHub 상태 변경, 운영 배포는 없었다.

attempt1 generic 502의 읽기 전용 진단 뒤 prompt-only attempt2 수정을 완료했다. primary는 `response_format` 없이 exact schema-derived prompt와 `reasoning_effort: low`를 사용하고, Qwen 입력은 변하지 않는다. proxy는 양 모델의 `response_format`을 binding 전에 거부하며 provider 예외는 닫힌 category만 반환한다. 모든 모델 호출은 자동 재시도 없이 최대 1회다. smoke output은 `.local/pilot/ai-contract-smoke-v3-attempt2.json`으로 분리했고 최신 로컬 검증은 Node 150/150, Worker 3/3, check/diff-check 통과다. 이 단계의 실제 AI 호출은 0회이며 기존 네 SHA는 불변이다.

독립 주감사의 P2와 보조감사의 P1 심각도 이견은 더 보수적인 pre-smoke 계약으로 폐쇄했다. smoke는 reservation과 fetch 전에 프로젝트 루트 기준 보존 네 파일의 exact path와 코드 고정 SHA를 real filesystem에서 읽어 검증하며 production API에는 reader/path/SHA 주입점이 없다. missing 또는 네 파일 각각의 drift가 downstream fetch 0으로 끝나는 단위 회귀, cwd 독립 경로, package 전체 `&&` 순서, batch safe-category 502의 partial·승인/gate 불가 회귀를 추가했다. root·pilot README도 수동 감사 경계를 포함한 절차로 통일했다. Node 157/157, Worker 3/3, check/diff-check를 통과했고 네 SHA는 불변이며 attempt2 smoke와 7행 산출물은 모두 없다. 실제 AI·remote 호출은 0회였다.

최신 독립 NO-GO가 지적한 production API와 filesystem alias/TOCTOU 경계도 폐쇄했다. production API는 token-only이며 mock fetch와 output/path/reader/SHA를 받지 않고, test-only seam은 real tmpdir 아래에서만 합성 response를 쓸 수 있다. preserved artifact는 regular/no-symlink/nlink 1/exact-realpath/open-inode/metadata/SHA를 호출 전과 commit 직전에 대조한다. same-byte inode 교체도 provenance drift로 중단하고 safe stale partial·lock만 남기며, 외부 final race는 `EEXIST`로 외부 final과 자신의 partial·lock을 모두 보존한다. Node 170/170, Worker 3/3, check/diff-check를 통과했고 네 SHA는 불변이며 attempt2 smoke와 7행 산출물은 모두 없다. 실제 AI·remote 호출은 0회였다.

최종 독립 코드 감사의 clean CLI 조건부 `GO` 뒤 preflight를 모두 통과했다. 기존 네 파일은 실행 전후 exact SHA·regular/no-symlink/nlink 1/canonical realpath가 같고, 실행 전 attempt2 final·lock·partial과 attempt2 7행 산출물, 8791 listener, Node preload·proxy 환경변수는 모두 없었다. canonical 중계기를 직접 `Ready`까지 시작하고 token-only canonical smoke attempt2를 정확히 1회 실행했다. primary와 Qwen은 각각 1회, 총 2회 모두 HTTP 200 `choices`였고 strict assessment/provenance를 반환했다. primary는 semantic `exact`, usage 전 축 `match`, example `pass`; Qwen은 semantic `target-narrower`, register `source-only-preservable`, domain/temporal/regional `unknown`, capitalization `conflict`, example `fail`이다. reported token은 각각 1,463과 2,084, 합계 3,547이고 unreported는 0회다. audit은 non-gating `completed`, failure/safe category 0건, canonical/gate/publication false, approval null이다. `.local/pilot/ai-contract-smoke-v3-attempt2.json` SHA는 `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`이고 lock/partial은 없다. 프록시 종료와 8791 폐쇄, token 비노출, 기존 네 증거 불변, attempt2 7행 산출물 부재를 재확인했다.

attempt2 결과 독립 감사는 완료됐다. artifact integrity는 P0/P1 없이 `GO`지만, 언어·방법론 감사까지 합친 canonical evaluation admission/readiness는 P1 `NO-GO`이고 동일 100건도 `NO-GO`다. `royal` gold는 유지하며 같은 요청의 재실행·gold 완화·model shopping을 하지 않는다. v3 실제 inference는 총 11회, reported 10/unreported 1, known reported 12,500 tokens·약 `$0.002671473`이며 usage가 미보고된 attempt1 primary 502와 실제 추가 청구액은 알 수 없다. 과거 오류 7행 partial 실행은 존재하지만 수정된 canonical attempt2 7행·gate·summary·comparison·100건은 실행하지 않았고, Git commit·push, GitHub 상태 변경, Cloudflare 운영 배포도 없었다.

다른 작업에서 이어야 할 경우 사용할 인수인계 프롬프트:

> `/Users/jusang/projects/english-dictionary/docs/PROJECT_STATE.md`와 `/Users/jusang/projects/english-dictionary/docs/AI_MAPPING_PILOT_REPORT.md`의 2026-08-24 v3 실패 종결 체크포인트를 먼저 읽어라. v3는 provider contract 성공·canonical evaluation admission/readiness 실패·gate 미실행으로 닫혔다. 과거 오류 7행 partial 실행은 있으나 수정된 canonical attempt2 7행과 동일 100건은 미실행이다. 기존 counterexample partial output·manifest·marker, smoke attempt1·attempt2 audit과 기록된 다섯 SHA를 불변 보존하고 같은 `royal` request를 재호출하지 마라. 기존 canonical 7 명령·attempt2 경로를 사용하지 마라. six-negative 진단은 미구현·실행 금지이며, 별도 versioned fixture/output·최대 12-call·permanent non-gating 계약의 구현·로컬 검증·독립 감사·사용자 명시 승인 뒤에만 가능하다. 다음 정식 작업은 v4 별도 설계다. 여러 독립 이중 adjudication positive/negative held-out gold를 만들고, 문법적 복수/lexical group, 예문 비포괄성, 영어 capitalization/한국어 비대문자, source-only/unknown 규칙과 veto-only layer, 반복 정책, 100 overlap post-run gate를 결과 보기 전에 사전 등록하라. current gold 완화·model shopping·sequential cherry-picking을 금지하고, 실질 작업은 하위 에이전트에 직렬 위임하라. 사용자 별도 확인 전 Git push·GitHub 상태 변경·Cloudflare 운영 배포를 하지 마라.

## 2026-08-24 v4 설계 체크포인트 — held-out packet v1 NO-GO, packet v2 전환 전

### 목표와 완료 조건

v4의 목표는 닫힌 v3 fixture·gold·실행 증거를 완전히 보존한 채, 결과를 모르는 독립 판정자들이 원천 evidence만으로 확정한 복수 positive/negative held-out gold와 veto-only 평가 계약을 별도 versioned 경로에 만드는 것이다. 이번 packet v1 설계 단계의 완료 조건은 결과를 보기 전에 규칙·합의 단위·수량·반복·실패·보존·외부 실행 gate를 사전 등록하고, blind evidence packet과 closed schema를 SHA로 봉인하며, 독립 methodology audit `GO` 뒤에만 중립 양식을 만들어 서로 blind한 두 판정을 받고, exact ordered full-fingerprint 합의 여부를 기계 비교해 결과를 불변 감사로 남기는 것이었다.

설계·blind 판정 절차와 기계 비교는 완료됐지만 packet v1은 C/D의 normative core가 일치하지 않아 **전체 `NO-GO`**로 닫혔다. 따라서 packet v1에는 consensus·derived gold·admission·결과 감사 `GO`·provider 실행 자격이 없다. v4 전체 평가의 완료 조건도 아직 충족되지 않았다.

다음 fresh packet v2의 admission 완료 조건은 다음과 같다.

- 기존 v3 고정 7행, 동일 100행, held-out packet v1 10건의 모든 exact `source.id`를 제외한 새 source만 사용하고 그 배제 집합·순서·SHA를 결과 전에 봉인한다.
- 결과-blind curator가 예상 positive/negative 역할, 과거 A/B·C/D 값, disagreement field/value, 기존 gold·모델 결과를 보지 않고 새 evidence packet을 만든다.
- 새 preregistration·neutral instructions·closed schema·seal을 먼저 만들고 별도 독립 methodology audit `GO`를 받은 뒤에만 새 blank form과 adjudication을 허용한다.
- 서로 blind한 독립 판정 두 건이 ordered full normative fingerprint 전체에서 byte-identical이어야 하며, semantic/example에서 파생한 positive 최소 4건과 negative 최소 4건을 동시에 충족해야 한다. 한 필드라도 다르면 부분 합의·다수결·선택·보정 없이 packet 전체를 `NO-GO`로 닫는다.
- exact consensus·수량 admission 뒤에도 별도 독립 결과 감사 `GO` 전에는 provider/프로젝트 AI를 호출하지 않는다. 그 뒤 사전 등록된 10건 × 6회 = 60회 held-out gate에서 모든 attempt와 오류를 보존하고, 각 positive의 full fingerprint·semanticGold가 6/6 일치하며 negative approval escape가 0/6이고 오류가 0일 때만 통과할 수 있다.
- held-out gate와 독립 결과 감사가 모두 `GO`이기 전에는 기존 7행과 동일 100행을 실행하지 않는다. 통과 뒤에도 100행은 정확히 1회만 허용하고, 겹치는 회귀 source의 post-run overlap gate가 하나라도 실패하면 100 bundle 전체를 실패로 표시한다.

### v3 불변 기준선

v4 작업은 v3 fixture·audit·실행 증거를 수정·삭제·덮어쓰지 않았다. packet v1 종결 뒤 다음 7개 SHA를 다시 계산했고 모두 기존 기록과 일치했다.

- `pilot/evaluation/ai-mapping-counterexamples-v1.json` — `b2e9cd43776013b93e6e597bfb9e07b66fab308853b6be9618241d2f97a44360`
- `pilot/evaluation/ai-mapping-sample-100-v1.json` — `97229dcbbc23583e42fddef953178e1720dc37b4d27e74a887a5243c8c157c9b`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl` — `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json` — `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json.complete.json` — `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`
- `.local/pilot/ai-contract-smoke-v3-attempt1.json` — `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`
- `.local/pilot/ai-contract-smoke-v3-attempt2.json` — `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`

v3 7행 ordered source ID SHA는 `94c3d4179190dafb150ef33447adbd72418756c9aa19468f139f92e60dbfa137`, 동일 100행 ordered source ID SHA는 `b3b07e21cf31d973ee871b3156830c57e2b475bd422633677db8f34fb057e40c`다. 새 packet v2는 두 집합과 packet v1 evidence SHA `83c0720e7609e9b0105b77e3195ff99676380fa401d9db75c8f797cf7a36cfd6` 안의 10개 `source.id`를 exclusion-only 입력으로 사용해야 한다. 단어명이나 case ID가 아니라 exact source ID로 배제하고, 결과-blind curator에게는 과거 판정 결과 대신 이 배제 목록과 필요한 원천 후보 데이터만 제공한다.

### v4 packet v1 설계와 감사 이력

1. base preregistration v1과 `heldout-evidence-v1.json`은 10건 blind packet, 두 독립 primary A/B, ordered full normative fingerprint exact equality, positive/negative 최소 수량, 네 언어·증거 규칙과 veto-only gate를 고정했다. A/B 양식은 schema·attestation·coverage를 통과했지만 full fingerprint가 달라 `adjudication-disagreement-audit-v1.json`에서 `NO-GO`가 됐다. 합의·gold는 만들지 않았다.
2. resolver v1은 A/B 차이를 사후 보정하지 않고 새 판정으로 해소하려 했으나 독립 methodology audit에서 `RMA-P1-001` blind 경계 자기모순, `RMA-P1-002` mismatch 의미 축약, `RMA-P1-003` 원 base의 majority 금지 위반을 받아 `NO-GO`가 됐다. resolver 판정은 실행하지 않았다.
3. replacement readjudication v2는 schema가 `exact`와 false semantic boolean의 모순 및 금지된 capitalization 값을 허용해 `RDMA2-P1-001` `NO-GO`가 됐다. v3는 해당 구조를 닫았지만 HV4-05·HV4-07의 proper-name/example capitalization을 sense-level 제한으로 오인해 `RDMA3-P1-001` `NO-GO`가 됐다. v4는 10건 모두 capitalization `unknown`을 올바르게 고정했으나 usage completeness를 semantic positive에 포함해 positive 최소 4건이 구조적으로 불가능하므로 `RDMA4-P1-001` `NO-GO`가 됐다. v2–v4의 blank form과 판정은 실행하지 않았다.
4. base preregistration v2는 결과가 생기기 전에 `semanticGold`와 `publicationEligible`을 분리했다. readjudication v5는 v1–v4 findings를 닫고 독립 methodology audit `GO`를 받은 뒤 neutral execution seal과 서로 blind한 C/D form만 사용했다.
5. C/D completed form은 schema/packet/instructions/execution seal SHA, completed attestation, 서로 다른 pseudonym, exact five-file read-list, ordered unique 10 case ID, usable source example 전체 coverage, rejected example 제외, semantic iff, all-ten capitalization `unknown`, example verdict/attestation/counterexample 일관성을 모두 통과했다.
6. RFC 8785 JCS UTF-8 ordered normative core SHA는 C `cbefd71f21430a51e0c1fd22c3c1b600d0afd32a5991fa2b5601a078271625ca`, D `fc6ec452e2e01f8f90e819a8c8bafa607e62499d47326cf407ff168425b69736`으로 달랐다. raw-free 차이는 정확히 다음 세 필드다.
   - `HV4-03 normative.semantic.eventAndParticipantsMatch`: C `true`, D `false`
   - `HV4-07 normative.usage.domain`: C `source-only-preservable`, D `conflict`
   - `HV4-09 normative.semantic.eventAndParticipantsMatch`: C `true`, D `false`
7. 한 필드 차이도 전체 실패라는 사전 계약에 따라 토론·수정·선택·부분 병합·다수결·추가 adjudicator 없이 packet v1을 `NO-GO`로 닫았다. `readjudication-disagreement-audit-v5.json` SHA-256은 `907474c3028e746c84e2893ccf474cbe71f5f2b33a8317259f61552672ea3f17`이다. consensus·gold·admission·구현 코드는 생성하지 않았다.

중요 methodology audit SHA는 다음과 같다.

- resolver v1 `NO-GO`: `pilot/evaluation/v4/resolver-methodology-audit-v1.json` — `9eb1b0da7ef7fa7500723f0a6d9f7fc6abe0212a2f65a0220a1630fab4e057c0`
- replacement v2 `NO-GO`: `pilot/evaluation/v4/readjudication-methodology-audit-v2.json` — `f55818341728fb415e8d0479e18b7c651b9d02bce47fdf3a71207743e181d36e`
- replacement v3 `NO-GO`: `pilot/evaluation/v4/readjudication-methodology-audit-v3.json` — `001cc79c5eed267f602467c552bb54644701eead03a7cfb961a4804f91a4c7fd`
- replacement v4 `NO-GO`: `pilot/evaluation/v4/readjudication-methodology-audit-v4.json` — `bfc1c8767dcec714a3b61feccee28e8715aa253b278dcb4bdf3fd1509cf08cf8`
- base v2 + replacement v5 `GO`: `pilot/evaluation/v4/readjudication-methodology-audit-v5.json` — `420faad36b1ac7702d3c302381b70b7c91e2192f1bcd1a3093a67193cc11b317`

### 확정된 의미·사용역 계약

- `semanticGold`는 semantic relation·세 match boolean과 example verdict·전체 usable coverage·target attestation·counterexample만으로 파생한다. usage는 full fingerprint에는 남지만 semanticGold polarity를 바꾸지 않는다.
- `publicationEligible`은 semanticGold positive이면서 다섯 usage 축이 모두 `match`, `source-only-preservable`, `not-applicable` 중 하나일 때만 true다. `conflict`, `target-only`, `unknown`은 publication만 veto한다. semantic-positive이면서 publication-ineligible인 사례는 held-out positive 그대로이며 자동 승인도 아니다.
- 문법적 복수만으로 정의가 같은 singular member sense를 lexicalized collective/group sense로 바꾸지 않는다. 정의상 별도 집단 referent를 가진 lexicalized sense만 별개 집단 의미다.
- source/target 예문 목록은 비배타적 evidence다. 목록에 특정 문맥이 없다는 이유로 정의 범위를 줄이거나 fail 처리하지 않는다. usable source 예문에 candidate 의미가 자연스럽게 적용되는지, target 예문이 해당 sense를 실제 입증하는지, 구체적 usable counterexample이 있는지만 판정한다.
- 한국어 문자체계에는 영어 capitalization 축을 직접 적용하지 않는다. source sense-level qualifier/label에 실제 capitalization 정보가 있으면 `source-only-preservable`, 없으면 `unknown`이며 문장 첫 글자·인용명·고유명 예문의 대문자는 근거가 아니다. 한국어 target conflict로 바꾸지 않는다.
- source-only usage 보존은 semantic exact를 승격하지 않는다. target metadata 부재는 `match`가 아니라 evidence에 따라 `unknown` 또는 `source-only-preservable`이며, 어떤 deterministic rule도 model/adjudicator의 non-exact·conflict·unknown·example fail·nonapproval을 exact·pass·approval로 올릴 수 없다. deterministic layer는 항상 veto-only·단조 비승격이다.

### 주요 v4 산출물

- base preregistration v1/v2: `docs/AI_MAPPING_V4_PREREGISTRATION.md`, `docs/AI_MAPPING_V4_PREREGISTRATION_V2.md`, `pilot/evaluation/v4/preregistration-seal-v2.json`
- packet v1 evidence/schema/seal: `pilot/evaluation/v4/heldout-evidence-v1.json`, `pilot/evaluation/v4/adjudication-schema-v1.json`, `pilot/evaluation/v4/heldout-seal-v1.json`
- primary A/B와 첫 NO-GO: `pilot/evaluation/v4/adjudication-primary-a-v1.json`, `pilot/evaluation/v4/adjudication-primary-b-v1.json`, `pilot/evaluation/v4/adjudication-disagreement-audit-v1.json`
- resolver v1: `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`, `pilot/evaluation/v4/resolver-protocol-seal-v1.json`, `pilot/evaluation/v4/resolver-methodology-audit-v1.json`
- replacement v2–v5 preregistration: `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V2.md`부터 `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V5.md`까지
- v5 neutral contract: `pilot/evaluation/v4/readjudication-instructions-v5.md`, `pilot/evaluation/v4/readjudication-schema-v5.json`, `pilot/evaluation/v4/readjudication-protocol-seal-v5.json`, `pilot/evaluation/v4/readjudication-execution-seal-v5.json`
- v5 completed C/D와 최종 packet v1 NO-GO: `pilot/evaluation/v4/readjudication-c-adjudication-v5.json`, `pilot/evaluation/v4/readjudication-d-adjudication-v5.json`, `pilot/evaluation/v4/readjudication-disagreement-audit-v5.json`

### 현재 실행·외부 상태와 다음 단계

v4 설계·adjudication 단계에서 프로젝트 평가용 provider·외부 AI·network 호출은 0회, held-out model attempt는 0회, 기존 7행 실행은 0회, 동일 100행 실행은 0회다. Git push·GitHub 상태 변경·Cloudflare 운영 배포도 0회이며 운영 데이터·publication write는 없었다. 기존 artifact는 수정·삭제·덮어쓰기하지 않고 모든 새 artifact를 versioned 경로에 보존했다.

다음 작업은 **packet v1의 값을 고치거나 재판정하는 것이 아니라 완전히 새 held-out packet v2를 만드는 것**이다. 먼저 v3 7/100과 packet v1 10 source ID만 담은 결과 비노출 exclusion seal을 만든다. 그 뒤 결과-blind curator가 새 source/candidate evidence를 구성하고, 새 packet v2 preregistration·schema·seal과 독립 methodology audit, 서로 blind한 새 adjudication, exact consensus/admission, 독립 결과 audit 순서로 직렬 진행한다. 이 gate들이 통과하기 전에는 provider/프로젝트 AI·60 attempt·기존 7행·동일 100행을 실행하지 않는다. packet v1을 재사용하거나 과거 disagreement에 맞춰 후보·규칙·positive/negative 수량을 조정하지 않는다. 별도 사용자 확인 전 Git commit·push와 운영 배포도 하지 않는다.

## 2026-08-24 v4 최종 설계·held-out admission 체크포인트 — packet v2 결과 감사 GO, provider gate 미실행

### 목표와 완료 조건

v4의 이번 단계 목표는 닫힌 v3와 packet v1 `NO-GO` 이력을 불변 보존하면서, 기존 결과와 겹치지 않는 fresh packet v2를 만들고 결과-blind 독립 판정, exact consensus, 기계 파생 gold, tamper-fail-closed gate 구현과 독립 결과 감사까지 완료하는 것이었다. 완료 조건은 다음과 같았다.

- 기존 v3 7건·동일 100건·packet v1 10건의 exact source ID를 모두 제외한 fresh 10건과 그 배제 증명을 봉인한다.
- 독립 methodology audit `GO` 뒤에만 중립 blank와 execution seal을 만들고, 서로 blind한 E/F가 exact five-file read-list만 읽어 10건을 판정한다.
- E/F ordered normative core가 직접 bytes 비교에서도 완전히 같고, 기계 파생 `semanticGold`가 positive 최소 4건·negative 최소 4건이어야 한다.
- usage와 publication을 semantic polarity와 분리하고, deterministic layer는 어떤 non-exact·fail·unknown·비승인도 승격하지 않는 veto-only로 유지한다.
- 초기 독립 결과 감사의 P1을 닫은 뒤 새 result seal과 fresh 독립 결과 감사에서 P0/P1 없는 `GO`를 받아야 한다.
- 기존 v3 보존 7개 파일의 전체 SHA가 모두 불변이어야 하며, provider/프로젝트 AI/network, 기존 7건·100건, push/deploy는 이 단계에서 0이어야 한다.

위 설계·adjudication·result-audit 완료 조건은 충족했다. 다만 이것은 **held-out gold/admission과 미래 gate 구현의 독립 감사 `GO`**이지 provider 60-attempt held-out gate 통과가 아니다. provider 실행은 별도 승인 전까지 미실행·미허가 상태다.

### fresh packet v2와 독립 exact consensus

- 기존 v3 7 source IDs, 동일 sample 100 source IDs, packet v1 10 source IDs의 sorted-unique 합집합은 정확히 110개다. v3 7건이 동일 100건에 포함되므로 단순 합 117이 아니다. 합집합 LF SHA-256은 `690acc1c022ce319618bacfda210486014e188f3ae94fc5ef49cca014a35d71c`다.
- fresh packet v2는 중복 없는 source 10건이며 sorted-unique source IDs SHA-256은 `76d451a2fd794458283ba7c5814d853468edf03b4577d81badd60b646b592b1a`다. 위 unique union 110과의 exact source ID overlap은 `0`이다.
- 독립 methodology audit v3는 `GO`다. `pilot/evaluation/v4/heldout-packet-methodology-audit-v3.json`의 SHA-256은 `70c19640f97f60ede0c44b630fd4d2c46d4e19db245125a5e7115e89fa3924d8`이고 P0=0, P1=0이다.
- E/F는 서로의 판정과 과거 packet 결과를 보지 않고 각자 exact five-file read-list만 사용했다. cross-file admission 498 assertions를 통과했고, ordered normative core는 E/F 각각 정확히 4,672 bytes, SHA-256 `c160a61001fbc07ba9cd28d08b73ddc444debbfb71944a0954fda50135a74de3`로 직접 bytes까지 완전히 같으며 차이는 0건이다.
- `semanticGold=positive`는 `v2-case-01`, `v2-case-03`, `v2-case-06`, `v2-case-08`, `v2-case-10`의 5건이다. `semanticGold=negative`는 `v2-case-02`, `v2-case-04`, `v2-case-05`, `v2-case-07`, `v2-case-09`의 5건이다. 수량 admission은 5/5로 통과했다.
- `publicationEligible`은 0/10이다. semantic-positive 5건을 negative로 바꾼 것이 아니라, 명시 증거가 없는 usage `unknown`이 publication/final approval만 veto한 결과다. 모든 case의 expected final approval은 false다.

### 확정된 언어·usage·규칙 계약

- 문법적 복수만으로 singular member sense를 lexicalized collective/group sense로 바꾸지 않는다. 정의 자체가 별도 집단 referent를 가리킬 때만 집단 의미로 분리한다.
- source/target 예문 목록은 비배타적 evidence다. target 예문에 같은 collocation이나 문맥이 없다는 이유만으로 정의 범위를 좁히거나 `fail`·`insufficient`를 만들지 않는다. usable source 예문 전체 coverage, target sense 입증, 구체적 counterexample을 판정한다.
- 한국어 target에 영어식 capitalization을 직접 적용하지 않는다. source sense-level qualifier/label에 명시된 capitalization restriction이 있으면 `source-only-preservable`, 없으면 `unknown`이다. 문장 첫 글자, 인용명, 고유명 예문의 대문자는 sense-level usage 증거가 아니다.
- 명시된 source-only register/domain/temporal/regional restriction은 target metadata가 없을 때 `source-only-preservable`로 보존한다. source와 target 모두 명시 evidence가 없으면 `unknown`이며, metadata 부재를 `match`로 추정하지 않는다. 이 보존은 semantic non-exact를 exact로 승격하지 않는다.
- deterministic layer는 항상 veto-only·단조 비승격이다. caller나 규칙은 semantic negative를 positive로, non-exact를 exact로, example fail/insufficient를 pass로, `unknown`·`conflict`·`target-only`를 match로, approval false를 true로 바꿀 수 없다.

### 초기 result audit v2 `NO-GO`와 수정·재감사

초기 `pilot/evaluation/v4/heldout-independent-result-audit-v2.json`은 SHA-256 `cd6c8ca07ee66bdec5105be8b5a56f93b76d6a7200bfc0dbc91905f26ae34fce`, verdict `NO-GO`, P0=0/P1=1이었다. P1-001은 미래 gate가 caller-supplied ordered core와 gold를 기대 정답으로 신뢰한다는 결함이었다. sealed core의 `v2-case-02`는 `disjoint`/`fail`인 semantic-negative인데, in-memory gold만 positive·publication-eligible로 바꾸고 그 기대값에 맞춘 60 attempts를 넣으면 해당 negative의 true approval 6건이 있어도 gate가 통과하고 negative escape가 0으로 보고됐다. 함께 기록된 P2-001은 expected attempt 1건 누락·unexpected 1건 상황에서 실제 평가된 59건 대신 match 60건으로 과대 보고하는 문제였다.

수정된 v3 gate는 caller-supplied core/gold를 받지 않고 exact sealed `evidenceRaw`, `consensusRaw`, `goldRaw`, predecessor `resultSealRaw`만 검증한다. raw/canonical SHA, case 순서·source/target identity, 4,672-byte normative core를 결합하고 semantic gold와 publication eligibility를 sealed consensus/evidence에서 gate 내부 재파생한다. sealed gold는 파생 결과와 정확히 같은 참조로만 허용한다. caller gold/core 주입, negative true approval, publication forgery, case reorder·identity·core·gold·seal tamper는 모두 fail-closed하며, unexpected attempt가 있으면 실제 평가된 expected ID만 match 수에 센다.

- 수정 결과 seal: `pilot/evaluation/v4/heldout-result-seal-v3.json` — SHA-256 `8f2c2ad2e0758cd06f87e9c95d9091de65a0c057cb88c764b0d39ce7e3815d9f`
- 봉인 결합 검증: `node --test test/heldout-v4-v2.test.mjs test/heldout-v4-v3.test.mjs` 45/45 통과(기존 v2 32 + v3 수정 13)
- v3 수정 단독 검증: `node --test test/heldout-v4-v3.test.mjs` 13/13 통과. 단독 명령이 45개를 실행한 것으로 표현하지 않는다.
- fresh 독립 결과 감사 v3: `pilot/evaluation/v4/heldout-independent-result-audit-v3.json` — `GO`, P0=0/P1=0, SHA-256 `4c2e29b2cbf59db0b327a08454b7cad969f94cae820afee6b0e1f85df30293d4`

위 테스트 수치는 result seal과 독립 결과 감사에 봉인된 기존 실행 결과다. 이 최종 문서화 단계에서는 테스트·provider·기존 7건·100건을 다시 실행하지 않았다.

### v3 불변 보존 7/7

fresh result audit v3와 이 체크포인트 작성 전 전체 SHA 재확인에서 다음 7개가 모두 기존 기록과 일치했다.

- `pilot/evaluation/ai-mapping-counterexamples-v1.json` — `b2e9cd43776013b93e6e597bfb9e07b66fab308853b6be9618241d2f97a44360`
- `pilot/evaluation/ai-mapping-sample-100-v1.json` — `97229dcbbc23583e42fddef953178e1720dc37b4d27e74a887a5243c8c157c9b`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl` — `ca59e2a548bd815814367a72aef796228e7dc330324d820274945a455c9ec3e0`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json` — `d7b95098ed022ed3c7bcf0be9553688a85d7557d4b20dbbc133f9148b1c7c6d1`
- `.local/pilot/ai-decisions-v3-counterexamples.jsonl.manifest.json.complete.json` — `5e84866b2179d828039889eb40fd72c9d82ee131a9efb8423ef120d68b8c48ee`
- `.local/pilot/ai-contract-smoke-v3-attempt1.json` — `1eebc26f94b060dff1128d1aa67bb4c340c3fde15e21e4a8f533702ffb2a4282`
- `.local/pilot/ai-contract-smoke-v3-attempt2.json` — `371ed18920438c8e2eb9454287bebb1a1e194efe4624408babdc5cec7e94b761`

### 주요 파일 위치

- base 계약: `docs/AI_MAPPING_V4_PREREGISTRATION_V2.md`, `pilot/evaluation/v4/preregistration-seal-v2.json`
- fresh packet v2 identity/evidence: `docs/AI_MAPPING_V4_HELDOUT_PACKET_V2_PREREGISTRATION.md`, `pilot/evaluation/v4/heldout-packet-seal-v2.json`, `pilot/evaluation/v4/heldout-evidence-v2.json`
- history-free E/F protocol과 methodology audit: `docs/AI_MAPPING_V4_HELDOUT_PACKET_V3_PREREGISTRATION.md`, `pilot/evaluation/v4/heldout-packet-protocol-seal-v3.json`, `pilot/evaluation/v4/heldout-packet-methodology-audit-v3.json`
- neutral custody와 E/F 판정: `pilot/evaluation/v4/heldout-blank-conformance-v3.json`, `pilot/evaluation/v4/heldout-execution-seal-v3.json`, `pilot/evaluation/v4/heldout-adjudication-form-E-v3.completed.json`, `pilot/evaluation/v4/heldout-adjudication-form-F-v3.completed.json`
- consensus와 gold: `pilot/evaluation/v4/heldout-consensus-v2.json`, `pilot/evaluation/v4/heldout-gold-v2.json`
- 초기 `NO-GO`와 수정 봉인·최종 `GO`: `pilot/evaluation/v4/heldout-independent-result-audit-v2.json`, `pilot/evaluation/v4/heldout-result-seal-v3.json`, `pilot/evaluation/v4/heldout-independent-result-audit-v3.json`
- gate 구현과 회귀 테스트: `scripts/lib/v4/heldout-sealed-contract-v3.mjs`, `scripts/lib/v4/heldout-gate-v3.mjs`, `test/heldout-v4-v2.test.mjs`, `test/heldout-v4-v3.test.mjs`

### 실행·외부 상태와 다음 단계

이번 fresh packet v2 설계·E/F adjudication·consensus/gold 파생·result audit 단계에서 provider 호출 0회, 프로젝트 AI 호출 0회, network 호출 0회다. 기존 v3 7건 실행 0회, 동일 100건 실행 0회이며 Git push 0회, Cloudflare production deploy 0회다. `providerCallsAuthorized=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`를 유지한다. `heldoutGatePassed=false`, v4 bundle contract도 미봉인이고 sample 100의 별도 사용자 승인도 없다.

다음 단계는 자동으로 시작하지 않는다. 별도로 범위가 정해진 사용자 승인과 새 resealed gate transition 없이는 provider/프로젝트 AI, 60-attempt held-out gate, 기존 7건, 동일 100건 중 어느 것도 호출·실행하지 않는다. sample 100은 그 뒤에도 별도 v4 bundle contract 봉인과 별도 사용자 승인이 모두 필요하다. Git push·배포·publication/data write도 각각 별도 명시 승인 전에는 수행하지 않는다.

## 2026-08-24 Git publication pre-push 체크포인트 — main 선택 커밋·push 승인, 실행 전

사용자는 feature branch 권고와 `main` push가 Cloudflare production deployment를 촉발할 수 있다는 영향을 안내받은 뒤, **“당분간 메인으로 푸시”**라고 명시하여 이번 v4 Git publication의 대상 브랜치를 `main`으로 승인했다. 이 승인은 아래 선택 커밋과 `origin`의 `refs/heads/main` push에 한정되며, provider/프로젝트 AI 실행, 기존 7건·동일 100건 실행, publication/data write 등 다른 gate를 열지 않는다.

- 로컬 기준: branch `main`, pre-commit HEAD `8d349ee8e07d88122320605500be44e373c7aaee`
- 원격: `origin` = `git@github.com:tsusaikang/han02eum.git`
- push 대상 ref: `refs/heads/main`
- 운영 영향: `main` push는 연결된 Cloudflare production deployment를 촉발할 수 있으며, 사용자는 그 영향을 안내받은 상태에서 이번 `main` push를 승인했다.
- 선택 scope: 정확히 75개 파일. tracked `.gitignore`, `docs/DATA_SOURCES.md`, `docs/PROJECT_STATE.md`; 신규 `docs/AI_MAPPING_PILOT_REPORT.md`; `docs/AI_MAPPING_V4*.md` 9개; 공개 v3 fixture 2개; `pilot/evaluation/v4/**` 53개; `scripts/lib/v4/**` 5개; v4 held-out test 2개다.
- private/local scope: `.local/**`는 0개이며 stage·commit·push하지 않는다.
- 명시적 제외: `README.md`, `package.json`, `package-lock.json`, `public/dictionary-parser.js`, 비-v4 `pilot/**`, 비-v4 `scripts/**`, 비-v4 `test/**` 및 그 밖의 기존 사용자 변경은 stage하지 않는다.
- pre-push fail-closed 조건: 선택 75개만 stage·검증·commit한 뒤, network write 전에 fetch/read-only로 확인한 `origin/refs/heads/main`이 위 pre-commit HEAD와 정확히 같아야 한다. 다르거나 원격 상태를 확정할 수 없으면 push하지 않고 중단·보고한다. push refspec도 명시적으로 `HEAD:refs/heads/main`만 사용한다.

이 체크포인트 작성 시점에는 commit·push·Cloudflare 명령·network 호출을 아직 실행하지 않았다.
