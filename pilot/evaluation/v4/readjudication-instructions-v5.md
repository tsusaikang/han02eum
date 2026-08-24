# 한영 의미 연결 v4 blind dual adjudication 중립 지침 v5

round ID: `meaning-link-v4-blind-dual-10-v5`  
packet ID: `meaning-link-v4-heldout-10-v1`  
form schema: `bilingual-heldout-independent-adjudication/v5`

## 1. 작업과 exact read-list

제공된 10개 source/target sense pair를 각각 독립적으로 판정한다. 모든 10건과 각 case의 모든 usable source example을 확인하고 closed categorical form을 완성한다. 다른 사람과 판정을 논의하거나 다른 adjudication form을 보지 않는다.

slot C는 다음 다섯 파일만 읽는다.

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v5.md`
3. `pilot/evaluation/v4/readjudication-schema-v5.json`
4. `pilot/evaluation/v4/readjudication-c-form-v5.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v5.json`

slot D는 다음 다섯 파일만 읽는다.

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v5.md`
3. `pilot/evaluation/v4/readjudication-schema-v5.json`
4. `pilot/evaluation/v4/readjudication-d-form-v5.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v5.json`

자기 slot 목록 밖의 프로젝트 파일, 상대 form, 외부 사전·검색·웹사이트, provider 또는 프로젝트 AI 출력은 사용하지 않는다.

## 2. 입력하는 값과 기계 파생 값

판정자는 `normative` 아래의 닫힌 categorical 필드만 판정한다. `nonNormativeNotes` 문자열의 내용과 null/non-null presence는 fingerprint, mismatch, label, approval에 사용되지 않는다. catch-all category는 없다.

판정자가 직접 입력하지 않고 봉인 뒤 기계 파생되는 값은 다음이다.

- semantic/usage/example mismatch code와 presence
- `semanticGold`
- `publicationEligible`
- final approval expectation

usage는 semanticGold polarity와 분리되지만 full expected fingerprint의 normative 일부다. `unknown`이나 `source-only-preservable`을 다른 값으로 바꾸거나 무시하지 않는다.

## 3. semantic과 schema 일관성

`targetRelationToSource`는 `exact`, `target-narrower`, `target-broader`, `overlap`, `disjoint`, `insufficient` 중 하나다. 세 boolean은 referent type, event/participant 구조, necessary conditions의 일치 여부다.

completed case에는 schema가 다음을 강제한다.

- relation `exact` iff 세 boolean 모두 true
- non-exact relation이면 적어도 한 boolean false
- exact+false 또는 non-exact+all-true는 invalid

## 4. usage와 capitalization

`register`, `domain`, `temporal`, `regional`은 `match`, `source-only-preservable`, `target-only`, `conflict`, `unknown`, `not-applicable` 중 evidence에 맞는 값을 고른다.

- target metadata 부재를 `match`로 추정하지 않는다.
- source restriction이 sense-level evidence에 명시되고 target 의미와 모순되지 않으며 별도 보존 가능하면 `source-only-preservable`이다.
- evidence가 없거나 충분하지 않으면 `unknown`이다.
- 명시적 모순만 `conflict`다.

capitalization restriction 근거는 source sense-level qualifier 또는 sense label이어야 한다. 문장 첫 글자, 고유명, 인용문 대문자는 sense-level usage metadata가 아니다. 제공 packet 10건에는 sense-level English capitalization qualifier/label이 없으므로 모든 completed `usage.capitalization`은 schema-fixed `unknown`이다. 한국어 target에 영어식 conflict를 적용하지 않는다.

## 5. example applicability

- `evaluatedSourceExampleIds`: usable source example ID 전부를 evidence 순서로 기록하고 rejected example은 제외한다.
- `targetSenseAttested`: 제공 target example 중 실제 candidate sense를 입증하는 것이 있으면 true, 없으면 false다.
- `counterexampleSourceExampleId`: candidate가 자연스럽게 적용되지 않는 구체적 usable source example 중 evidence 순서상 첫 ID, 없으면 null이다.
- `pass`: full usable coverage, target attested true, counterexample null
- `fail`: 구체적 usable counterexample ID non-null
- `insufficient`: counterexample null이고 usable source가 없거나 target attested false

예문 목록에 특정 문맥이 없다는 이유만으로 fail을 선택하지 않는다. schema가 case별 coverage와 verdict 일관성을 강제한다.

## 6. semanticGold와 publicationEligible 분리

valid full fingerprint consensus case는 다음을 모두 만족할 때만 `semanticGold=positive`다.

1. relation exact
2. 세 semantic boolean true
3. example pass
4. full usable source example coverage
5. target sense attested true
6. counterexample null

그 밖의 valid consensus case는 semanticGold negative다. usage는 semanticGold에 입력하지 않는다.

`publicationEligible=true`는 semanticGold positive이면서 다섯 usage 축 각각이 `match`, `source-only-preservable`, `not-applicable` 중 하나이고 `conflict`, `target-only`, `unknown`이 하나도 없을 때만 가능하다. semantic-positive이면서 usage unknown이면 semanticGold는 positive 그대로이고 publicationEligible만 false다.

semanticGold positive는 평가 label이지 자동 publication 또는 승인 행위가 아니다. deterministic rule은 semanticGold를 negative에서 positive로 바꾸지 않고, usage unknown을 match로 바꾸지 않으며, publication approval을 veto할 수만 있다.

## 7. 합의와 수량 규칙

C와 D completed form을 각각 봉인한 뒤 ordered 10-case full fingerprint 배열을 비교한다. byte-for-byte C=D일 때만 10/10 consensus다. 한 normative field나 derived code/presence라도 다르면 전체 round가 닫힌다.

field/section/case majority, 부분 합의 조합, tie-break, 추가 adjudicator, 한쪽 선택, 가중치, 평균, 토론, 자유서술 해석은 금지한다.

consensus 뒤 semanticGold positive 최소 4건, negative 최소 4건이어야 한다. publicationEligible 수량 gate는 없다. 판정자는 이 수량을 목표로 categorical evidence 판단을 조정하지 않는다.

## 8. future attempt 검증 규칙

향후 각 model attempt는 full fingerprint와 semanticGold를 consensus에 정확히 맞추고 final approval을 consensus publicationEligible에 정확히 맞춰야 한다.

- semantic-negative approval true는 escape이며 허용 수 0이다.
- semantic-positive/publication-ineligible의 올바른 approval false는 positive miss가 아니다.
- semantic-positive miss는 expected positive가 negative로 출력되거나 full fingerprint가 다른 경우다.
- unknown은 fingerprint에서 match로 취급하지 않는다.

## 9. 네 언어·증거 규칙과 veto-only

1. 문법적 복수만으로 lexical group/collective sense를 만들거나 semantic exact를 승격하지 않는다.
2. 예문 목록은 비배타적이다. 문맥 부재는 fail 근거가 아니며 usable source 0 또는 target 입증 없음은 insufficient, 구체적 반례만 fail이다.
3. 한국어에는 영어식 capitalization을 적용하지 않는다. source sense-level qualifier/label이 있으면 source-only-preservable, 없으면 unknown이며 예문 대문자는 restriction 근거가 아니다.
4. source-only restriction 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 match가 아니며 명시적 모순만 conflict다.

deterministic layer는 upstream semantic label 또는 false approval을 true로 만들 수 없다. semantic non-exact와 example fail/insufficient를 positive로 승격하지 않으며 publication approval만 true에서 false로 veto할 수 있다.

## 10. 완료와 제출

10건 모두를 `completed`로 채우고 semantic iff, capitalization unknown const, usable coverage, example consistency를 확인한다. exact read-list, 독립 작업, 상대와의 비소통, 외부 자료·도구 미사용을 form에 attest한다. completed form 제출 뒤에는 수정하지 않는다.
