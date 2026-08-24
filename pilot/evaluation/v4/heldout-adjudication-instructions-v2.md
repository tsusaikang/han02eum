# meaning-link-v4-heldout-10-v2 독립 판정 지침

상태: **독립 methodology audit 전 / blank form 생성 금지 / 판정 금지 / provider 호출 금지**  
대상 packet: `meaning-link-v4-heldout-10-v2`  
판정자: 서로 결과를 모르는 신규 blind adjudicator `E`, `F`

## 1. 시작 조건과 읽기 경계

E와 F는 `heldout-packet-seal-v2.json`에 봉인된 독립 methodology audit가 `GO`이고 `blankFormsAuthorized=true`로 별도 전환된 뒤에만 판정을 시작한다. 그 전에는 blank form을 만들거나 미리 채우지 않는다.

각 판정자는 seal의 `blindAdjudicatorExactReadList`에 있는 정확히 다섯 파일만 읽는다. 다른 사람의 form, adjudication 결과, disagreement, audit 결과 상세, v2/v3 모델 결과, 기존 7건·100건 결과, 자유서술 메모를 읽지 않는다. E와 F는 판정 도중 서로 토론하거나 결과·힌트를 교환하지 않는다.

읽기 전에 네 외부 파일의 raw SHA-256과 seal 자체의 `sealSelfIntegrity` projection SHA-256이 seal과 일치하는지 확인한다. 하나라도 다르면 시작하지 않고 packet 전체를 `NO-GO`로 돌린다.

## 2. 판정 대상과 방향

각 case는 하나의 English source sense와 하나의 Korean target sense를 연결한다. 모든 관계 값은 **target이 source에 대해 어떤 관계인지**를 나타낸다.

normative semantic 입력은 `semantic.targetRelationToSource` 하나뿐이다.

- `exact`: 정의가 가리키는 referent 또는 event, 참여자, 필요한 조건이 같다. 표현 방식이나 언어가 다르다는 이유만으로 exact를 거부하지 않는다.
- `broader`: target이 source 전부를 포함하지만 source 밖의 의미도 포함한다.
- `narrower`: target이 source의 일부만 포함한다.
- `overlap`: 일부는 겹치지만 어느 쪽도 다른 쪽 전체를 포함하지 않는다.
- `disjoint`: source에 맞는 referent/event가 target sense에는 맞지 않는다.

기존의 `referentTypeMatch`, `eventAndParticipantsMatch`, `necessaryConditionsMatch` 같은 diagnostic boolean은 이 packet의 normative core에 없고 만들어서도 안 된다. 위 판단 요소는 오직 하나의 relation을 고르는 데 사용한다.

usage 차이는 semantic relation과 분리한다. source-only usage restriction은 semantic non-exact를 exact로 승격하지 않으며, 의미 정의의 차이를 usage conflict로 다시 기록하지 않는다.

## 3. 네 언어·증거 규칙

1. **문법적 복수와 lexical group sense**: source 예문에 문법적 복수형이 있다는 사실만으로 singular member sense가 집단·collective sense가 되지 않는다. 정의 자체가 집단 referent를 지시할 때만 group sense로 본다.
2. **예문 목록의 비배타성**: target 예문 목록에 source와 동일한 상황이 없다는 이유만으로 `fail`을 주지 않는다. target 정의와 제공 예문이 target sense를 입증하고 source 문맥에 자연스럽게 적용될 수 있으면 `pass`가 가능하다.
3. **한국어 대문자 비적용**: 한국어 target에 영어식 capitalization conflict를 적용하지 않는다. source sense-level qualifier/label이 명시되어 있을 때만 `source-only-preservable`, 없으면 `unknown`이다. 문장 첫 글자나 고유명의 대문자는 근거가 아니다.
4. **source-only usage 보존**: source register/domain/temporal/regional restriction이 명시되고 target sense-level metadata가 없으면 그 축은 `source-only-preservable`이다. target metadata 부재를 `match`로 바꾸지 않는다.

## 4. usage 다섯 축

축 순서는 다음과 같이 고정한다.

1. `register`
2. `domain`
3. `temporal`
4. `regional`
5. `capitalization`

각 case의 `usageAxes.*.deterministicValue`는 evidence의 구조화된 explicit evidence에서 이미 기계적으로 파생된 값이다. 판정자는 추측하지 않고 schema가 요구하는 const를 그대로 기록한다.

- source explicit + target metadata absent → `source-only-preservable`
- source absent + target metadata absent → `unknown`

이 packet에서 target의 headword, 정의, 예문, 판정자의 언어 지식은 target usage metadata로 간주하지 않는다. target snapshot에 명시적인 sense-level usage field가 있어야만 metadata가 있는 것이다.

## 5. example 판정

evidence의 `source.usableSourceExampleIds`에 든 ID 전부를, 같은 순서로 `example.evaluatedSourceExampleIds`에 기록한다. 누락, 추가, 재정렬은 form validation 실패다. `usable=false`인 raw entry는 평가 목록에 넣지 않는다.

`example.targetSenseAttested`는 target 정의와 제공 target 예문 중 최소 하나가 해당 target sense를 실제로 입증하는지 나타낸다.

- `pass`: target sense가 입증되고, 모든 usable source example에 그 target sense가 자연스럽게 적용되며, 구체적 반례가 없다.
- `fail`: target sense는 입증되지만, usable source example 중 최소 하나가 source 정의에는 맞고 target sense에는 맞지 않는 구체적 반례다.
- `insufficient`: usable source example이 없거나 target sense가 제공 evidence로 입증되지 않는다. 단순히 target 예문에 동일 문맥이 없다는 것은 insufficient 사유가 아니다.

필드 결합은 다음과 같이 고정한다.

- `pass` → `targetSenseAttested=true`, `counterexampleSourceExampleId=null`
- `fail` → `targetSenseAttested=true`, `counterexampleSourceExampleId`는 평가한 usable source example ID 중 정확히 하나
- `insufficient` → `targetSenseAttested=false`, `counterexampleSourceExampleId=null`

semantic relation이 non-exact여도 제공된 특정 source 예문들이 우연히 target에 모두 적용될 수 있으므로, semantic relation과 example verdict는 각각 evidence에 따라 기록한다.

## 6. normative core와 자유서술

case별 normative core에는 다음만 허용한다.

- `caseId`, `sourceId`, `targetId`
- `semantic.targetRelationToSource`
- `usage`의 다섯 축
- `example.verdict`
- `example.evaluatedSourceExampleIds`
- `example.targetSenseAttested`
- `example.counterexampleSourceExampleId`

자유서술은 top-level `nonNormativeNotes`에만 선택적으로 둘 수 있다. 그 내용과 presence/absence는 schema validity, fingerprint, consensus, `semanticGold`, `publicationEligible`에 입력하지 않는다. case 내부 자유서술은 금지한다.

판정자는 `semanticGold`, `publicationEligible`, final approval, mismatch code를 제출하지 않는다. 이 값들은 E=F exact consensus 뒤에만 기계 파생한다.

## 7. 제출 검증과 exact consensus

각 form은 `heldout-adjudication-schema-v2.json`에 대해 독립적으로 valid해야 한다. case 순서와 case/source/target ID는 schema const와 정확히 같아야 한다.

비교용 ordered core bytes는 각 valid form에서 다음 키 순서로 새 객체를 만들어 compact UTF-8 JSON array로 직렬화한 결과다. 배열 순서는 form의 열 case 순서다. trailing newline은 넣지 않는다.

```text
caseId, sourceId, targetId,
semantic { targetRelationToSource },
usage { register, domain, temporal, regional, capitalization },
example { verdict, evaluatedSourceExampleIds, targetSenseAttested, counterexampleSourceExampleId }
```

E와 F의 ordered 10-case core bytes가 byte-for-byte 같아야 한다. SHA-256만 같다고 가정하지 말고 byte 비교도 성공해야 한다. 한 field, 한 case, 한 배열 순서라도 다르면 packet 전체 `NO-GO`다.

majority, field별 다수결, tie-break, 추가 resolver, 한쪽 form 선택, 판정 후 토론·수정은 금지한다. 자유서술은 core 밖이므로 서로 달라도 consensus에 영향을 주지 않는다.

## 8. consensus 뒤 기계 파생

valid exact-consensus case에서 다음을 모두 만족할 때만 `semanticGold=positive`다.

1. `targetRelationToSource=exact`
2. `example.verdict=pass`
3. `evaluatedSourceExampleIds`가 evidence의 usable ID 전부와 순서까지 같음
4. `targetSenseAttested=true`
5. `counterexampleSourceExampleId=null`

그 밖의 valid consensus case는 `semanticGold=negative`다.

`publicationEligible=true`는 `semanticGold=positive`이고 usage 다섯 축 모두가 `match`, `source-only-preservable`, `not-applicable` 중 하나이며 `unknown`, `conflict`, `target-only`가 하나도 없을 때만 가능하다. deterministic layer는 semantic label이나 approval을 false에서 true로 올릴 수 없고, true를 false로 veto할 수만 있다.

admission에는 열 case exact consensus, semantic positive 최소 4, semantic negative 최소 4, methodology audit `GO`, 결과 audit `GO`가 모두 필요하다.

## 9. 실행 금지

admission과 결과 audit 전 provider 호출은 0회여야 한다. held-out future gate 전에 legacy 7건과 sample 100건을 실행하지 않는다. 재시도, 선택적 채택, best-of-N은 금지한다. Git push, Cloudflare 배포, 실제 dictionary write/publication도 별도 명시 승인 전에는 금지한다.
