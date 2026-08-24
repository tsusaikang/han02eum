# meaning-link-v4-heldout-10-v2 중립 독립 판정 지침

대상 packet: `meaning-link-v4-heldout-10-v2`  
protocol: `meaning-link-v4-heldout-10-v2-protocol-v3`  
판정 slot: 서로 결과를 보지 않는 `E`, `F`

## 1. 정확한 입력 다섯 파일

각 판정자는 제공된 다음 다섯 파일만 읽는다.

1. `pilot/evaluation/v4/heldout-evidence-v2.json`
2. `pilot/evaluation/v4/heldout-adjudication-instructions-v3.md`
3. `pilot/evaluation/v4/heldout-adjudication-schema-v3.json`
4. 자신의 slot과 formId가 적힌 blank form 하나
5. `pilot/evaluation/v4/heldout-execution-seal-v3.json`

다른 slot의 blank 내용, 다른 판정자의 form이나 결과, 제공 목록 밖의 파일 또는 외부 설명·힌트를 읽지 않는다. 서로 토론하거나 결과를 교환하지 않으며 network, provider 또는 project AI를 사용하지 않는다.

execution seal은 `path`와 lowercase raw-byte SHA-256만 든 중립 JSON array다. evidence, instructions, schema, 자신의 blank가 seal의 대응 path와 SHA에 일치하는지 확인한다. execution seal 자체의 raw SHA-256도 직접 계산한다. 누락, 추가, path 불일치 또는 SHA 불일치가 있으면 내용을 판정하지 말고 input-integrity failure로 반환한다.

자신의 blank는 변경하지 않는다. 고정된 completed output path에 별도 사본을 만들고, 실제 execution seal raw SHA를 `executionSealSha256`에 기록하며 `executionSealBindingCompleted=true`로 완성한다. `readListAttestation`에는 위 다섯 실제 파일의 path와 raw SHA를 정해진 순서대로 기록한다. 제공된 파일의 무결성과 독립 작업에 관한 필드만 attest한다.

## 2. 의미 관계의 방향과 값

각 case는 English source sense 하나와 Korean target sense 하나의 연결이다. `semantic.targetRelationToSource`는 **target이 source에 대해** 가지는 관계다.

- `exact`: 정의가 가리키는 referent 또는 event, 참여자와 필요한 조건이 같다. 표현 방식이나 언어가 다르다는 이유만으로 exact를 거부하지 않는다.
- `broader`: target이 source 전부를 포함하면서 source 밖의 의미도 포함한다.
- `narrower`: target이 source의 일부만 포함한다.
- `overlap`: 일부가 겹치지만 어느 쪽도 다른 쪽 전체를 포함하지 않는다.
- `disjoint`: source에 맞는 referent/event가 target sense에는 맞지 않는다.

normative semantic 입력은 이 relation 하나뿐이다. referent/event/condition에 대한 별도 diagnostic boolean이나 mismatch code를 만들지 않는다. usage 차이는 semantic relation과 분리하며, 의미 정의 차이를 usage conflict로 다시 기록하지 않는다.

## 3. 네 언어·증거 규칙

1. **문법적 복수**: source example의 문법적 복수형만으로 singular member sense를 lexical collective/group sense로 바꾸지 않는다. group 여부는 정의의 referent로 판단한다.
2. **referent와 event/state 구분**: source 정의가 person/group referent를 가리키는데 target 정의가 행위, 상태 또는 별개의 개인 referent를 가리키면 그 정의 차이를 semantic relation에 반영한다.
3. **target example 비배타성**: target example 목록에 source와 같은 collocation이나 상황이 없다는 이유만으로 `fail` 또는 `insufficient`를 주지 않는다. target 정의와 제공 예문이 sense를 입증하고 source 문맥에 자연스럽게 적용되면 `pass`가 가능하다.
4. **capitalization와 source-only restriction**: 영어 source의 sense-level capitalization qualifier는 한국어 target conflict가 아니다. 명시된 source restriction은 target sense-level metadata가 없을 때 `source-only-preservable`로 보존한다. register/domain/temporal/regional restriction에도 같은 규칙을 적용한다. 문장 첫 글자나 고유명의 대문자는 sense-level qualifier가 아니다.

## 4. usage 다섯 축

축과 key 순서는 `register`, `domain`, `temporal`, `regional`, `capitalization`이다.

가능한 값은 다음과 같다.

- `match`: 양쪽의 명시 metadata가 같은 restriction을 보존한다.
- `source-only-preservable`: source에만 명시 restriction이 있고 target metadata가 없으며 source-side qualifier로 보존할 수 있다.
- `target-only`: target에만 명시 restriction이 있다.
- `conflict`: 양쪽 명시 metadata가 서로 양립하지 않는다.
- `not-applicable`: 해당 축이 구조상 적용되지 않는다.
- `unknown`: restriction absence를 확인할 비교 metadata가 없거나 양쪽 metadata가 없다.

각 case의 evidence `usageAxes.*.deterministicValue`는 구조화된 explicit evidence에서 이미 기계 파생됐다. schema가 case-specific 50 values를 const로 강제하므로 그대로 기록한다.

- source explicit + target metadata absent → `source-only-preservable`
- source absent + target metadata absent → `unknown`

target headword, 정의, 예문 또는 판정자의 언어 지식은 target sense-level usage metadata를 만들지 않는다. source-only restriction은 semantic non-exact를 exact로 올리지 않는다.

## 5. example 판정과 full coverage

`example.evaluatedSourceExampleIds`는 evidence의 `source.usableSourceExampleIds` 전부와 순서까지 같아야 한다. `usable=false` raw entry는 평가 목록에 넣지 않는다.

`example.targetSenseAttested`는 target 정의와 제공 target examples 중 최소 하나가 해당 target sense를 실제로 입증하는지를 나타낸다.

- `pass`: target sense가 입증되고 모든 usable source example에 자연스럽게 적용되며 구체적 반례가 없다.
- `fail`: target sense는 입증되지만 usable source example 중 적어도 하나가 source 정의에는 맞고 target sense에는 맞지 않는 구체적 반례다.
- `insufficient`: usable source example이 없거나 제공 evidence가 target sense를 입증하지 못한다. target example에 같은 문맥이 없다는 사실만으로 insufficient가 되지 않는다.

필드 결합은 다음과 같다.

- `pass` → `targetSenseAttested=true`, `counterexampleSourceExampleId=null`
- `fail` → `targetSenseAttested=true`, `counterexampleSourceExampleId`는 case의 usable source example ID 중 정확히 하나
- `insufficient` → `targetSenseAttested=false`, `counterexampleSourceExampleId=null`

semantic relation과 example verdict는 별도 evidence 질문이다. non-exact relation이어도 제공된 특정 example들이 target에 적용될 수 있다.

## 6. completed form과 normative core

slot별 identity는 고정되어 있다.

| slot | formId | completed output path |
|---|---|---|
| E | `meaning-link-v4-heldout-10-v2-E-v3` | `pilot/evaluation/v4/heldout-adjudication-form-E-v3.completed.json` |
| F | `meaning-link-v4-heldout-10-v2-F-v3` | `pilot/evaluation/v4/heldout-adjudication-form-F-v3.completed.json` |

formId, slot, output path, evidence SHA, execution-seal binding과 read-list attestation은 제출 identity이며 case core 밖이다. case별 normative core에는 다음만 허용한다.

- `caseId`, `sourceId`, `targetId`
- `semantic.targetRelationToSource`
- `usage.register`, `usage.domain`, `usage.temporal`, `usage.regional`, `usage.capitalization`
- `example.verdict`
- `example.evaluatedSourceExampleIds`
- `example.targetSenseAttested`
- `example.counterexampleSourceExampleId`

optional `nonNormativeNotes`의 내용과 presence는 schema validity를 제외한 fingerprint, consensus, gold, publication eligibility에 입력하지 않는다. case 내부 자유서술은 금지한다. 판정자는 `semanticGold`, `publicationEligible`, final approval 또는 mismatch code를 제출하지 않는다.

completed output은 schema-valid해야 하며 추가로 다음 cross-file binding을 모두 만족해야 한다.

- `executionSealSha256` = execution seal 실제 raw SHA-256
- read-list의 execution-seal entry SHA = 같은 값
- read-list의 common 세 파일과 own blank SHA = 실제 bytes 및 execution seal 대응 entry
- exact five paths, own slot blank, 고정 output identity가 모두 일치

## 7. ordered core와 E/F exact consensus

각 valid completed form에서 다음 key 순서로 새 case 객체를 만들고 evidence 순서의 10개를 compact UTF-8 JSON array로 직렬화한다. trailing newline은 없다.

```text
caseId, sourceId, targetId,
semantic { targetRelationToSource },
usage { register, domain, temporal, regional, capitalization },
example { verdict, evaluatedSourceExampleIds, targetSenseAttested, counterexampleSourceExampleId }
```

E/F ordered core bytes는 SHA 비교와 직접 byte comparison에서 모두 같아야 한다. 한 field, case order 또는 array order라도 다르면 whole round를 거부한다. majority, field별 다수결, tie-break, 추가 resolver, 한쪽 form 채택, 결과를 본 뒤 토론·수정은 허용하지 않는다.

## 8. `semanticGold`와 `publicationEligible`

valid exact-consensus case에서 다음을 모두 만족할 때만 `semanticGold=positive`다.

1. `targetRelationToSource=exact`
2. `example.verdict=pass`
3. evaluated source example IDs가 evidence의 usable IDs 전부와 순서까지 같음
4. `targetSenseAttested=true`
5. `counterexampleSourceExampleId=null`

그 밖의 valid consensus case는 `semanticGold=negative`다. usage는 semantic polarity에 입력하지 않는다.

`publicationEligible=true`는 semantic positive이고 다섯 usage 축이 전부 `match`, `source-only-preservable`, `not-applicable` 중 하나이며 `unknown`, `conflict`, `target-only`가 하나도 없을 때만 가능하다.

deterministic layer는 veto-only다. semantic negative를 positive로, non-exact를 exact로, fail/insufficient를 pass로, veto usage를 허용 usage로, approval false를 true로 바꿀 수 없다.

admission에는 열 case exact consensus, semantic positive 최소 4, semantic negative 최소 4, 그리고 별도 결과 무결성 검사가 모두 필요하다.

## 9. 고정된 후속 gate

후속 gate는 10 cases × 2 models × 3 repetitions = 정확히 60 attempts다. 각 attempt는 consensus full normative fingerprint, 기계 파생 `semanticGold`, `publicationEligible`에 따른 final approval을 모두 exact match해야 한다. errors, refusals, truncations, timeouts, provenance/coverage failures와 semantic-negative approval escape 허용치는 0이다.

retry, best-of-N, majority/average, selective rerun 또는 결과 선택은 허용하지 않는다. 이 held-out gate 전 legacy 7건과 sample 100건을 실행하지 않는다.
