# 한영 의미 연결 v4 blind resolver 사전등록 v1

상태: **프로토콜 봉인 / methodology audit 전 / resolver 실행 금지 / 최종 gold 없음**  
계약 ID: `bilingual-meaning-link-v4-resolver-preregistration/v1`  
대상 packet: `meaning-link-v4-heldout-10-v1`  
resolver schema: `bilingual-heldout-resolver-adjudication/v1`

## 0. 사전등록 작성자의 blind attestation

이 문서와 동반 schema/seal의 작성자는 primary A/B admission이 최소 한 case의 최소 한 필드 불일치 때문에 `NO-GO`였다는 사실만 전달받았다. 어느 case, 어느 필드, 어느 값이 달랐는지, A/B 중 누가 어떤 판정을 했는지 알지 못하며 추정값도 기록하지 않았다.

작성 중 읽은 파일은 다음 네 개가 전부다.

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `pilot/evaluation/v4/heldout-evidence-v1.json`
3. `pilot/evaluation/v4/adjudication-schema-v1.json`
4. `pilot/evaluation/v4/heldout-seal-v1.json`

작성자는 A/B form, disagreement audit, 기존 v2/v3 보고서·fixture·audit·AI 결과, 구현 테스트, provider 결과를 읽지 않았다. provider/network/프로젝트 AI 호출, 7행·100행 실행, push, deploy도 하지 않았다. 이 attestation의 파일 SHA는 `pilot/evaluation/v4/resolver-protocol-seal-v1.json`에 고정한다.

## 1. 목적과 불변 경계

- 제3 adjudicator C가 A/B의 판정이나 불일치 정보를 전혀 보지 않고 동일한 10건 전체를 독립 판정하게 한다.
- C의 봉인된 판정 뒤에만 별도 deterministic aggregator가 A/B/C 원본을 읽는다. C와 methodology auditor에게 A/B 정보가 전달되어서는 안 된다.
- 최종 consensus와 gold/admission은 이 문서에 미리 고정한 기계 규칙으로만 산출한다. 토론, 재판정 요청, 사람의 한쪽 선택, 사후 가중치, 결과를 본 뒤의 기준 변경은 금지한다.
- 기존 preregistration, evidence, schema, seal, A/B blank/completed form과 그 seal/audit, 이후 생성되는 C blank/completed form과 모든 audit·normalization·consensus 산출물은 각각 불변 원본으로 보존한다. 수정·삭제·덮어쓰지 않고 새 versioned 파일만 추가한다.
- 이 resolver는 primary 판정을 소급 수정하지 않는다. resolver admission은 별도 이력으로 기록한다.
- 이 문서·resolver schema·resolver protocol seal의 정확한 SHA를 대상으로 한 독립 methodology audit가 먼저 `GO`가 되기 전에는 C form 생성·열람·판정·서명·봉인과 A/B/C 집계를 시작할 수 없다.
- resolver가 끝나더라도 기존 v4의 code/method audit와 provider 실행 admission 요건은 별도로 모두 충족해야 한다. 이 절차 자체는 provider/network 호출, 7행·100행 실행, Git push, 배포를 허가하지 않는다.

## 2. 역할 분리와 단계 순서

역할은 protocol author, methodology auditor, resolver C, form/seal custodian, deterministic aggregator로 분리한다. methodology auditor는 protocol author, A/B, C, aggregator 구현자와 다른 사람이어야 한다. C는 A/B 및 methodology auditor와 resolver 판정에 관해 대화하지 않는다. custodian은 파일 전달과 SHA 확인만 하고 의미 판정에 관여하지 않는다.

순서는 다음과 같으며 건너뛰거나 되돌릴 수 없다.

1. 이 문서, resolver schema, resolver protocol seal을 봉인한다. 현재 상태는 `methodologyAuditGo=false`, `resolverExecutionAuthorized=false`다.
2. 독립 methodology auditor가 3절의 정확한 read-list만 읽고 봉인 SHA, blind 분리, categorical core, 집계, gold, 수량·불변·실행 금지 규칙을 감사한다.
3. 감사 결과를 새 `pilot/evaluation/v4/resolver-methodology-audit-v1.json`에 기록한다. 하나라도 미충족이면 `NO-GO`이며 새 버전의 protocol/schema/seal 없이는 수정하거나 재감사하지 않는다.
4. `GO`인 경우에만 custodian이 schema로 `pilot/evaluation/v4/resolver-c-form-v1.blank.json`을 생성하고, blank form·audit 보고서·protocol/schema SHA를 새 `pilot/evaluation/v4/resolver-execution-seal-v1.json`에 봉인한다. 원 protocol seal을 수정하지 않는다.
5. C는 3절의 정확한 read-list만 읽고 10건 전부를 판정한다. C는 blind 상태에서 자기 form을 로컬 검증하고 완료할 수 있으나, completed form을 제출한 뒤에는 수정하지 않는다.
6. custodian은 completed form을 새 `pilot/evaluation/v4/resolver-c-adjudication-v1.json`으로 보존·봉인한다. 누락, schema 오류, false attestation, read-list 위반이 있으면 `unresolved/NO-GO`로 닫으며 C를 교체하거나 재실행하지 않는다.
7. C completed form의 SHA 봉인 뒤에만 aggregator가 A/B/C 원본을 처음 함께 읽고 4~7절을 그대로 실행한다. 결과는 새 normalization/consensus/admission 파일로 추가하며 입력 원본을 바꾸지 않는다.

## 3. 정확한 read-list

### 3.1 독립 methodology auditor

auditor가 읽을 수 있는 파일은 아래 일곱 개뿐이며, 순서는 무관하지만 집합은 정확히 같아야 한다.

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
3. `pilot/evaluation/v4/heldout-evidence-v1.json`
4. `pilot/evaluation/v4/adjudication-schema-v1.json`
5. `pilot/evaluation/v4/heldout-seal-v1.json`
6. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
7. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`

auditor는 A/B form·seal·disagreement audit·불일치 요약, v2/v3 보고서·fixture·audit·AI 결과, C form, 구현 결과를 읽지 않는다. audit 보고서에는 이 exact read-list와 각 SHA, 독립성, 배제 파일 미열람, 아래 필수 항목별 `GO/NO-GO`, 서명자 pseudonym, UTC 완료시각을 기록한다. 모든 항목이 `GO`일 때만 총결론이 `GO`일 수 있다.

필수 감사 항목은 protocol/schema/seal hash 일치, C의 10건 전체 blind 판정, free-text와 normative core 분리, A/B legacy normalization의 결정성, mismatch code/presence 결정성, case-level exact-core 2-of-3 및 필드별 다수결 금지, exact gold 파생, unresolved fail-closed, positive/negative 최소 수량, 네 언어 규칙, veto-only, 사후 변경 금지, 원본 불변 보존, provider/7/100/push/deploy 금지다.

### 3.2 resolver C

C가 읽을 수 있는 파일은 아래 일곱 개뿐이며, form attestation의 `filesRead`도 같은 순서와 값이어야 한다.

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
3. `pilot/evaluation/v4/heldout-evidence-v1.json`
4. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
5. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`
6. `pilot/evaluation/v4/resolver-c-form-v1.blank.json`
7. `pilot/evaluation/v4/resolver-execution-seal-v1.json`

C는 A/B form·seal·판정·합의·불일치 audit/요약, primary admission의 불일치 case/field/value, v2/v3 보고서·fixture·audit·AI 결과, methodology audit 본문, 구현 테스트·모델 결과를 읽지 않는다. C에게는 “A/B 중 적어도 한 불일치로 primary admission이 NO-GO였다”는 사실조차 전달하지 않는다. 인터넷 검색, provider/프로젝트 AI, 다른 사람과의 판정 대화도 금지한다. C는 제공 evidence와 사전등록 규칙만으로 모든 10건을 독립 판정한다.

## 4. resolver form과 controlled categorical core

resolver form은 `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`을 따른다. 각 case는 `status=completed`여야 하고 모든 categorical 값이 non-null이어야 한다. `nonNormativeNotes` 아래의 rationale 및 mismatch description은 설명 편의를 위한 자유서술이며 consensus, fingerprint, gold, admission에 절대 입력하지 않는다.

각 adjudicator/case의 유일한 normative fingerprint 입력은 다음 controlled core다.

- `caseId`
- semantic: `targetRelationToSource`, `referentTypeMatch`, `eventAndParticipantsMatch`, `necessaryConditionsMatch`, `mismatch.present`, `mismatch.codes`
- usage: `register`, `domain`, `temporal`, `regional`, `capitalization`, `mismatch.present`, `mismatch.codes`
- example: `verdict`, `evaluatedSourceExampleIds`, `targetSenseAttested`, `counterexampleSourceExampleId`, `mismatch.present`, `mismatch.codes`

case status, adjudicator 신원, timestamps, provenance seal SHA와 모든 자유서술은 core 밖이다. `evaluatedSourceExampleIds`는 evidence의 `source.examples.usable` 순서로 canonicalize한다. mismatch code는 아래 고정 순서로 중복 없이 배열화한다. object는 RFC 8785 JSON Canonicalization Scheme으로 직렬화하고 그 UTF-8 bytes의 SHA-256을 case fingerprint로 사용한다.

### 4.1 mismatch code와 presence

`mismatch.present`는 독립 의견 필드가 아니다. 해당 section의 canonical `mismatch.codes.length > 0`과 정확히 같아야 한다.

semantic code는 다음 규칙의 합집합이다.

- relation이 `target-narrower`, `target-broader`, `overlap`, `disjoint`, `insufficient`이면 각각 `SEM_RELATION_TARGET_NARROWER`, `SEM_RELATION_TARGET_BROADER`, `SEM_RELATION_OVERLAP`, `SEM_RELATION_DISJOINT`, `SEM_RELATION_INSUFFICIENT`
- 세 boolean 중 false이면 각각 `SEM_REFERENT_TYPE_FALSE`, `SEM_EVENT_PARTICIPANTS_FALSE`, `SEM_NECESSARY_CONDITIONS_FALSE`
- 위 categorical 필드로 표현되지 않는 별도 critical semantic mismatch가 명시적으로 존재하면 `SEM_CRITICAL_OTHER`

usage는 다섯 축 각각이 `target-only`, `conflict`, `unknown`일 때 `USAGE_<AXIS>_TARGET_ONLY`, `USAGE_<AXIS>_CONFLICT`, `USAGE_<AXIS>_UNKNOWN`을 넣는다. `<AXIS>`는 `REGISTER`, `DOMAIN`, `TEMPORAL`, `REGIONAL`, `CAPITALIZATION` 중 하나다. 별도 critical usage mismatch에는 `USAGE_CRITICAL_OTHER`를 넣는다. `match`, `source-only-preservable`, `not-applicable`은 mismatch code를 만들지 않는다.

example code는 다음 규칙의 합집합이다.

- verdict `fail` 또는 `insufficient`: `EXAMPLE_VERDICT_FAIL` 또는 `EXAMPLE_VERDICT_INSUFFICIENT`
- evaluated source example ID 집합이 evidence의 usable source example ID 집합과 정확히 다름: `EXAMPLE_SOURCE_COVERAGE_INCOMPLETE`
- `targetSenseAttested=false`: `EXAMPLE_TARGET_SENSE_UNATTESTED`
- `counterexampleSourceExampleId`가 non-null: `EXAMPLE_COUNTEREXAMPLE_PRESENT`
- 위 categorical 필드로 표현되지 않는 별도 critical example mismatch: `EXAMPLE_CRITICAL_OTHER`

`*_CRITICAL_OTHER`는 다른 code로 표현되지 않는 실제 critical mismatch가 있을 때만 normative하게 선택한다. C가 이 code를 쓰면 대응하는 non-normative description은 non-empty여야 하지만 그 문자열 자체는 fingerprint에 들어가지 않는다. schema 통과만으로 충분하지 않으며, unblinding 전 validator가 categories에서 파생되는 code, 고정 code 순서, presence를 재계산해 form 값과 byte-for-byte 일치하는지 확인한다.

### 4.2 A/B legacy form의 사전 고정 normalization

A/B 원본은 수정하지 않는다. aggregator는 기존 `bilingual-heldout-adjudication/v1`의 categorical 값을 동일 이름의 core 값으로 복사하고, example ID는 evidence 순서로 canonicalize한다. 위 규칙으로 code를 재계산한다. legacy `semantic.criticalMismatch`, `usage.criticalMismatch`, `exampleApplicability.criticalMismatch`가 non-null이면 해당 section에 각각 `SEM_CRITICAL_OTHER`, `USAGE_CRITICAL_OTHER`, `EXAMPLE_CRITICAL_OTHER`를 추가한다. 문자열의 문자·단어·표현·길이는 모두 버리고 null/non-null presence만 사용한다. `rationale`은 완전히 버린다.

따라서 legacy 자유서술의 문구 차이는 consensus에 영향을 주지 않지만, legacy critical mismatch의 presence 차이는 controlled `*_CRITICAL_OTHER` category 차이로 보존된다. completed A/B form에 null categorical 값, 잘못된 case 집합, coverage/provenance 오류가 있으면 해당 form은 normalization 불가이며 전체 resolver admission은 `unresolved/NO-GO`다. 사람이나 모델이 문자열 의미를 분류하거나 고쳐서는 안 된다.

## 5. A/B/C consensus 집계

각 case에서 validation과 normalization이 끝난 세 controlled core의 canonical bytes를 `A`, `B`, `C`라 한다.

- `A = B = C`: unanimous consensus로 그 core를 채택한다.
- 정확히 한 쌍만 같음(`A = B`, `A = C`, `B = C` 중 하나): case-level 2-of-3 consensus로 그 **전체 core**를 채택한다.
- 세 core가 모두 다름: `unresolved`다.
- schema/attestation/seal/read-list/10건 완결 검증 실패 또는 어느 form도 normalize할 수 없음: `unresolved`다.

필드별·section별 다수결은 **허용하지 않는다**. 서로 다른 두 명의 동의를 필드마다 조합한 hybrid fingerprint, tie-break 우선순위, A/B 가중, C 가중, 사람 선택, 평균, 유사도, 자유서술 해석도 금지한다. A/B가 같은 normalized core를 냈더라도 C는 반드시 10건 전부를 먼저 완료·봉인해야 한다. 집계 결과를 본 뒤 C나 A/B에게 설명·수정·재판정을 요청하지 않는다.

consensus 산출물은 case마다 세 input SHA/fingerprint, support (`ABC`, `AB`, `AC`, `BC`, `NONE`), 채택 core 또는 null, unresolved reason code를 기록한다. 이 값도 기계 생성하며 원본과 함께 불변 보존한다.

## 6. exact case-level gold와 admission

consensus core가 있는 case의 gold는 다음 조건을 **모두** 만족할 때만 `positive`다.

1. semantic relation이 `exact`
2. 세 semantic boolean이 모두 true
3. semantic mismatch code가 빈 배열이고 presence가 false
4. 다섯 usage 값이 각각 `match`, `source-only-preservable`, `not-applicable` 중 하나
5. usage mismatch code가 빈 배열이고 presence가 false
6. example verdict가 `pass`
7. `evaluatedSourceExampleIds`가 evidence의 usable source example ID 집합과 정확히 같음
8. `targetSenseAttested=true`
9. `counterexampleSourceExampleId=null`
10. example mismatch code가 빈 배열이고 presence가 false

조건 하나라도 충족하지 않으면 `negative`다. 자유서술은 이 파생에 사용하지 않는다. consensus가 없는 case에는 gold를 부여하지 않고 `unresolved`로 둔다.

최종 resolver admission은 정확히 10건 모두 case-level consensus가 있고, 그 기계 파생 gold에 positive가 최소 4건, negative가 최소 4건일 때만 `GO`다. 하나라도 unresolved이거나 수량이 부족하면 packet 전체가 `NO-GO`다. 결과를 본 뒤 사례를 교체·추가·삭제하거나, 필드를 합치거나, positive/negative 정의·수량·다수결 단위를 바꾸거나, resolver를 추가·교체·재실행하지 않는다. 새 시도는 기존 원본을 보존한 완전히 새로운 packet/protocol/schema/seal version과 사전 독립 audit가 필요하다.

## 7. 언어·증거 규칙: 원 v4와 동일하며 완화 금지

1. **문법적 복수와 lexical group sense**: 문법적 복수는 singular member sense와 정의가 같으면 별도 lexical group/collective sense가 아니다. 정의 자체가 구성원 개인이 아닌 집단 referent를 지시할 때만 별도 collective/group sense다. 복수형 예문이나 집합 문맥만으로 semantic exact를 승격하지 않는다.
2. **예문 목록의 비배타성**: source/target 예문 목록은 폐쇄 목록이 아니다. 목록에 어떤 문맥이 없다는 이유만으로 정의 범위를 좁히거나 `fail`로 만들지 않는다. usable source 예문 전부의 자연스러운 적용과 제공 target 예문 중 실제 target sense 입증 여부를 판정한다. source usable 예문 0개 또는 target 입증 없음은 `insufficient`이며, 구체적 의미 반례가 있을 때만 `fail`이다.
3. **한국어 대문자 비적용**: 한국어에는 영어식 대소문자 축을 직접 적용하지 않는다. 영어 source에 실제 capitalization evidence가 있으면 한국어 target conflict가 아니라 `source-only-preservable`, source 근거도 없으면 `unknown`이다. `match`나 `conflict`를 추정하지 않는다.
4. **source-only usage 보존**: source-only restriction의 metadata 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 `match`가 아니다. source restriction이 명시돼 보존 가능하면 `source-only-preservable`, 아니면 `unknown`, 명시적 모순 evidence가 있을 때만 `conflict`다.

## 8. deterministic rule은 계속 veto-only

- rule layer는 upstream approval을 차단할 수만 있고 false를 true로 바꿀 수 없다.
- semantic non-exact, usage `conflict`·`unknown`·`target-only`, example `fail`·`insufficient`, schema/provenance/example coverage 오류는 exact/pass/approval로 승격할 수 없다.
- 복수→집단 무근거 승격, 예문 목록의 폐쇄 목록 취급, 한국어 capitalization conflict 오적용, target metadata 부재의 match 처리, source-only usage를 이용한 semantic 승격은 모두 veto다.
- upstream approval이 false이면 다른 입력이 양호해도 최종 approval은 false다. resolver consensus나 2-of-3 자체가 upstream false를 승인으로 바꾸지 않는다.

## 9. 실행·변경 금지와 fail-closed 상태

현재 `finalGoldPresent=false`, `methodologyAuditGo=false`, `resolverExecutionAuthorized=false`, `resolverComplete=false`, `providerCallsAuthorized=false`, `heldoutGatePassed=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`, `gitPushAuthorized=false`, `productionDeployAuthorized=false`다.

독립 methodology audit `GO`와 별도 execution seal 전 C 실행은 금지한다. C가 끝나도 deterministic 집계와 독립 결과 audit 전에는 provider 호출을 허가하지 않는다. partial/invalid/unresolved 결과를 사람이 보완하지 않는다. 모든 원본과 실패 산출물도 보존하며, 어떤 admission 결과도 기존 v4의 더 엄격한 gate를 완화하지 않는다.
