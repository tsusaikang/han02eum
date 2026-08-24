# 한영 의미 연결 v4 held-out packet protocol v3 사전등록

상태: **protocol 설계 봉인 / 독립 methodology re-audit 전 / blank form 없음 / execution seal 없음 / adjudication 없음 / provider 0-call**  
계약 ID: `bilingual-meaning-link-v4-heldout-packet-protocol-v3-preregistration/v1`  
protocol ID: `meaning-link-v4-heldout-10-v2-protocol-v3`  
고정 evidence packet ID: `meaning-link-v4-heldout-10-v2`

## 1. 범위와 불변 입력

이 protocol은 이미 봉인된 `heldout-evidence-v2.json`의 같은 ordered 10 cases를 변경하지 않고 판정 전달·신원 결합·consensus·후속 gate만 다시 사전등록한다.

- evidence path: `pilot/evaluation/v4/heldout-evidence-v2.json`
- evidence raw SHA-256: `a6b27e32c6c5ff28a1959eae37665c1ef6b23cc7e28402b4e411bb7cf36bd83f`
- case count: `10`
- ordered case IDs LF SHA-256: `670c5814981f912ce3b704ee2373ae2cb87505cbe26280b1a58a8961ca369eac`
- ordered source IDs LF SHA-256: `8477af01e53eeb7d8fb3444d2ccf47231051eaf1ecddfd113332676556ece795`
- ordered target IDs LF SHA-256: `e5e37903bffba2ed2117388534f89f579aabd00fd45d918b284b52cc190ca394`
- ordered pair IDs LF SHA-256: `9ce75c487ba9c475a818ce6c3fec4c7c8977a4f91b66957271a53eae34ed2dac`

기존 packet v2 다섯 파일과 독립 methodology audit v2는 불변 기록이다. v3 파일은 그 파일들을 덮어쓰거나 사후 수정하지 않는다.

## 2. 두 P1의 protocol-level 해소

### 2.1 history-free blind contract

E/F에게는 author-facing preregistration, protocol seal, methodology audit, project status, 이전 packet seal, 이전 form/result/disagreement 또는 다른 history 문서를 제공하지 않는다. 판정 규칙 전체는 중립적인 `heldout-adjudication-instructions-v3.md` 하나에 자급적으로 고정한다.

각 판정자의 exact five-file read-list는 다음뿐이다.

1. `pilot/evaluation/v4/heldout-evidence-v2.json`
2. `pilot/evaluation/v4/heldout-adjudication-instructions-v3.md`
3. `pilot/evaluation/v4/heldout-adjudication-schema-v3.json`
4. 자신의 slot에 해당하는 blank form 하나
5. `pilot/evaluation/v4/heldout-execution-seal-v3.json`

E는 F blank를, F는 E blank를 파일로 읽지 않는다. execution seal 안에서 반대 slot blank의 path와 SHA가 보이는 것은 그 파일 내용을 읽은 것이 아니다.

### 2.2 post-audit custody와 비순환 결합

독립 methodology re-audit가 새 protocol에 `GO`를 기록하기 전에는 다음 파일을 만들지 않는다.

- `pilot/evaluation/v4/heldout-adjudication-form-E-v3.blank.json`
- `pilot/evaluation/v4/heldout-adjudication-form-F-v3.blank.json`
- `pilot/evaluation/v4/heldout-execution-seal-v3.json`

`GO` 뒤 custodian만 위 세 파일을 만든다. methodology 상태와 생성 권한은 custodian의 author-facing precondition이며 E/F가 읽거나 attest하는 값이 아니다.

순환 hash를 피하기 위해 blank는 completed output schema에 대한 제출물이 아니다. blank의 `executionSealBindingCompleted`는 `false`, `executionSealSha256`와 `readListAttestation`은 `null`, 판정 선택지는 비어 있다. custodian은 두 blank의 raw SHA를 먼저 계산한 뒤 execution seal을 만든다. E/F는 blank를 덮어쓰지 않고 별도 completed output에 복사·완성하며, 그때 execution seal의 실제 raw SHA를 결합한다.

## 3. 고정 form·slot·output identity

| slot | formId | blank input | completed output |
|---|---|---|---|
| E | `meaning-link-v4-heldout-10-v2-E-v3` | `pilot/evaluation/v4/heldout-adjudication-form-E-v3.blank.json` | `pilot/evaluation/v4/heldout-adjudication-form-E-v3.completed.json` |
| F | `meaning-link-v4-heldout-10-v2-F-v3` | `pilot/evaluation/v4/heldout-adjudication-form-F-v3.blank.json` | `pilot/evaluation/v4/heldout-adjudication-form-F-v3.completed.json` |

schema의 slot별 `oneOf`는 `formId`, `adjudicatorSlot`, `outputIdentity.path`, own-blank read-list path의 조합을 고정한다. completed output은 다음도 모두 만족해야 한다.

- `executionSealBindingCompleted=true`
- `executionSealSha256`가 실제 execution seal raw bytes의 lowercase SHA-256과 동일
- `readListAttestation`가 slot별 정확한 다섯 path와 실제 raw SHA를 같은 순서로 기록
- common 세 파일과 두 blank의 SHA는 execution seal의 대응 entry와 동일
- blank input은 변경되지 않고 completed output은 고정된 별도 path에 기록

Draft 2020-12 schema는 path, slot, identity, 완성 여부, SHA lexical form, exact five-entry 구조를 강제한다. 서로 다른 JSON 필드와 외부 파일 bytes 사이의 SHA equality는 schema validation에 더해 mandatory cross-file binding validation으로 검사한다. 둘 중 하나라도 실패하면 제출은 invalid다.

## 4. blank form 생성 계약

custodian은 methodology `GO`를 확인한 한 번의 post-audit 단계에서 slot별 blank를 deterministic하게 만든다.

- UTF-8 JSON, 고정 key order, trailing newline 1개
- packet/protocol/evidence/form/slot/output identity는 위 const로 채움
- case/source/target IDs와 ordered usable source example IDs는 schema const와 같게 채움
- case별 usage 다섯 축은 evidence의 deterministic const로 채움
- semantic relation, example verdict와 attestation처럼 판정이 필요한 값은 미기입 상태
- `executionSealBindingCompleted=false`
- `executionSealSha256=null`
- `readListAttestation=null`
- anticipated role/label, gold, publication decision, score, hint, history, status, authorization, audit outcome 없음

blank는 completed schema-valid form처럼 오인하지 않도록 한다. completed output만 `heldout-adjudication-schema-v3.json`을 통과해야 한다.

## 5. neutral execution seal

execution seal은 compact UTF-8 JSON array이며 trailing newline이 없다. 배열 entry 순서와 내용은 정확히 다음 다섯 path의 raw SHA다.

1. evidence v2
2. instructions v3
3. schema v3
4. E blank
5. F blank

각 entry는 key order가 `path`, `sha256`이고 이 두 string 외에는 어떤 key도 없다. top-level object나 metadata도 없다. 따라서 execution seal에는 history, status, authorization, audit outcome, adjudication outcome, 예상 label, gold 또는 설명 문장이 없다.

E/F는 execution seal raw bytes 자체의 SHA-256을 직접 계산한다. 이 값은 completed form의 `executionSealSha256`과 read-list 마지막 entry SHA가 된다. execution seal은 자기 SHA를 내부에 넣지 않는다.

## 6. 판정 core와 usage/example 계약

ordered case normative core는 다음 필드만 가진다.

```text
caseId
sourceId
targetId
semantic.targetRelationToSource
usage.register
usage.domain
usage.temporal
usage.regional
usage.capitalization
example.verdict
example.evaluatedSourceExampleIds
example.targetSenseAttested
example.counterexampleSourceExampleId
```

semantic relation은 target-to-source 방향의 `exact`, `broader`, `narrower`, `overlap`, `disjoint` 하나다. diagnostic semantic booleans와 mismatch code는 core에 없다.

usage 축 순서는 `register`, `domain`, `temporal`, `regional`, `capitalization`이다. evidence에서 파생된 case-specific 50 values를 schema const로 강제한다. source restriction 없음과 target metadata 없음은 `unknown`, source explicit restriction과 target metadata 없음은 `source-only-preservable`이다. 정의상의 의미 차이를 usage conflict로 중복 기록하지 않는다.

모든 usable source example ID를 evidence 순서 그대로 평가한다. `pass`, `fail`, `insufficient`는 target attestation과 counterexample ID 결합 규칙을 따라야 한다. target 예문 목록에 같은 문맥이 없다는 사실만으로 fail/insufficient가 되지 않는다.

## 7. 네 언어규칙

1. 문법적 복수는 singular member sense를 자동으로 lexical collective로 만들지 않는다.
2. 정의상의 person/group referent와 event/state/individual target은 같은 뜻으로 합치지 않는다.
3. target example 목록은 비배타적이므로 동일 collocation 부재만으로 자연 적용 가능한 예문을 배제하지 않는다.
4. 영어 capitalization qualifier는 한국어 target conflict가 아니다. explicit source restriction은 source-only-preservable로 보존하며, register/domain/temporal/regional도 같은 explicit-evidence 원칙을 쓴다.

## 8. consensus, gold, publication

E/F completed form은 각각 schema-valid 및 cross-file-binding-valid여야 한다. ordered 10-case core를 instructions v3의 고정 key order로 compact UTF-8 JSON array, trailing newline 없이 직렬화한다. 두 core는 SHA뿐 아니라 직접 bytes가 같아야 한다. 한 field라도 다르면 round 전체를 거부한다.

majority, tie-break, 추가 resolver, 한쪽 form 선택, 결과를 본 뒤 토론·수정은 금지한다.

valid exact-consensus case는 relation `exact`, example `pass`, full ordered coverage, target attested true, counterexample null을 모두 만족할 때만 `semanticGold=positive`다. 나머지 valid consensus case는 negative다. admission에는 positive 최소 4와 negative 최소 4가 필요하다.

`publicationEligible=true`는 semantic positive이고 다섯 usage 축이 모두 `match`, `source-only-preservable`, `not-applicable` 중 하나일 때만 가능하다. `unknown`, `conflict`, `target-only` 하나라도 있으면 false다. deterministic layer는 semantic label이나 approval을 false에서 true로 올리지 못하고 veto만 할 수 있다.

## 9. future provider gate와 금지

후속 admission 및 result audit 이후 별도 승인된 gate는 10 cases × 2 models × 3 repetitions = 정확히 60 attempts다. 60/60 full fingerprint, `semanticGold`, `publicationEligible`-기반 final approval이 exact match해야 한다. error/refusal/truncation/timeout/provenance/coverage failure와 negative approval escape 허용치는 모두 0이다. retry, best-of-N, majority, 평균, 선택적 재실행·채택은 없다.

held-out gate 전 legacy 7건과 sample 100건 실행은 금지한다. 현재 protocol 단계에서는 provider/network/project AI 판정, blank/execution seal 생성, adjudication, push, deploy를 하지 않는다.

## 10. method auditor exact read boundary

`heldout-packet-protocol-seal-v3.json`은 독립 method auditor가 읽을 exact six-file list를 SHA와 함께 봉인한다.

1. 독립 methodology audit v2
2. 고정 evidence v2
3. 이 preregistration
4. neutral instructions v3
5. completed-form schema v3
6. protocol seal v3 자체의 canonical projection

method auditor는 forms, execution seal, adjudication results, 다른 audits, disagreement, model results/reports, project state를 읽지 않는다. audit `GO` 전 blank와 execution seal이 실제로 없는지도 확인한다.

