# 한영 의미 연결 v4 blind dual adjudication 지침 v4

round ID: `meaning-link-v4-blind-dual-10-v4`  
packet ID: `meaning-link-v4-heldout-10-v1`  
form schema: `bilingual-heldout-independent-adjudication/v4`

## 1. 작업 범위와 exact read-list

제공된 10개 source/target sense pair를 각각 독립적으로 판정한다. 모든 10건과 각 case의 모든 usable source example을 확인하고 form의 controlled categorical 필드를 완성한다. 다른 사람과 판정을 논의하거나 다른 adjudication form을 보지 않는다.

slot C의 read-list는 다음 다섯 파일과 정확히 같아야 한다.

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v4.md`
3. `pilot/evaluation/v4/readjudication-schema-v4.json`
4. `pilot/evaluation/v4/readjudication-c-form-v4.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v4.json`

slot D의 read-list는 다음 다섯 파일과 정확히 같아야 한다.

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v4.md`
3. `pilot/evaluation/v4/readjudication-schema-v4.json`
4. `pilot/evaluation/v4/readjudication-d-form-v4.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v4.json`

자기 slot의 목록에 없는 프로젝트 파일, 다른 slot form, 외부 사전·검색·웹사이트, provider 또는 프로젝트 AI 출력은 사용하지 않는다. 판정자는 완성 전 자기 form의 schema와 seal SHA를 검사할 수 있다.

## 2. normative와 non-normative의 분리

`normative` 아래의 닫힌 categorical 필드만 기계 비교의 입력이다. `nonNormativeNotes` 아래 문자열의 내용, 표현, 길이와 null/non-null presence는 모두 기계 비교·mismatch·label 파생에 사용되지 않는다. 설명 문자열로 categorical 값을 대체하거나 보완하지 않는다.

판정자는 mismatch code나 presence를 입력하지 않는다. 그것들은 닫힌 normative 필드에서만 기계 파생된다. catch-all 또는 자유서술 기반 mismatch category는 없다.

## 3. semantic 판정과 필수 일관성

### `targetRelationToSource`

- `exact`: source와 target이 같은 의미 범위와 필수 조건을 나타낸다.
- `target-narrower`: target이 source의 일부만 포괄하고 추가 필수 조건이 있다.
- `target-broader`: target이 source보다 넓고 source의 필수 구별을 잃는다.
- `overlap`: 공통 영역은 있지만 어느 한쪽이 다른 쪽의 단순 부분집합이 아니다.
- `disjoint`: 의미 범위가 일치하지 않는다.
- `insufficient`: 제공 evidence만으로 관계를 확정할 수 없다.

세 semantic boolean은 핵심 referent type, 사건/participant 구조, 필수 조건의 일치 여부를 각각 나타낸다. completed case에는 다음 양방향 일관성이 반드시 성립하며 schema가 강제한다.

- `targetRelationToSource=exact` **iff** `referentTypeMatch`, `eventAndParticipantsMatch`, `necessaryConditionsMatch`가 모두 true다.
- relation이 `exact`가 아니면 세 boolean 중 적어도 하나가 false다.
- `exact`와 false boolean의 조합, non-exact와 all-true 조합은 제출할 수 없다.

## 4. usage 판정

`register`, `domain`, `temporal`, `regional`은 다음 중 하나다.

- `match`: 양쪽의 명시적 evidence가 같은 restriction을 뒷받침한다.
- `source-only-preservable`: source restriction이 sense-level evidence에 명시돼 있고 target 의미와 모순되지 않으며 별도 metadata로 보존할 수 있다.
- `target-only`: target에만 의미 있는 restriction이 명시돼 있다.
- `conflict`: 양쪽의 명시적 sense-level evidence가 서로 모순된다.
- `unknown`: 비교에 필요한 sense-level evidence가 없거나 충분하지 않다.
- `not-applicable`: 해당 축이 이 sense pair에 의미 있게 적용되지 않는다.

target metadata 부재를 `match`로 추정하지 않는다. `source-only-preservable`은 usage 보존 가능성만 뜻하며 semantic relation을 바꾸지 않는다.

### packet-bound capitalization

한국어 target에는 영어식 대소문자를 직접 적용하지 않는다. capitalization restriction의 근거는 source sense-level qualifier 또는 sense label에 명시된 정보여야 한다. 예문의 문장 첫 글자, 고유명, 인용문 안 대문자는 문맥 표기이지 sense-level usage metadata가 아니므로 `source-only-preservable` 근거가 될 수 없다.

sealed packet의 `HV4-01`부터 `HV4-10`까지 어느 case에도 sense-level English capitalization qualifier/label이 없다. 따라서 **10건 모두** completed `usage.capitalization`은 `unknown`으로 고정된다. schema는 각 case에 `const=unknown`을 적용하며 `source-only-preservable`, `conflict`, `target-only`, `match`, `not-applicable`을 모두 거부한다.

## 5. example applicability 판정

- `evaluatedSourceExampleIds`: evidence의 `source.examples.usable` ID를 빠짐없이 evidence 순서로 기록한다. rejected example은 넣지 않는다.
- `targetSenseAttested`: 제공된 usable target example 중 적어도 하나가 실제 candidate target sense를 입증하면 true, 아니면 false다.
- `counterexampleSourceExampleId`: candidate target sense가 자연스럽게 적용되지 않는 구체적 usable source example이 있으면 evidence 순서상 첫 ID, 없으면 null이다.
- `verdict=pass`: usable source example 전부에 candidate sense가 자연스럽게 적용되고, target sense가 입증되며, counterexample이 없다.
- `verdict=fail`: 구체적 counterexample이 있다. counterexample ID는 반드시 non-null이어야 한다.
- `verdict=insufficient`: 구체적 counterexample은 없지만 usable source example이 없거나 target sense 입증이 없다.

example 목록에 특정 문맥이 없다는 사실만으로 `fail`을 선택하지 않는다. schema는 case별 usable ID coverage와 pass/fail/insufficient의 attestation·counterexample 일관성을 강제한다.

## 6. 고정 언어·증거 규칙

1. **문법적 복수와 lexical group sense**: 문법적 복수는 singular member sense와 정의가 같으면 별도 lexical group/collective sense가 아니다. 정의 자체가 구성원 개인이 아닌 집단 referent를 지시할 때만 별도 collective/group sense다. 복수형 예문이나 집합 문맥만으로 semantic exact를 승격하지 않는다.
2. **예문 목록의 비배타성**: source/target 예문 목록은 폐쇄 목록이 아니다. 목록에 어떤 문맥이 없다는 이유만으로 정의 범위를 좁히거나 `fail`로 만들지 않는다. usable source 예문 전부의 자연스러운 적용과 제공 target 예문 중 실제 target sense 입증 여부를 판정한다. source usable 예문 0개 또는 target 입증 없음은 `insufficient`이며, 구체적 의미 반례가 있을 때만 `fail`이다.
3. **한국어 대문자 비적용**: 한국어에는 영어식 대소문자 축을 직접 적용하지 않는다. source sense-level capitalization evidence가 있으면 `source-only-preservable`, 없으면 `unknown`이다. 문장 첫 글자·고유명·인용문 대문자는 sense-level restriction 근거가 아니다.
4. **source-only usage 보존**: source-only restriction의 metadata 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 `match`가 아니다. source restriction이 명시돼 보존 가능하면 `source-only-preservable`, 아니면 `unknown`, 명시적 모순 evidence가 있을 때만 `conflict`다.

## 7. veto-only 원칙

- semantic non-exact, usage `conflict`·`unknown`·`target-only`, example `fail`·`insufficient`, schema/provenance/example coverage 오류는 exact/pass/approval로 승격할 수 없다.
- 복수→집단 무근거 승격, 예문 목록의 폐쇄 목록 취급, 한국어 capitalization conflict 오적용, target metadata 부재의 match 처리, source-only usage를 이용한 semantic 승격은 허용되지 않는다.
- 어떤 기계 rule도 false인 upstream 판정을 true로 바꿀 수 없다.

## 8. 완료와 제출

모든 10건을 `completed`로 채우고 semantic iff, capitalization `unknown` const, usable source example coverage와 categorical 일관성을 검증한다. exact read-list, 독립 작업, 다른 판정자와의 비소통, 외부 자료·도구 미사용을 form에 attest한다. completed form 제출 후에는 수정하지 않는다.
