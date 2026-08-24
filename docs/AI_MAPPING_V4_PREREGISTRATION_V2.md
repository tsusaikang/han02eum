# 한영 의미 연결 v4 base 사전등록 v2

상태: **설계 봉인 / 독립 methodology audit 전 / 최종 gold 없음 / provider 호출 금지**  
계약 ID: `bilingual-meaning-link-v4-preregistration/v2`  
대상 packet: `meaning-link-v4-heldout-10-v1`  
동반 replacement round: `meaning-link-v4-blind-dual-10-v5`

## 0. v1과의 관계 및 변경 이유

원 `docs/AI_MAPPING_V4_PREREGISTRATION.md`와 v1~v4 resolver/readjudication 파일·audit은 불변 보존한다. v4 methodology audit는 sealed packet의 모든 capitalization이 `unknown`인 상태에서 v1 positive 정의가 usage completeness까지 요구하므로 positive 최소 4건이 구조적으로 불가능함을 확인했다.

base v2는 사람 또는 모델 결과를 본 뒤 label을 구제하는 계약이 아니다. v5 C/D blank form 생성 전에 다음 두 개를 명시적으로 분리해 사전등록한다.

1. held-out 평가용 의미·예문 극성인 `semanticGold`
2. 실제 publication/automatic-approval 가능 여부인 `publicationEligible`

evidence, 10 case identity, 언어 규칙, usage fingerprint, blind 독립성, exact consensus, provider 0-call과 외부 변경 금지는 완화하지 않는다. 기존 v1 positive/negative 정의는 v1 이력에 그대로 남고 v5에는 base v2 정의만 적용한다.

## 1. 세 개의 서로 다른 normative 값

### 1.1 Full expected fingerprint

각 consensus case의 full expected fingerprint에는 다음이 모두 포함된다.

- semantic relation, 세 semantic boolean, 기계 파생 semantic mismatch code/presence
- usage 다섯 축, 기계 파생 usage mismatch code/presence
- example verdict, ordered evaluated source example IDs, target sense attestation, counterexample ID, 기계 파생 example mismatch code/presence

usage는 polarity에서 빠질 뿐 normative expected fingerprint에서는 빠지지 않는다. C와 D, 향후 model output은 `unknown`, `source-only-preservable`, 그 밖의 usage 값을 정확히 맞춰야 한다. `unknown`을 `match`로 바꾸거나 비교에서 제거하거나 wild-card로 취급하지 않는다.

### 1.2 `semanticGold`

schema·seal·attestation·coverage가 모두 valid하고 C=D full fingerprint consensus가 있는 case에 대해서만 기계 파생한다.

다음을 모두 만족하면 `semanticGold=positive`다.

1. `targetRelationToSource=exact`
2. `referentTypeMatch=true`
3. `eventAndParticipantsMatch=true`
4. `necessaryConditionsMatch=true`
5. example `verdict=pass`
6. `evaluatedSourceExampleIds`가 evidence의 usable source example ID 전부와 정확히 같음
7. `targetSenseAttested=true`
8. `counterexampleSourceExampleId=null`

그 밖의 valid consensus case는 `semanticGold=negative`다. usage 값과 usage mismatch는 `semanticGold` 파생에 입력하지 않는다. `semanticGold=positive`는 평가 label일 뿐 publication이나 자동 승인 행위가 아니다.

### 1.3 `publicationEligible`

다음을 모두 만족할 때만 true다.

1. `semanticGold=positive`
2. usage 다섯 축 어디에도 `conflict`, `target-only`, `unknown`이 없음
3. usage 다섯 축 각각이 `match`, `source-only-preservable`, `not-applicable` 중 하나
4. 기계 파생 usage mismatch codes가 empty이고 presence가 false

하나라도 아니면 false다. 따라서 semantic-positive이면서 usage `unknown` 때문에 publication-ineligible인 case가 정상적으로 존재할 수 있다. 이 case의 semantic polarity는 positive로 유지되고 운영 승인만 veto된다.

## 2. capitalization과 usage 불변 규칙

- English capitalization restriction은 source sense-level qualifier 또는 sense label에 명시된 경우에만 `source-only-preservable`이다.
- sense-level 근거가 없으면 `unknown`이다.
- 예문의 문장 첫 글자, 고유명, 인용문 대문자는 sense-level usage metadata가 아니다.
- 한국어 target에 영어식 capitalization conflict를 적용하지 않는다.
- 현재 packet 10건에는 sense-level capitalization qualifier/label이 없으므로 v5 completed form의 capitalization은 10건 모두 `unknown` const다.

이 `unknown`은 full fingerprint와 usage mismatch에 그대로 남고 `match`로 승격되지 않는다. 모든 case의 `publicationEligible=false`를 유발하지만 semanticGold를 negative로 바꾸지 않는다.

## 3. replacement C/D held-out admission

v5 admission은 다음을 모두 만족할 때만 `GO`다.

1. 결과를 모르는 새 adjudicator C와 D가 동일 10건 전부를 독립 completed form으로 제출하고 각각 봉인됨
2. schema, seal, exact read-list, independence, coverage, categorical consistency 검증 성공
3. ordered 10-case **full expected fingerprint** 배열이 byte-for-byte C=D
4. consensus 10건의 기계 파생 `semanticGold`에 positive 최소 4건, negative 최소 4건
5. 독립 methodology audit와 후속 결과 audit `GO`

usage가 `unknown`인 semantic-positive는 positive count에 포함한다. publication-ineligible이라는 이유로 semantic positive miss나 negative로 재분류하지 않는다. publication-eligible 최소 수량 gate는 없다.

한 fingerprint 차이, validation 오류, positive/negative 수량 부족이 있으면 전체 `NO-GO`다. field/section/case majority, tie-break, 추가 resolver, 한쪽 선택, 토론, 자유서술 해석은 금지한다. 결과를 본 뒤 기준·taxonomy·case·판정자를 변경하지 않는다.

## 4. deterministic layer는 label 보존·approval veto-only

- deterministic layer는 upstream `semanticGold` 또는 label을 false/negative에서 true/positive로 바꿀 수 없다.
- semantic non-exact나 example fail/insufficient를 semantic-positive로 승격하지 않는다.
- usage `unknown`·`conflict`·`target-only`를 `match`로 바꾸지 않는다.
- deterministic layer는 publication/final approval을 true에서 false로 veto할 수만 있고 false를 true로 만들 수 없다.
- final approval은 consensus `publicationEligible`와 정확히 같아야 한다. semantic-positive여도 publication-ineligible이면 final approval은 false다.
- semantic-positive gold는 평가 label이며 자동 publication, dictionary write, 운영 승인, 배포를 의미하지 않는다.

## 5. future 60-attempt held-out gate

provider 실행 사양은 원 v1의 모델, repetition, seed, temperature, 60-attempt, no-retry 계약을 유지한다. admission 후 미래 실행의 각 attempt는 다음 세 값을 별도로 산출·검증한다.

1. full normative fingerprint
2. `semanticGold`
3. final approval

모든 attempt에서 다음이 필요하다.

- full fingerprint가 해당 C=D consensus fingerprint와 byte-for-byte 같음
- `semanticGold`가 consensus에서 기계 파생한 semanticGold와 같음
- final approval이 consensus `publicationEligible`와 같음

case별 6/6 attempt가 모두 위 조건을 만족해야 한다.

- semantic-negative: 6/6 semanticGold negative, final approval false, approval escape 0/6
- semantic-positive + publication-eligible: 6/6 semanticGold positive, final approval true
- semantic-positive + publication-ineligible: 6/6 semanticGold positive, final approval false. 이 false approval은 positive miss가 아니다.

semantic-positive miss는 expected positive가 negative로 출력되거나 full fingerprint가 불일치하는 경우다. publication-ineligible positive의 올바른 false approval은 miss로 세지 않는다. negative approval escape는 semantic-negative에서 final approval true가 나온 경우이며 0이어야 한다. 어떤 case든 approval이 consensus publicationEligibility와 다르면 전체 gate가 실패한다.

전체 60/60 attempt, provider/schema/refusal/truncation/timeout/provenance/example-coverage 오류 0, full fingerprint 60/60 exact가 필요하다. 평균·다수결·best-of-N·선택적 재실행·결과 채택은 금지한다.

## 6. 네 언어·증거 규칙

1. **문법적 복수와 lexical group sense**: 문법적 복수만으로 별도 lexical group/collective sense를 만들거나 semantic exact를 승격하지 않는다. 정의 자체가 집단 referent를 지시할 때만 별도 집단 sense다.
2. **예문 목록의 비배타성**: 목록 부재만으로 fail을 만들지 않는다. usable source 예문 전부와 제공 target 예문의 실제 sense 입증을 본다. source usable 0 또는 target 입증 없음은 insufficient, 구체적 반례만 fail이다.
3. **한국어 대문자 비적용**: 한국어에 영어식 capitalization을 직접 적용하지 않는다. source sense-level qualifier/label이 있으면 source-only-preservable, 없으면 unknown이다. 예문 대문자는 restriction 근거가 아니다.
4. **source-only usage 보존**: source-only metadata 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 match가 아니며, 명시적 모순만 conflict다.

## 7. satisfiability 사전 증명

v5 schema의 capitalization은 모든 case에서 `unknown`이지만 `semanticGold`에는 usage가 입력되지 않는다.

- 어떤 case든 semantic exact/all-three-true와 example pass/full coverage/target-attested/counterexample-null의 valid core를 구성할 수 있으므로 semantic-positive witness가 존재한다. capitalization unknown 때문에 publicationEligible은 false지만 semanticGold는 positive다.
- 어떤 case든 non-exact/at-least-one-false 또는 non-pass example의 valid core를 구성할 수 있으므로 semantic-negative witness가 존재한다.
- 서로 다른 네 case에 positive witness, 다른 네 case에 negative witness를 배치하고 C와 D에 동일 core를 복제하면 10/10 exact consensus, positive 4+, negative 4+가 동시에 가능하다.

이 증명은 어느 실제 case의 예상 판정이나 gold를 지정하지 않는 schema-level existence proof다.

## 8. 실행·보존 gate

현재 `finalGoldPresent=false`, `independentMethodologyAuditGo=false`, `blankFormsAuthorized=false`, `providerCallsAuthorized=false`, `heldoutGatePassed=false`, `legacySevenAuthorized=false`, `sample100Authorized=false`, `gitPushAuthorized=false`, `productionDeployAuthorized=false`다.

base v2와 v5 protocol/schema/seal의 exact SHA에 대한 독립 methodology audit `GO` 전 blank form·neutral execution seal·C/D 판정은 금지한다. v5 admission과 결과 audit 전 provider 호출은 계속 0회다. held-out provider gate 전 기존 7행·100행을 실행하지 않는다. push/deploy와 실제 data/publication action은 별도 명시 승인 없이는 금지한다.
