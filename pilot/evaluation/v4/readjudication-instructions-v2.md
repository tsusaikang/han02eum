# 한영 의미 연결 v4 blind dual adjudication 지침 v2

round ID: `meaning-link-v4-blind-dual-10-v2`  
packet ID: `meaning-link-v4-heldout-10-v1`  
form schema: `bilingual-heldout-independent-adjudication/v2`

## 1. 작업 범위

제공된 10개 source/target sense pair를 각각 독립적으로 판정한다. 모든 10건과 각 case의 모든 usable source example을 확인하고, form의 controlled categorical 필드를 완성한다. 다른 사람과 판정을 논의하거나 다른 adjudication form을 보지 않는다.

판정에 사용할 수 있는 정보는 아래 exact read-list뿐이다.

### slot C

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v2.md`
3. `pilot/evaluation/v4/readjudication-schema-v2.json`
4. `pilot/evaluation/v4/readjudication-c-form-v2.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v2.json`

### slot D

1. `pilot/evaluation/v4/heldout-evidence-v1.json`
2. `pilot/evaluation/v4/readjudication-instructions-v2.md`
3. `pilot/evaluation/v4/readjudication-schema-v2.json`
4. `pilot/evaluation/v4/readjudication-d-form-v2.blank.json`
5. `pilot/evaluation/v4/readjudication-execution-seal-v2.json`

자기 slot의 목록에 없는 프로젝트 파일, 다른 slot form, 외부 사전·검색·웹사이트, provider 또는 프로젝트 AI 출력은 사용하지 않는다. 판정자는 완성 전 자기 form의 schema와 seal SHA를 검사할 수 있다.

## 2. normative와 non-normative의 분리

`normative` 아래의 닫힌 categorical 필드만 기계 비교의 입력이다. `nonNormativeNotes` 아래의 문자열은 설명용이며 문자열의 내용, 표현, 길이, null/non-null presence 모두 기계 비교·label 파생에 사용되지 않는다. 설명 문자열로 categorical 값을 대체하거나 보완하지 않는다.

판정자는 mismatch code나 mismatch presence를 직접 입력하지 않는다. 그것들은 4절의 닫힌 normative 필드만으로 기계 파생된다. catch-all 또는 자유서술 기반 mismatch category는 없다.

## 3. semantic 판정

### `targetRelationToSource`

- `exact`: source와 target이 같은 의미 범위와 필수 조건을 나타낸다.
- `target-narrower`: target이 source의 일부만 포괄하고 추가 필수 조건이 있다.
- `target-broader`: target이 source보다 넓고 source의 필수 구별을 잃는다.
- `overlap`: 공통 영역은 있지만 어느 한쪽이 다른 쪽의 단순 부분집합이 아니다.
- `disjoint`: 의미 범위가 일치하지 않는다.
- `insufficient`: 제공 evidence만으로 관계를 확정할 수 없다.

### 세 semantic boolean

- `referentTypeMatch`: 사람·사물·물질·집단·사건·상태 등 핵심 referent type이 같은가.
- `eventAndParticipantsMatch`: 사건/상태의 구조와 요구되는 participant 역할이 같은가.
- `necessaryConditionsMatch`: 정의의 필수 조건과 범위 제한이 같은가.

각 boolean은 evidence에 비추어 true 또는 false로 판정한다. 불확실성을 false로 대신하지 말고 relation을 `insufficient`로 두되, 확인 가능한 boolean은 그대로 판정한다.

## 4. usage 판정

`register`, `domain`, `temporal`, `regional`, `capitalization`의 각 축은 다음 중 하나다.

- `match`: 양쪽의 명시적 evidence가 같은 restriction을 뒷받침한다.
- `source-only-preservable`: source restriction이 명시돼 있고 target 자체의 의미와 모순되지 않으며 별도 metadata로 보존할 수 있다.
- `target-only`: target에만 의미 있는 restriction이 명시돼 있다.
- `conflict`: 양쪽의 명시적 evidence가 서로 모순된다.
- `unknown`: 비교에 필요한 evidence가 없거나 충분하지 않다.
- `not-applicable`: 해당 축이 이 sense pair에 의미 있게 적용되지 않는다.

target metadata 부재를 `match`로 추정하지 않는다. `source-only-preservable`은 usage 보존 가능성만 뜻하며 semantic relation을 바꾸지 않는다.

## 5. example applicability 판정

- `evaluatedSourceExampleIds`: evidence의 `source.examples.usable` ID를 빠짐없이 evidence 순서로 기록한다. rejected example은 넣지 않는다.
- `targetSenseAttested`: 제공된 usable target example 중 적어도 하나가 실제 candidate target sense를 입증하면 true, 아니면 false다.
- `counterexampleSourceExampleId`: candidate target sense가 자연스럽게 적용되지 않는 구체적 usable source example이 있으면 그중 evidence 순서상 첫 ID, 없으면 null이다.
- `verdict=pass`: usable source example 전부에 candidate sense가 자연스럽게 적용되고, target sense가 입증되며, counterexample이 없다.
- `verdict=fail`: 구체적 counterexample이 있다. 이때 counterexample ID는 반드시 non-null이어야 한다.
- `verdict=insufficient`: 구체적 counterexample은 없지만 usable source example이 없거나 target sense 입증이 없다.

example 목록에 특정 문맥이 없다는 사실만으로 `fail`을 선택하지 않는다.

## 6. 고정 언어·증거 규칙

1. **문법적 복수와 lexical group sense**: 문법적 복수는 singular member sense와 정의가 같으면 별도 lexical group/collective sense가 아니다. 정의 자체가 구성원 개인이 아닌 집단 referent를 지시할 때만 별도 collective/group sense다. 복수형 예문이나 집합 문맥만으로 semantic exact를 승격하지 않는다.
2. **예문 목록의 비배타성**: source/target 예문 목록은 폐쇄 목록이 아니다. 목록에 어떤 문맥이 없다는 이유만으로 정의 범위를 좁히거나 `fail`로 만들지 않는다. usable source 예문 전부의 자연스러운 적용과 제공 target 예문 중 실제 target sense 입증 여부를 판정한다. source usable 예문 0개 또는 target 입증 없음은 `insufficient`이며, 구체적 의미 반례가 있을 때만 `fail`이다.
3. **한국어 대문자 비적용**: 한국어에는 영어식 대소문자 축을 직접 적용하지 않는다. 영어 source에 실제 capitalization evidence가 있으면 한국어 target conflict가 아니라 `source-only-preservable`, source 근거도 없으면 `unknown`이다. `match`나 `conflict`를 추정하지 않는다.
4. **source-only usage 보존**: source-only restriction의 metadata 보존 가능성은 semantic non-exact를 exact로 승격하지 않는다. target metadata 부재는 `match`가 아니다. source restriction이 명시돼 보존 가능하면 `source-only-preservable`, 아니면 `unknown`, 명시적 모순 evidence가 있을 때만 `conflict`다.

## 7. veto-only 원칙

- semantic non-exact, usage `conflict`·`unknown`·`target-only`, example `fail`·`insufficient`, schema/provenance/example coverage 오류는 exact/pass/approval로 승격할 수 없다.
- 복수→집단 무근거 승격, 예문 목록의 폐쇄 목록 취급, 한국어 capitalization conflict 오적용, target metadata 부재의 match 처리, source-only usage를 이용한 semantic 승격은 허용되지 않는다.
- 어떤 기계 rule도 false인 upstream 판정을 true로 바꿀 수 없다.

## 8. 완료와 제출

모든 10건을 `completed`로 채우고, 각 usable source example ID의 정확한 coverage와 categorical 일관성을 검증한다. exact read-list, 독립 작업, 다른 판정자와의 비소통, 외부 자료·도구 미사용을 form에 attest한다. completed form 제출 후에는 수정하지 않는다.
