# 한영 의미 연결 v4 replacement blind re-adjudication 사전등록 v5

상태: **base v2 동반 봉인 / 독립 methodology audit 전 / blank form·실행 금지 / 최종 gold 없음**  
author protocol ID: `bilingual-meaning-link-v4-replacement-readjudication/v5`  
base contract ID: `bilingual-meaning-link-v4-preregistration/v2`  
neutral round ID: `meaning-link-v4-blind-dual-10-v5`

## 0. 목적과 불변 이력

`pilot/evaluation/v4/readjudication-methodology-audit-v4.json`은 all-ten capitalization `unknown`과 기존 usage-inclusive polarity의 결합 때문에 positive quota가 구조적으로 불가능하다고 판정했다. v1~v4 protocol/instructions/schema/seal과 모든 audit은 불변 보존하며 이전 blank form·execution seal·C/D 실행은 금지 상태로 남긴다.

v5는 새 `docs/AI_MAPPING_V4_PREREGISTRATION_V2.md`를 base로 사용한다. base v2는 C/D 결과 전에 held-out 평가 polarity인 `semanticGold`와 운영 승인 가능성인 `publicationEligible`을 분리한다. v5는 A/B 또는 과거 판정을 재분류하거나 입력으로 사용하지 않는다.

v4 audit에서 통과한 semantic iff, non-exact any-false, example consistency, all-ten capitalization unknown, closed core, C/D neutral boundary, ordered full-core C=D, no majority/tie-break, 네 규칙과 불변 gate는 유지한다.

## 1. 작성자 attestation

v5 작성자는 원 sealed base/evidence, v1 resolver artifacts/audit, v2~v4 readjudication artifacts/audits, base v2 작성에 필요한 v4 audit만 읽었다. A/B form, disagreement audit·case/field/value 상세, outcome·fixture·AI 결과, 구현·provider 결과는 읽지 않았다. provider/network/프로젝트 AI 호출, 7행·100행 실행, push, deploy도 하지 않았다. exact 기존 입력 read-list와 SHA는 v5 protocol seal에 고정한다.

기존 파일은 수정·삭제·덮어쓰지 않았다. base v2와 v5 여섯 신규 파일도 봉인 뒤 불변이다.

## 2. 단계와 역할 분리

base/protocol author, 독립 methodology auditor, C, D, form/seal custodian, deterministic comparator를 분리한다. auditor는 author/C/D/comparator 구현자와 다른 사람이며 C와 D도 서로 다른 사람이다.

1. base preregistration v2와 base seal v2, v5 author protocol, neutral instructions, schema, protocol seal을 봉인한다.
2. auditor가 3.1의 exact 29-file list만 읽고 base v2 분리, v4 finding closure, schema·neutrality·satisfiability·SHA를 감사한다.
3. 새 `pilot/evaluation/v4/readjudication-methodology-audit-v5.json`의 모든 항목이 `GO`일 때만 v5 C/D blank form을 생성한다.
4. custodian은 evidence, neutral instructions, schema, C blank, D blank의 path/SHA만 담은 neutral execution seal을 생성한다.
5. C/D는 각자 exact neutral 5-file list만 읽고 10건 전부를 독립 completed form으로 제출·별도 봉인한다.
6. 두 form 봉인 뒤 comparator가 full expected fingerprint의 ordered 10-case bytes를 비교한다. A/B와 이전 판정은 읽거나 입력받지 않는다.
7. exact consensus 뒤 base v2 공식으로 semanticGold와 publicationEligible을 별도 파생한다.

## 3. exact read-list

### 3.1 methodology auditor v5 — 정확히 29파일

1. `docs/AI_MAPPING_V4_PREREGISTRATION.md`
2. `docs/AI_MAPPING_V4_PREREGISTRATION_V2.md`
3. `docs/AI_MAPPING_V4_RESOLVER_PREREGISTRATION.md`
4. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V2.md`
5. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V3.md`
6. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V4.md`
7. `docs/AI_MAPPING_V4_READJUDICATION_PREREGISTRATION_V5.md`
8. `pilot/evaluation/v4/heldout-evidence-v1.json`
9. `pilot/evaluation/v4/adjudication-schema-v1.json`
10. `pilot/evaluation/v4/heldout-seal-v1.json`
11. `pilot/evaluation/v4/resolver-adjudication-schema-v1.json`
12. `pilot/evaluation/v4/resolver-protocol-seal-v1.json`
13. `pilot/evaluation/v4/resolver-methodology-audit-v1.json`
14. `pilot/evaluation/v4/readjudication-instructions-v2.md`
15. `pilot/evaluation/v4/readjudication-schema-v2.json`
16. `pilot/evaluation/v4/readjudication-protocol-seal-v2.json`
17. `pilot/evaluation/v4/readjudication-methodology-audit-v2.json`
18. `pilot/evaluation/v4/readjudication-instructions-v3.md`
19. `pilot/evaluation/v4/readjudication-schema-v3.json`
20. `pilot/evaluation/v4/readjudication-protocol-seal-v3.json`
21. `pilot/evaluation/v4/readjudication-methodology-audit-v3.json`
22. `pilot/evaluation/v4/readjudication-instructions-v4.md`
23. `pilot/evaluation/v4/readjudication-schema-v4.json`
24. `pilot/evaluation/v4/readjudication-protocol-seal-v4.json`
25. `pilot/evaluation/v4/readjudication-methodology-audit-v4.json`
26. `pilot/evaluation/v4/preregistration-seal-v2.json`
27. `pilot/evaluation/v4/readjudication-instructions-v5.md`
28. `pilot/evaluation/v4/readjudication-schema-v5.json`
29. `pilot/evaluation/v4/readjudication-protocol-seal-v5.json`

auditor는 A/B form·seal·disagreement detail, C/D form, outcome·fixture·AI 결과, 구현·model 결과를 읽지 않는다. audit는 exact SHA/read set, role separation, base v2 authority, v4 P1 closure, semanticGold/publication 분리, usage fingerprint 보존, semantic iff, example consistency, all-ten capitalization unknown, C/D neutral boundary, C=D, no majority, 4+4 satisfiability, future 60 gate, 네 규칙, veto-only와 외부 변경 금지를 항목별 확인한다. 하나라도 미충족이면 총결론은 `NO-GO`다.

### 3.2 C exact neutral read-list

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v5.md`
3. `pilot/evaluation/v4/readjudication-schema-v5.json`
4. `pilot/evaluation/v4/readjudication-c-form-v5.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v5.json`

### 3.3 D exact neutral read-list

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v5.md`
3. `pilot/evaluation/v4/readjudication-schema-v5.json`
4. `pilot/evaluation/v4/readjudication-d-form-v5.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v5.json`

C/D는 history가 있는 base/author 문서·seal·audit, A/B 또는 상대 form을 읽지 않는다. 과거 상태·실패·불일치·예상 case label을 전달하지 않는다. neutral instructions v5가 adjudication과 base v2의 현재 규칙을 history 없이 완전하게 제공한다.

neutral execution seal은 `schemaVersion`, `manifestId`, `packetId`, `caseCount`, `sealedFiles`만 가진다. `sealedFiles`는 evidence, v5 neutral instructions/schema, C/D blank form의 path/SHA만 담고 history·audit·decision·gold·approval·authorization 상태는 담지 않는다.

## 4. v5 schema와 full expected fingerprint

v5 schema는 다음을 직접 수집한다.

- semantic relation과 세 boolean
- register/domain/temporal/regional/capitalization
- example verdict, ordered evaluated source example IDs, target sense attestation, counterexample ID

free-text 내용과 presence는 모두 non-normative다. mismatch code/presence, semanticGold, publicationEligible은 form 입력이 아니라 봉인 후 기계 파생한다.

schema는 다음을 강제한다.

- completed relation exact iff 세 boolean all true
- non-exact이면 적어도 하나 false
- case별 usable source ID 전체 coverage와 pass/fail/insufficient consistency
- packet 10건 모두 completed capitalization `unknown` global/prefix const
- exact 10 case 순서, C/D slot별 form/read-list consistency

full expected fingerprint에는 usage 다섯 축과 usage mismatch도 반드시 포함한다. semanticGold가 usage를 무시한다는 이유로 fingerprint comparison에서 usage를 빼거나 unknown을 wild-card/match로 처리하지 않는다.

## 5. exact C=D와 두 파생값

두 completed form의 schema/seal/attestation/coverage 검증이 성공한 뒤 RFC 8785 JCS UTF-8 ordered 10-case full fingerprint arrays를 생성한다. byte-for-byte C=D일 때만 10/10 consensus다. 한 normative field나 derived mismatch code/presence 차이도 전체 `NO-GO`다.

majority, field/section/case hybrid, tie-break, 추가 adjudicator, 한쪽 선택, 토론, 가중치, 자유서술 해석은 금지한다.

consensus case에서:

- semantic exact + all-three-true + example pass/full coverage/target-attested/counterexample-null이면 semanticGold positive
- 그 밖의 valid consensus case는 semanticGold negative
- semanticGold positive이고 usage 다섯 축이 모두 `match|source-only-preservable|not-applicable`이면 publicationEligible true, 아니면 false

usage mismatch는 semanticGold를 바꾸지 않지만 publication eligibility와 full fingerprint에는 그대로 적용된다. v5에서는 capitalization unknown 때문에 모든 case의 publicationEligible은 false지만 semanticGold positive는 가능하다.

## 6. admission과 satisfiability

v5 admission은 10/10 exact full-fingerprint consensus, semanticGold positive 최소 4, negative 최소 4, 모든 validation/audit gate 통과를 요구한다. publicationEligible 최소 count는 없다.

schema-level satisfiability witness:

- positive archetype: exact/all-true + pass/full case-bound IDs + target true + counter null + capitalization unknown
- negative archetype: non-exact/at-least-one-false 또는 non-pass example + capitalization unknown
- 서로 다른 4개 case에 positive archetype, 다른 4개에 negative archetype, 나머지 2개에 어느 valid archetype이든 배치 가능
- C와 D에 같은 full core를 사용하면 exact consensus, positive 4+, negative 4+를 동시에 만족

positive archetype의 capitalization unknown은 publicationEligible false를 만들지만 semanticGold positive를 훼손하지 않는다. 이 witness는 실제 case 예상값이나 outcome을 지정하지 않는 existence proof다.

## 7. future 60-attempt gate

향후 60 attempt는 각 attempt에서 full fingerprint, semanticGold, final approval을 별도로 검증한다.

- full fingerprint = consensus full fingerprint
- semanticGold = consensus semanticGold
- final approval = consensus publicationEligible
- semantic-negative approval escape 0
- semantic-positive/publication-ineligible의 approval false는 positive miss가 아님
- expected semantic-positive를 negative로 출력하거나 fingerprint가 다르면 positive miss

6/6 case attempts와 전체 60/60이 모두 exact해야 한다. provider/schema/refusal/truncation/timeout/provenance/coverage 오류 0, retry 0을 유지한다. 평균·다수결·best-of-N·선택적 재실행은 금지한다.

## 8. 네 언어 규칙과 veto-only

1. 문법적 복수만으로 lexical group/collective sense나 semantic exact를 만들지 않는다.
2. 예문 목록은 비배타적이며 목록 부재만으로 fail을 만들지 않는다. usable source 0 또는 target 입증 없음은 insufficient, 구체적 반례만 fail이다.
3. 한국어에 영어식 capitalization을 적용하지 않는다. source sense-level qualifier/label이 있으면 source-only-preservable, 없으면 unknown이고 예문 대문자는 restriction 근거가 아니다.
4. source-only metadata 보존은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 match가 아니며 명시적 모순만 conflict다.

deterministic layer는 upstream semanticGold/label 또는 false approval을 true로 바꾸지 않는다. unknown을 match로 승격하지 않는다. publication approval만 true에서 false로 veto할 수 있고 final approval은 publicationEligible과 같아야 한다.

## 9. 현재 fail-closed 상태

현재 `finalGoldPresent=false`, `independentMethodologyAuditGo=false`, `blankFormsAuthorized=false`, `executionAuthorized=false`, `providerCallsAuthorized=false`, `heldoutGatePassed=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`, `gitPushAuthorized=false`, `productionDeployAuthorized=false`다.

base v2+v5 exact SHA의 독립 methodology audit `GO` 전 blank form·neutral execution seal·C/D 판정을 시작하지 않는다. C=D admission과 독립 결과 audit 전 provider 호출은 0회다. held-out provider gate 전 7행·100행은 금지한다. push/deploy 및 실제 publication/data write는 별도 명시 승인 없이는 금지한다.
