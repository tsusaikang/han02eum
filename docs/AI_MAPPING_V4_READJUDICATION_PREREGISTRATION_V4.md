# 한영 의미 연결 v4 replacement blind re-adjudication 사전등록 v4

상태: **프로토콜 봉인 / 독립 methodology audit 전 / blank form·실행 금지 / 최종 gold 없음**  
계약 ID: `bilingual-meaning-link-v4-replacement-readjudication/v4`  
중립 round ID: `meaning-link-v4-blind-dual-10-v4`  
대상 packet: `meaning-link-v4-heldout-10-v1`

## 0. v3 폐쇄와 단일 수정 범위

`pilot/evaluation/v4/readjudication-methodology-audit-v3.json`은 v3를 `RDMA3-P1-001` 한 건으로 `NO-GO` 판정했다. v1~v3 protocol/instructions/schema/seal과 모든 audit은 불변 보존하고 어떤 이전 blank form·execution seal·C/D 판정도 생성하거나 실행하지 않는다.

v4는 capitalization evidence 기준만 바로잡는다.

- source sense-level English capitalization restriction은 `usageMetadata.rawGlossQualifier` 또는 `usageMetadata.senseLabels`에 명시된 capitalization 정보로만 인정한다.
- 예문의 문장 첫 글자, 고유명, 인용문 안 대문자는 문맥 표기이며 sense-level usage metadata가 아니다.
- sealed packet 10건 모두에 sense-level capitalization qualifier/label이 없으므로 `HV4-01`~`HV4-10`의 completed `usage.capitalization`을 모두 `unknown`으로 고정한다.

v3 audit에서 통과한 semantic exact iff all-three-true, non-exact any-false, example consistency, closed core, neutral C/D boundary, ordered 10-case C=D, no majority/tie-break, exact gold·4+4, 네 언어 규칙, veto-only와 모든 gate는 변경하지 않는다.

## 1. 작성자 attestation과 불변 경계

v4 작성자는 원 sealed 네 파일, v1 protocol/schema/seal/audit, v2 protocol/instructions/schema/seal/audit, v3 protocol/instructions/schema/seal/audit만 읽었다. A/B form, disagreement audit, case/field/value 상세, outcome·fixture·AI 결과, 구현·provider 결과는 읽지 않았다. provider/network/프로젝트 AI 호출, 7행·100행 실행, push, deploy도 하지 않았다. exact 기존 입력 read-list와 SHA는 v4 protocol seal에 기록한다.

- A/B 및 이전 resolver/readjudication 판정은 v4 consensus/gold/admission에 사용하지 않는다.
- 결과를 모르는 새로운 C와 D가 동일 10건 전체를 v4 form으로 독립 판정한다.
- 모든 기존/신규 파일과 실패 산출물을 수정·삭제·덮어쓰지 않는다.
- v4 methodology audit `GO` 전 blank form과 neutral execution seal을 만들지 않는다.
- 결과를 본 뒤 schema, core, case 상수, 판정자, 비교·gold·수량 기준을 바꾸지 않는다.

## 2. all-ten capitalization evidence 판정

packet의 각 source sense에 대해 `rawGlossQualifier`와 `senseLabels`를 다시 확인했다. 표에 든 qualifier/label은 plural, definition hint, region, countability, domain 또는 null뿐이며 capitalization restriction을 명시하지 않는다.

| cases | sense-level capitalization qualifier/label | example capitals의 지위 | v4 const |
|---|---|---|---|
| `HV4-01`~`HV4-10` 전체 | 없음 | 문장 첫 글자·고유명·인용문 표기는 usage metadata 아님 | `unknown` |

특히 `Railway Interest`는 인용된 역사적 고유명이고 같은 sense에 lowercase `the iron interest; the cotton interest`도 있다. `Puget Sound`, `Owen Sound`, `Long Island Sound`, `The Sound of Denmarke`는 지리 고유명이다. 이 표기는 common sense 자체의 capitalization restriction을 만들지 않는다. 따라서 v4 schema는 completed capitalization에 global `const=unknown`과 각 10개 case prefix의 `const=unknown`을 함께 적용한다.

`source-only-preservable`, `conflict`, `target-only`, `match`, `not-applicable`은 모든 case에서 schema-invalid다. capitalization `unknown`은 usage mismatch/veto로 그대로 보존하며 semantic이나 example을 승격하지 않는다.

## 3. 순서와 neutral information boundary

protocol author, 독립 methodology auditor, C, D, form/seal custodian, deterministic comparator를 분리한다. auditor는 author/C/D/comparator 구현자와 다른 사람이고 C와 D도 서로 다른 사람이다.

1. v4 author protocol, neutral instructions, schema, protocol seal을 봉인한다.
2. auditor가 4.1 exact 22-file read-list만 읽고 capitalization closure와 유지 계약을 감사한다.
3. 새 `pilot/evaluation/v4/readjudication-methodology-audit-v4.json`의 모든 항목이 `GO`일 때만 C/D blank form을 생성한다.
4. custodian은 evidence, v4 neutral instructions, v4 schema, C blank, D blank의 path/SHA만 담은 neutral execution seal을 만든다.
5. C/D는 각자 exact neutral 5-file list만 읽고 10건을 독립 완료·별도 봉인한다.
6. 두 form 봉인 뒤 comparator가 ordered 10-case controlled core의 byte-for-byte C=D만 확인한다. A/B와 이전 판정은 comparator 입력에 없다.
7. 한 차이 또는 validation/gate 오류라도 있으면 추가 resolver 없이 packet을 닫고 전부 보존한다.

## 4. exact read-list

### 4.1 methodology auditor v4 — 정확히 22파일

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
3. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V2.md`
4. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V3.md`
5. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V4.md`
6. `pilot/evaluation/v4/heldout-evidence-v1.json`
7. `pilot/evaluation/v4/adjudication-schema-v1.json`
8. `pilot/evaluation/v4/heldout-seal-v1.json`
9. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
10. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`
11. `pilot/evaluation/v4/resolver-methodology-audit-v1.json`
12. `pilot/evaluation/v4/readjudication-instructions-v2.md`
13. `pilot/evaluation/v4/readjudication-schema-v2.json`
14. `pilot/evaluation/v4/readjudication-protocol-seal-v2.json`
15. `pilot/evaluation/v4/readjudication-methodology-audit-v2.json`
16. `pilot/evaluation/v4/readjudication-instructions-v3.md`
17. `pilot/evaluation/v4/readjudication-schema-v3.json`
18. `pilot/evaluation/v4/readjudication-protocol-seal-v3.json`
19. `pilot/evaluation/v4/readjudication-methodology-audit-v3.json`
20. `pilot/evaluation/v4/readjudication-instructions-v4.md`
21. `pilot/evaluation/v4/readjudication-schema-v4.json`
22. `pilot/evaluation/v4/readjudication-protocol-seal-v4.json`

auditor는 A/B form·seal·disagreement detail, C/D form, outcome·fixture·AI 결과, 구현·모델 결과를 읽지 않는다. audit는 exact SHA/read set, 역할 분리, 이전 파일 불변, `RDMA3-P1-001` closure, all-ten unknown const, forbidden capitalization witness, semantic iff/non-exact false, example consistency, neutral boundary, closed core, C=D, no majority, gold·4+4, 네 규칙, veto-only와 금지 gate를 항목별로 확인한다. 하나라도 미충족이면 총결론은 `NO-GO`다.

### 4.2 adjudicator C

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v4.md`
3. `pilot/evaluation/v4/readjudication-schema-v4.json`
4. `pilot/evaluation/v4/readjudication-c-form-v4.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v4.json`

### 4.3 adjudicator D

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v4.md`
3. `pilot/evaluation/v4/readjudication-schema-v4.json`
4. `pilot/evaluation/v4/readjudication-d-form-v4.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v4.json`

C/D는 author-facing 문서, 원 preregistration, v1~v3 파일/audit, v4 protocol seal/method audit, A/B 또는 상대 form을 읽지 않는다. 과거 상태·실패·불일치·예상 label·case 역할·수량을 전달하지 않는다.

neutral execution seal의 top-level 필드는 `schemaVersion`, `manifestId`, `packetId`, `caseCount`, `sealedFiles`뿐이다. `sealedFiles`는 evidence, v4 neutral instructions, v4 schema, C blank, D blank의 path/SHA만 담고 audit·history·decision·status·consensus·gold·admission·authorization 정보는 담지 않는다.

## 5. schema-enforced closed core

normative core는 semantic relation과 세 boolean, usage 다섯 축, example verdict·ordered evaluated IDs·target attestation·counterexample ID뿐이다. 모든 값은 closed enum/boolean/case-bound ID다. `nonNormativeNotes` 내용과 presence는 fingerprint/mismatch/gold에서 완전히 제외하며 catch-all code는 없다.

- completed semantic은 `oneOf` exact/all-true branch 또는 non-exact/any-false branch만 허용한다.
- completed capitalization은 global `const=unknown`이며 10개 case prefix 모두 `capitalizationUnknownConstraint`를 요구한다.
- example은 case별 usable ID 전체 coverage와 pass/fail/insufficient attestation·counterexample 일관성을 유지한다.
- mismatch code/presence는 위 closed fields에서 고정 순서로만 파생한다.

각 case core와 ordered 10-case 배열은 RFC 8785 JCS UTF-8로 canonicalize하고 SHA-256을 기록한다.

### 정적 구조 검사

audit 전 다음을 확인한다.

- exact branch는 세 boolean true만 수락하고 exact+false를 거부한다.
- non-exact branch는 적어도 하나 false를 요구하고 non-exact+all-true를 거부한다.
- completed usage capitalization은 `const=unknown`이다.
- 10개 prefix의 capitalization ref가 모두 `capitalizationUnknownConstraint`다.
- 각 case의 `source-only-preservable`, `conflict`, `target-only`, `match`, `not-applicable` witness가 거부된다.
- v3의 case별 example coverage와 verdict consistency 구조가 유지된다.

## 6. C=D, gold, 4+4와 no-majority

두 form 모두 validation·attestation·봉인에 성공한 뒤 ordered 10-case core array bytes가 C=D일 때만 10/10 consensus다. 한 normative field, derived code 또는 presence라도 다르면 전체 `NO-GO`다.

field/section/case majority, 부분 합의 조합, tie-break, 추가 adjudicator, 한쪽 선택, 가중치, 평균, 토론, 자유서술 해석, A/B normalization은 모두 금지한다.

consensus case는 relation exact, 세 semantic boolean true, semantic mismatch empty; 모든 usage가 `match|source-only-preservable|not-applicable`이고 usage mismatch empty; example pass/full coverage/target attested/counterexample null/example mismatch empty를 모두 만족할 때만 `positive`, 아니면 `negative`다.

10/10 consensus와 positive 최소 4, negative 최소 4를 모두 충족할 때만 admission `GO`다. capitalization은 10건 모두 `unknown`이므로 veto-only 규칙상 positive 조건을 충족시키지 못하며 이를 다른 필드로 승격하거나 우회하지 않는다. unresolved·validation 오류·수량 부족은 packet 전체 `NO-GO`다.

## 7. 네 언어 규칙과 veto-only

1. 문법적 복수만으로 lexical group/collective sense를 만들거나 semantic exact를 승격하지 않는다.
2. 예문 목록은 비배타적이다. 문맥 부재는 fail 근거가 아니며 usable source 0 또는 target 입증 없음은 insufficient, 구체적 반례만 fail이다.
3. 한국어에는 영어식 capitalization을 적용하지 않는다. source sense-level qualifier/label이 있으면 source-only-preservable, 없으면 unknown이며 예문 대문자는 restriction 근거가 아니다.
4. source-only restriction 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 match가 아니며 명시적 모순만 conflict다.

deterministic rule은 upstream true를 veto할 수만 있고 false를 true로 바꾸지 않는다. semantic non-exact, usage `conflict|unknown|target-only`, example `fail|insufficient`, schema/provenance/coverage 오류는 승인으로 승격할 수 없다. 네 규칙 위반은 모두 veto다.

## 8. 현재 fail-closed 상태

현재 `finalGoldPresent=false`, `methodologyAuditGo=false`, `blankFormsAuthorized=false`, `executionAuthorized=false`, `readjudicationComplete=false`, `consensusComplete=false`, `providerCallsAuthorized=false`, `heldoutGatePassed=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`, `gitPushAuthorized=false`, `productionDeployAuthorized=false`다.

독립 methodology audit `GO` 전 blank form·neutral execution seal·C/D 실행은 금지한다. C=D와 결과 audit 뒤에도 원 v4의 모든 code/method/provider gate 전 provider 호출은 계속 0회다. 7행·100행, push, deploy는 별도 명시 승인 없이는 금지한다.
