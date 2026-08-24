# 한영 의미 연결 v4 replacement blind re-adjudication 사전등록 v2

상태: **프로토콜 봉인 단계 / 독립 methodology audit 전 / blank form·실행 금지 / 최종 gold 없음**  
계약 ID: `bilingual-meaning-link-v4-replacement-readjudication/v2`  
중립 round ID: `meaning-link-v4-blind-dual-10-v2`  
대상 packet: `meaning-link-v4-heldout-10-v1`

## 0. v1 폐쇄와 작성자 attestation

`pilot/evaluation/v4/resolver-methodology-audit-v1.json`은 v1 resolver methodology를 P1 3건으로 `NO-GO` 판정했다. v1 protocol/schema/seal/audit은 그 상태로 불변 보존하며 v1 C form은 생성하거나 실행하지 않는다.

v2는 세 finding을 다음처럼 구조적으로 제거한다.

- `RMA-P1-001`: author-facing history와 C/D-facing neutral material을 완전히 분리한다. C/D exact read-list에는 primary/resolver 상태, 실패, `NO-GO`, 불일치 존재를 알리는 파일이 없다.
- `RMA-P1-002`: legacy free-text mismatch를 normalize하지 않고 기존 A/B form 전체를 입력에서 제외한다. C/D는 새 schema의 closed categorical 필드를 처음부터 직접 판정하며 mismatch는 그 필드에서만 기계 파생한다. catch-all normative code는 없다.
- `RMA-P1-003`: 2-of-3 또는 어떤 majority도 사용하지 않는다. C와 D의 전체 10-case normative core가 byte-for-byte 같을 때만 consensus다.

이 v2 작성자가 기존 프로젝트 입력으로 읽은 파일은 아래 여덟 개뿐이다.

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `pilot/evaluation/v4/heldout-evidence-v1.json`
3. `pilot/evaluation/v4/adjudication-schema-v1.json`
4. `pilot/evaluation/v4/heldout-seal-v1.json`
5. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
6. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
7. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`
8. `pilot/evaluation/v4/resolver-methodology-audit-v1.json`

작성자는 A/B form, disagreement audit, 어느 case/field/value가 달랐는지에 관한 상세, v2/v3 보고서·fixture·audit·AI 결과, 구현·provider 결과를 읽지 않았다. provider/network/프로젝트 AI 호출, 7행·100행 실행, push, deploy도 하지 않았다. exact SHA는 v2 protocol seal에 고정한다.

## 1. replacement round의 권한과 불변 경계

- 기존 A/B round는 원 v4 규칙에 따라 실패한 별도 불변 이력으로 남는다. A/B 판정, fingerprint, 합의 여부, 불일치 값은 v2 validation, comparison, consensus, gold, admission에 전혀 사용하지 않는다.
- v2는 A/B 결과를 salvage하거나 한쪽을 선택하는 resolver가 아니다. 같은 sealed evidence와 완화되지 않은 언어·증거 규칙을 사용하되, 결과를 전혀 모르는 새로운 adjudicator C와 D가 처음부터 수행하는 완전한 replacement blind adjudication round다.
- 원 v4의 “두 독립 adjudicator 전 필드 exact agreement” 원칙을 C/D pair에 그대로 적용한다. majority 금지는 유지된다. C/D 중 한 필드라도 다르면 전체 round를 닫는다.
- 기존 네 원본, v1 protocol/schema/seal/audit, 새 v2 protocol/instructions/schema/seal, 이후 blank/completed C/D form, execution seal, validation·comparison·audit 산출물을 각각 불변 보존한다. 수정·삭제·덮어쓰기하지 않고 새 versioned 파일만 추가한다.
- 결과를 본 뒤 taxonomy, core, 비교 단위, gold 조건, 수량 gate, read-list, 판정자를 변경하지 않는다.
- 이 절차는 provider/network 호출, 7행·100행 실행, Git push, 배포를 허가하지 않는다.

## 2. 역할 분리와 되돌릴 수 없는 순서

protocol author, 독립 methodology auditor, adjudicator C, adjudicator D, form/seal custodian, deterministic comparator를 분리한다. auditor는 author, C, D, comparator 구현자와 다른 사람이어야 한다. C와 D는 서로 다른 사람이며 서로 대화하거나 form을 보지 않는다. custodian은 SHA·파일 전달만 담당하고 의미 판정에 관여하지 않는다.

1. 이 author-facing 문서, neutral instructions, v2 schema, v2 protocol seal을 봉인한다. 현재 `methodologyAuditGo=false`, `blankFormsAuthorized=false`, `executionAuthorized=false`다.
2. 독립 methodology auditor가 3.1의 exact read-list만 읽고 v1 P1 세 건의 disposition, neutral information boundary, closed core, C=D 규칙, 언어·증거 규칙, gate와 SHA를 감사한다.
3. 결과를 새 `pilot/evaluation/v4/readjudication-methodology-audit-v2.json`에 기록한다. 하나라도 미충족이면 `NO-GO`이며 v2 blank form을 생성하지 않는다. 수정은 기존 v2를 보존한 새 version에서만 가능하다.
4. methodology audit가 exact v2 SHA에 대해 `GO`인 경우에만 custodian이 schema로 C/D blank form을 각각 생성한다.
5. custodian은 evidence, neutral instructions, schema, C blank, D blank의 SHA만 담은 중립 `pilot/evaluation/v4/readjudication-execution-seal-v2.json`을 생성한다. 이 manifest에는 audit·과거 판정·실패·합의·gold·admission·authorization 상태를 넣지 않는다.
6. C와 D는 각자 3.2/3.3의 exact neutral read-list만 읽고 동일 10건 전부를 독립 판정한다. 각 completed form은 상대에게 공개하기 전에 별도 새 파일로 봉인한다.
7. C와 D completed form 모두 봉인된 뒤에만 deterministic comparator가 처음 함께 읽는다. comparator는 A/B 또는 v1 판정 산출물을 읽거나 입력으로 받지 않는다.
8. 5~7절의 exact equality와 gate를 기계 실행한다. 결과를 본 뒤 설명·수정·재판정·추가 adjudicator를 요청하지 않는다.

## 3. exact read-list와 정보 경계

### 3.1 후속 독립 methodology auditor

auditor의 read-list는 아래 열두 파일과 정확히 같아야 한다.

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
3. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V2.md`
4. `pilot/evaluation/v4/heldout-evidence-v1.json`
5. `pilot/evaluation/v4/adjudication-schema-v1.json`
6. `pilot/evaluation/v4/heldout-seal-v1.json`
7. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
8. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`
9. `pilot/evaluation/v4/resolver-methodology-audit-v1.json`
10. `pilot/evaluation/v4/readjudication-instructions-v2.md`
11. `pilot/evaluation/v4/readjudication-schema-v2.json`
12. `pilot/evaluation/v4/readjudication-protocol-seal-v2.json`

auditor는 A/B form·seal·disagreement detail, C/D form, v2/v3 보고서·fixture·audit·AI 결과, 구현·모델 결과를 읽지 않는다. audit는 exact read set과 SHA, 독립성, 역할 분리, P1-001/002/003 각각의 closure, neutral 문서/manifest의 무상태성, C/D 10건 전부, closed taxonomy, free-text 완전 제외, C=D exact equality, majority/tie-break 금지, gold·4+4, 네 언어 규칙, veto-only, 불변 보존, 사후 변경 금지, 0-call/7/100/push/deploy gate를 항목별로 기록한다. 모든 항목이 `GO`일 때만 총결론이 `GO`다.

### 3.2 adjudicator C

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v2.md`
3. `pilot/evaluation/v4/readjudication-schema-v2.json`
4. `pilot/evaluation/v4/readjudication-c-form-v2.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v2.json`

### 3.3 adjudicator D

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v2.md`
3. `pilot/evaluation/v4/readjudication-schema-v2.json`
4. `pilot/evaluation/v4/readjudication-d-form-v2.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v2.json`

C/D는 author-facing preregistration, 원 preregistration, heldout seal, v1 protocol/schema/audit, v2 protocol seal, methodology audit, A/B 또는 상대 form, 그 밖의 프로젝트 파일을 읽지 않는다. 누군가 C/D에게 과거 판정·실패·불일치·예상 label·case 역할·수량을 말하지 않는다. exact neutral list 밖의 파일이나 대화를 접하면 해당 form은 무효이고 전체 round는 `NO-GO`다.

중립 execution seal은 다음 top-level 값만 가질 수 있다: `schemaVersion`, `manifestId`, `packetId`, `caseCount`, `sealedFiles`. `sealedFiles`는 evidence, neutral instructions, v2 schema, C blank, D blank의 path와 SHA만 담는다. status, decision, audit, history, prior/primary/resolver, failure/NO-GO, disagreement, consensus, gold, admission, vote, authorization 관련 필드나 설명 문자열은 금지한다.

## 4. closed normative core와 mismatch 파생

v2 form의 `normative` 필드는 다음으로 완결된다.

- semantic: `targetRelationToSource`, `referentTypeMatch`, `eventAndParticipantsMatch`, `necessaryConditionsMatch`
- usage: `register`, `domain`, `temporal`, `regional`, `capitalization`
- example: `verdict`, `evaluatedSourceExampleIds`, `targetSenseAttested`, `counterexampleSourceExampleId`

모든 값은 schema의 closed enum/boolean/packet-bound ID다. completed form에는 null categorical 값이 없어야 한다. usable source example ID는 case별 evidence에 고정하며 전부 evidence 순서로 기록한다. counterexample ID는 해당 case의 usable source example ID 또는 null만 가능하다.

`nonNormativeNotes`의 문자열은 core에 들어가지 않는다. 문자열 내용뿐 아니라 null/non-null presence, 문자열 존재 여부, 길이도 validation의 `*_OTHER` 신호나 mismatch로 변환하지 않는다. catch-all normative category와 사람/모델의 자유서술 분류는 금지한다.

각 case의 canonical core는 위 normative 필드에 다음 **기계 파생** mismatch를 추가한 object다. adjudicator는 code/presence를 입력하지 않는다.

### 4.1 semantic mismatch

고정 code 순서는 다음과 같다.

1. `SEM_RELATION_TARGET_NARROWER`
2. `SEM_RELATION_TARGET_BROADER`
3. `SEM_RELATION_OVERLAP`
4. `SEM_RELATION_DISJOINT`
5. `SEM_RELATION_INSUFFICIENT`
6. `SEM_REFERENT_TYPE_FALSE`
7. `SEM_EVENT_PARTICIPANTS_FALSE`
8. `SEM_NECESSARY_CONDITIONS_FALSE`

relation이 해당 non-exact 값이면 대응 code를 넣고, 세 boolean이 false이면 각각 대응 code를 넣는다. 다른 semantic code는 존재하지 않는다.

### 4.2 usage mismatch

축 순서는 `REGISTER`, `DOMAIN`, `TEMPORAL`, `REGIONAL`, `CAPITALIZATION`이다. 각 축 안에서 값 순서는 `TARGET_ONLY`, `CONFLICT`, `UNKNOWN`이다. 축 값이 `target-only`, `conflict`, `unknown`일 때 각각 `USAGE_<AXIS>_TARGET_ONLY`, `USAGE_<AXIS>_CONFLICT`, `USAGE_<AXIS>_UNKNOWN`을 넣는다. `match`, `source-only-preservable`, `not-applicable`은 code를 만들지 않는다. 다른 usage code는 존재하지 않는다.

### 4.3 example mismatch

고정 code 순서는 다음과 같다.

1. `EXAMPLE_VERDICT_FAIL`
2. `EXAMPLE_VERDICT_INSUFFICIENT`
3. `EXAMPLE_SOURCE_COVERAGE_INCOMPLETE`
4. `EXAMPLE_TARGET_SENSE_UNATTESTED`
5. `EXAMPLE_COUNTEREXAMPLE_PRESENT`

verdict, exact usable-ID set equality, target attestation, counterexample nullness에서만 위 code를 파생한다. completed form의 source coverage는 schema상 완전해야 하므로 incomplete coverage는 form validation 실패와 전체 `NO-GO`를 일으키며 admitted core가 될 수 없다. `pass`는 full coverage·target attested true·counterexample null, `fail`은 usable counterexample ID non-null, `insufficient`는 counterexample null·target attested false여야 한다. 다른 example code는 존재하지 않는다.

각 section의 `mismatch.present`는 파생 code 배열이 non-empty인지와 정확히 같다. mismatch object에는 고정 순서의 `codes`와 `present`만 넣는다. free-text는 어떤 단계에서도 참조하지 않는다.

case core object key와 10-case 배열 순서는 schema에 고정한다. RFC 8785 JSON Canonicalization Scheme의 UTF-8 bytes를 normative bytes로 삼고 SHA-256을 기록한다. completed form의 schema·seal·attestation·coverage·일관성 검증이 먼저 모두 성공해야 core를 생성할 수 있다.

## 5. C=D exact unanimity와 packet 폐쇄

C와 D completed form을 각각 봉인하기 전에는 상대 form을 공개하거나 비교하지 않는다. 두 form이 모두 봉인된 뒤 case ID `HV4-01`부터 `HV4-10`까지의 canonical core 배열 `C_core_bytes`, `D_core_bytes`를 생성한다.

- `C_core_bytes`와 `D_core_bytes`가 byte-for-byte 같을 때만 10/10 consensus다.
- 어느 case의 어느 normative field 또는 파생 code/presence라도 다르면 두 배열은 다르며 전체 round가 `NO-GO`다.
- schema/seal/attestation/read-list/independence/coverage/consistency 오류, 누락·중복 case도 전체 `NO-GO`다.

필드별, section별, case별 majority는 모두 금지한다. 부분 case consensus를 조합하지 않는다. resolver tie-break, 제3 adjudicator, 한쪽 선택, 가중치, 평균, 유사도, 토론, 자유서술 해석, 기존 A/B normalization/투표는 전부 금지한다. mismatch 또는 오류가 하나라도 있으면 추가 resolver 없이 이 packet을 닫고 모든 산출물을 보존한다.

## 6. exact gold와 수량 gate

10-case core 전체가 C=D일 때만 각 consensus case의 gold를 기계 파생한다. 다음을 모두 만족하면 `positive`, 하나라도 아니면 `negative`다.

1. semantic relation이 `exact`
2. 세 semantic boolean이 모두 true
3. semantic mismatch codes가 empty이고 presence가 false
4. 다섯 usage 값이 각각 `match`, `source-only-preservable`, `not-applicable` 중 하나
5. usage mismatch codes가 empty이고 presence가 false
6. example verdict가 `pass`
7. evaluated source example ID가 evidence의 usable ID 전부와 정확히 같음
8. `targetSenseAttested=true`
9. `counterexampleSourceExampleId=null`
10. example mismatch codes가 empty이고 presence가 false

admission은 10/10 consensus와 positive 최소 4건, negative 최소 4건을 모두 만족할 때만 `GO`다. 수량이 부족하면 packet을 `NO-GO`로 닫는다. C/D에게 수량 gate나 중간 count를 알려 판정을 조정하게 하지 않는다. 결과를 본 뒤 case를 교체·추가·삭제하거나 기준·taxonomy·수량을 바꾸지 않는다.

## 7. 네 언어·증거 규칙: 완화 없음

1. **문법적 복수와 lexical group sense**: 문법적 복수는 singular member sense와 정의가 같으면 별도 lexical group/collective sense가 아니다. 정의 자체가 구성원 개인이 아닌 집단 referent를 지시할 때만 별도 collective/group sense다. 복수형 예문이나 집합 문맥만으로 semantic exact를 승격하지 않는다.
2. **예문 목록의 비배타성**: source/target 예문 목록은 폐쇄 목록이 아니다. 목록에 어떤 문맥이 없다는 이유만으로 정의 범위를 좁히거나 `fail`로 만들지 않는다. usable source 예문 전부의 자연스러운 적용과 제공 target 예문 중 실제 target sense 입증 여부를 판정한다. source usable 예문 0개 또는 target 입증 없음은 `insufficient`이며, 구체적 의미 반례가 있을 때만 `fail`이다.
3. **한국어 대문자 비적용**: 한국어에는 영어식 대소문자 축을 직접 적용하지 않는다. 영어 source에 실제 capitalization evidence가 있으면 한국어 target conflict가 아니라 `source-only-preservable`, source 근거도 없으면 `unknown`이다. `match`나 `conflict`를 추정하지 않는다.
4. **source-only usage 보존**: source-only restriction의 metadata 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 `match`가 아니다. source restriction이 명시돼 보존 가능하면 `source-only-preservable`, 아니면 `unknown`, 명시적 모순 evidence가 있을 때만 `conflict`다.

## 8. deterministic rule은 veto-only

- rule layer는 upstream approval을 차단할 수만 있고 false를 true로 바꿀 수 없다.
- semantic non-exact, usage `conflict`·`unknown`·`target-only`, example `fail`·`insufficient`, schema/provenance/example coverage 오류는 exact/pass/approval로 승격할 수 없다.
- 복수→집단 무근거 승격, 예문 목록의 폐쇄 목록 취급, 한국어 capitalization conflict 오적용, target metadata 부재의 match 처리, source-only usage를 이용한 semantic 승격은 모두 veto다.
- C=D는 필요한 consensus 조건일 뿐 upstream false를 true로 바꾸지 않는다.

## 9. 현재 fail-closed 상태

현재 `finalGoldPresent=false`, `methodologyAuditGo=false`, `blankFormsAuthorized=false`, `executionAuthorized=false`, `readjudicationComplete=false`, `consensusComplete=false`, `providerCallsAuthorized=false`, `heldoutGatePassed=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`, `gitPushAuthorized=false`, `productionDeployAuthorized=false`다.

독립 methodology audit `GO` 전 blank C/D form과 neutral execution seal을 생성하거나 판정을 시작하지 않는다. C/D exact consensus와 별도 결과 audit가 끝나도 원 v4의 모든 code/method/provider admission gate가 충족되기 전 provider 호출은 계속 0회다. 기존 7행·100행, push, deploy는 별도 명시 승인 없이는 금지한다.
