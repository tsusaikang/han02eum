# 한영 의미 연결 v4 replacement blind re-adjudication 사전등록 v3

상태: **프로토콜 봉인 / 독립 methodology audit 전 / blank form·실행 금지 / 최종 gold 없음**  
계약 ID: `bilingual-meaning-link-v4-replacement-readjudication/v3`  
중립 round ID: `meaning-link-v4-blind-dual-10-v3`  
대상 packet: `meaning-link-v4-heldout-10-v1`

## 0. v2 폐쇄와 v3 변경 범위

`pilot/evaluation/v4/readjudication-methodology-audit-v2.json`은 v2를 `RDMA2-P1-001` 한 건으로 `NO-GO` 판정했다. v2 protocol/instructions/schema/seal/audit은 불변 보존하고 v2 blank form·execution seal·C/D 판정을 생성하거나 실행하지 않는다.

v3의 유일한 방법론 변경은 다음 모순 상태를 schema 수준에서 제거하는 것이다.

1. completed semantic에서 `targetRelationToSource=exact` iff `referentTypeMatch`, `eventAndParticipantsMatch`, `necessaryConditionsMatch`가 모두 true다.
2. completed semantic에서 relation이 non-exact이면 적어도 한 boolean이 false다.
3. capitalization은 sealed evidence에서 case별로 산출한 `source-only-preservable` 또는 `unknown` 상수만 허용한다. generic usage enum 선택을 허용하지 않는다.

v2 audit에서 `GO`였던 closed core, neutral C/D boundary, example coverage/verdict consistency, ordered 10-case C=D, no majority/tie-break, exact gold, 4+4, 네 언어 규칙, veto-only, 불변·사후 변경 금지, 모든 실행 gate는 그대로 유지한다.

## 1. 작성자 blind attestation과 불변 경계

v3 작성자는 원 sealed 네 파일, v1 protocol/schema/seal/audit, v2 protocol/instructions/schema/seal/audit만 읽었다. A/B form, disagreement audit, case/field/value 상세, v2/v3 outcome·fixture·AI 결과, 구현·provider 결과는 읽지 않았다. provider/network/프로젝트 AI 호출, 7행·100행 실행, push, deploy도 하지 않았다. 정확한 기존 입력 read-list와 SHA는 v3 protocol seal에 기록한다.

- A/B 및 v1 판정은 v3 consensus/gold/admission에 사용하지 않는다.
- C와 D는 결과를 모르는 서로 다른 adjudicator이며 동일 10건 전부를 새 v3 form으로 독립 판정한다.
- v1, v2, 각 audit과 v3 모든 산출물은 수정·삭제·덮어쓰지 않고 불변 보존한다.
- v3 methodology audit `GO` 전 blank form과 neutral execution seal을 생성하지 않는다.
- 결과를 본 뒤 schema, case 상수, core, 판정자, 비교·gold·수량 기준을 바꾸지 않는다.

## 2. evidence-only capitalization 재계산

capitalization 값은 adjudication 결과와 무관하게 sealed `heldout-evidence-v1.json`의 source qualifier, sense label, usable example에 실제로 표시된 영어 lemma capitalization만으로 계산했다. 문장 첫 글자의 일반 대문자나 lemma와 무관한 고유명사는 근거로 쓰지 않았다. 한국어 target에는 영어식 대소문자를 적용하지 않는다.

| case | source evidence | schema const |
|---|---|---|
| `HV4-01` | qualifier는 plural뿐이고 `fines`는 lowercase | `unknown` |
| `HV4-02` | qualifier/label에 capitalization 없음, `sound(s)`는 lowercase | `unknown` |
| `HV4-03` | qualifier/label에 capitalization 없음, `opened`는 lowercase | `unknown` |
| `HV4-04` | qualifier는 regional뿐이고 `bill`은 lowercase | `unknown` |
| `HV4-05` | usable example에 `Railway Interest`가 실제 표시됨 | `source-only-preservable` |
| `HV4-06` | qualifier는 countability뿐이고 `play`는 lowercase | `unknown` |
| `HV4-07` | usable examples에 `Puget Sound`, `Owen Sound`, `Long Island Sound`, `The Sound of Denmarke`가 실제 표시됨 | `source-only-preservable` |
| `HV4-08` | qualifier는 domain뿐이고 `cells`는 lowercase | `unknown` |
| `HV4-09` | qualifier/label에 capitalization 없음, `subject(s)`는 lowercase | `unknown` |
| `HV4-10` | qualifier/label에 capitalization 없음, `sounded`는 lowercase | `unknown` |

따라서 모든 case에서 capitalization `conflict`, `target-only`, `match`, `not-applicable`을 금지한다. `HV4-05`, `HV4-07`만 `source-only-preservable`, 나머지 8건은 `unknown`을 case-level `const`로 강제한다. 이 표는 예상 semantic/example 판정이나 gold를 포함하지 않는다.

## 3. 역할, 순서, neutral boundary

protocol author, 독립 methodology auditor, C, D, form/seal custodian, deterministic comparator를 분리한다. auditor는 author, C, D, comparator 구현자와 다른 사람이다. C/D는 서로 대화하거나 상대 form을 보지 않는다.

1. 이 author protocol, neutral instructions v3, schema v3, protocol seal v3를 봉인한다.
2. auditor가 4.1 exact read-list만 읽고 `RDMA2-P1-001` closure와 유지 계약을 감사한다.
3. 새 `pilot/evaluation/v4/readjudication-methodology-audit-v3.json`의 모든 항목이 `GO`일 때만 C/D blank form을 생성한다.
4. custodian은 evidence, neutral instructions, schema, C blank, D blank의 path/SHA만 담은 중립 `readjudication-execution-seal-v3.json`을 생성한다.
5. C/D는 각자 exact neutral list만 읽고 10건 전체를 완료한다. 두 completed form을 각각 봉인하기 전 상호 공개하지 않는다.
6. 두 form 봉인 뒤 comparator가 ordered 10-case core를 생성해 byte-for-byte C=D인지 확인한다. comparator 입력에 A/B나 v1/v2 판정은 없다.
7. 한 차이라도 있거나 validation/gate 오류가 있으면 추가 resolver 없이 packet을 닫고 원본을 보존한다.

## 4. exact read-list

### 4.1 후속 methodology auditor v3

auditor는 다음 열일곱 파일만 읽는다.

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
3. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V2.md`
4. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V3.md`
5. `pilot/evaluation/v4/heldout-evidence-v1.json`
6. `pilot/evaluation/v4/adjudication-schema-v1.json`
7. `pilot/evaluation/v4/heldout-seal-v1.json`
8. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
9. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`
10. `pilot/evaluation/v4/resolver-methodology-audit-v1.json`
11. `pilot/evaluation/v4/readjudication-instructions-v2.md`
12. `pilot/evaluation/v4/readjudication-schema-v2.json`
13. `pilot/evaluation/v4/readjudication-protocol-seal-v2.json`
14. `pilot/evaluation/v4/readjudication-methodology-audit-v2.json`
15. `pilot/evaluation/v4/readjudication-instructions-v3.md`
16. `pilot/evaluation/v4/readjudication-schema-v3.json`
17. `pilot/evaluation/v4/readjudication-protocol-seal-v3.json`

auditor는 A/B form·seal·disagreement detail, C/D form, outcome·fixture·AI 결과, 구현·모델 결과를 읽지 않는다. audit는 exact SHA/read set, 독립성, v2 audit preservation, semantic iff 양방향 schema 강제, non-exact false witness, case별 capitalization 근거와 const, 금지 capitalization 값 거부, 기존 example consistency, neutral boundary, closed core, C=D 10/10, no majority/tie-break, gold·4+4, 네 규칙, veto-only와 모든 금지 gate를 항목별로 확인한다. 하나라도 미충족이면 총결론은 `NO-GO`다.

### 4.2 adjudicator C

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v3.md`
3. `pilot/evaluation/v4/readjudication-schema-v3.json`
4. `pilot/evaluation/v4/readjudication-c-form-v3.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v3.json`

### 4.3 adjudicator D

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v3.md`
3. `pilot/evaluation/v4/readjudication-schema-v3.json`
4. `pilot/evaluation/v4/readjudication-d-form-v3.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v3.json`

C/D는 author-facing 문서, 원 preregistration, v1/v2 파일·audit, v3 protocol seal·method audit, A/B 또는 상대 form을 읽지 않는다. 과거 상태, 실패, 불일치, 예상 label, case 역할, 수량을 전달하지 않는다.

neutral execution seal의 top-level 필드는 `schemaVersion`, `manifestId`, `packetId`, `caseCount`, `sealedFiles`만 허용한다. `sealedFiles`는 evidence, v3 neutral instructions, v3 schema, C blank, D blank의 path/SHA만 담는다. audit·history·decision·status·consensus·gold·admission·authorization 정보를 넣지 않는다.

## 5. schema-enforced closed core

form의 normative core는 semantic relation과 세 boolean, usage 다섯 축, example verdict·ordered evaluated IDs·target attestation·counterexample ID뿐이다. 모든 값은 closed enum/boolean/case-bound ID다. `nonNormativeNotes`의 내용과 presence는 fingerprint, mismatch, gold에 사용하지 않으며 catch-all code는 없다.

completed semantic은 schema의 `completedSemantic.oneOf`로 두 분기만 허용한다.

- exact branch: relation `exact`와 세 boolean true
- non-exact branch: 다섯 non-exact relation 중 하나와 적어도 한 boolean false

completed usage는 capitalization을 `source-only-preservable|unknown`으로만 좁힌 뒤, 각 case prefix schema가 2절의 정확한 값을 `const`로 강제한다. example은 v2와 동일하게 case별 usable ID 전체 coverage와 pass/fail/insufficient 일관성을 강제한다.

semantic mismatch code는 non-exact relation과 false boolean, usage mismatch code는 `target-only|conflict|unknown`, example mismatch code는 fail/insufficient·coverage·unattested·counterexample에서 고정 순서로만 기계 파생한다. 각 section의 presence는 codes non-empty와 같다. 다른 code와 자유서술 분류는 없다.

각 case core와 `HV4-01`~`HV4-10` 배열은 RFC 8785 JCS UTF-8로 canonicalize하고 SHA-256을 기록한다.

### 정적 contradiction witness 요구

audit 전 정적 검증은 적어도 다음을 증명해야 한다.

- valid completed baseline은 schema가 수락한다.
- `exact` + 어느 semantic boolean false는 거부한다.
- non-exact + 세 boolean all true는 거부한다.
- `HV4-01 capitalization=conflict`는 거부한다.
- `HV4-01 capitalization=source-only-preservable`는 거부한다.
- `HV4-05 capitalization=unknown`는 거부한다.

validator 실행이 불가능하면 `completedSemantic.oneOf`, non-exact branch의 `anyOf false`, completed capitalization enum과 case prefix `const`를 구조 검사해 같은 결론을 기록한다.

## 6. C=D exact consensus, gold, 수량

두 completed form 모두 독립 봉인되고 validation이 성공한 뒤에만 ordered 10-case core 배열을 비교한다. `C_core_bytes == D_core_bytes`일 때만 10/10 consensus다. 한 normative field·derived code·presence라도 다르면 전체 `NO-GO`다.

field/section/case majority, 부분 consensus 조합, tie-break, 추가 adjudicator, 한쪽 선택, 가중치, 평균, 토론, 자유서술 해석, 기존 A/B normalization은 금지한다.

consensus 뒤 case gold는 다음을 모두 만족할 때만 `positive`, 아니면 `negative`다.

1. relation `exact`, 세 semantic boolean true, semantic mismatch empty/false
2. 각 usage가 `match|source-only-preservable|not-applicable`, usage mismatch empty/false
3. example `pass`, full usable-ID coverage, target attested true, counterexample null, example mismatch empty/false

10/10 consensus와 positive 최소 4, negative 최소 4를 모두 충족할 때만 admission `GO`다. unresolved·validation 오류·수량 부족은 packet 전체 `NO-GO`이며 결과 뒤 case/기준/수량/판정자를 변경하지 않는다.

## 7. 네 언어 규칙과 veto-only 유지

1. 문법적 복수만으로 lexical group/collective sense를 만들거나 semantic exact를 승격하지 않는다.
2. 예문 목록은 비배타적이다. 문맥 부재는 `fail` 근거가 아니며, usable source 0 또는 target 입증 없음은 `insufficient`, 구체적 반례만 `fail`이다.
3. 한국어에는 영어식 capitalization을 적용하지 않는다. 실제 source 표시가 있으면 `source-only-preservable`, 없으면 `unknown`이다.
4. source-only restriction 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 `match`가 아니며, 명시적 모순만 `conflict`다.

deterministic rule은 upstream true를 veto할 수만 있고 false를 true로 바꾸지 않는다. semantic non-exact, usage `conflict|unknown|target-only`, example `fail|insufficient`, schema/provenance/coverage 오류는 승인으로 승격할 수 없다. 네 규칙 위반은 모두 veto다.

## 8. 현재 fail-closed 상태

현재 `finalGoldPresent=false`, `methodologyAuditGo=false`, `blankFormsAuthorized=false`, `executionAuthorized=false`, `readjudicationComplete=false`, `consensusComplete=false`, `providerCallsAuthorized=false`, `heldoutGatePassed=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`, `gitPushAuthorized=false`, `productionDeployAuthorized=false`다.

독립 methodology audit `GO` 전 blank form·neutral execution seal·C/D 실행은 금지한다. C=D와 결과 audit 뒤에도 원 v4의 모든 code/method/provider gate 전 provider 호출은 계속 0회다. 7행·100행, push, deploy는 별도 명시 승인 없이는 금지한다.
