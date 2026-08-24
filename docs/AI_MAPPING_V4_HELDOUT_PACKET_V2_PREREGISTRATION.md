# 한영 의미 연결 v4 held-out packet v2 사전등록

상태: **packet·protocol 설계 봉인 / 독립 methodology audit 전 / blank form 없음 / adjudication 없음 / provider 0-call**  
계약 ID: `bilingual-meaning-link-v4-heldout-packet-v2-preregistration/v1`  
base 계약: `bilingual-meaning-link-v4-preregistration/v2`  
packet ID: `meaning-link-v4-heldout-10-v2`

## 1. 목적과 완료 조건

이 문서는 기존 판정 결과나 disagreement를 보지 않은 상태에서 새 source sense 10건으로 만든 held-out packet v2의 identity, evidence, blind adjudication core, exact-consensus admission, 미래 provider gate를 결과 전에 고정한다.

현재 단계의 완료 조건은 다음과 같다.

1. 기존 v3 7 source IDs, 동일 sample 100 source IDs, held-out v1 10 source IDs와 신규 10 source IDs의 overlap이 0이다.
2. source/target 정의, 품사, provenance, 모든 preregistered usable source example, case당 target example 최소 1개가 sealed evidence에 있다.
3. 판정자 E/F에게 노출되는 다섯 파일에는 anticipated role, anticipated label, gold, 이전 결과가 없다.
4. case별 usage 다섯 축이 explicit structured evidence로부터 deterministic const로 파생되고 schema가 const를 강제한다.
5. 독립 methodology audit `GO` 전 blank form과 adjudication은 금지한다.
6. E/F의 ordered 10-case normative core가 byte-identical이고 semantic positive 최소 4, negative 최소 4일 때만 admission 후보가 된다.
7. future gate 전 provider 0-call, legacy 7건·sample 100건 실행 금지, push/deploy 금지를 유지한다.

curation의 내부 균형 목표는 정의와 예문상 명확한 semantic exact/pass 후보 5건과 명확한 negative 후보 5건이었다. case별 anticipated polarity와 answer key는 어떤 sealed blind 파일에도 기록하지 않았다. 이 균형 목표는 gold가 아니며 E/F 결과를 구속하지 않는다.

## 2. source identity와 제외 증명

ID 직렬화는 UTF-8 source ID 한 개와 LF 한 개를 순서대로 이어 붙이며 마지막 ID 뒤에도 LF를 둔다. pair 직렬화도 `sourceId::targetId` 한 개와 LF 한 개를 같은 방식으로 사용한다.

신규 packet의 봉인값은 다음과 같다.

- ordered source IDs LF SHA-256: `8477af01e53eeb7d8fb3444d2ccf47231051eaf1ecddfd113332676556ece795`
- sorted-unique source IDs LF SHA-256: `76d451a2fd794458283ba7c5814d853468edf03b4577d81badd60b646b592b1a`
- ordered pair IDs LF SHA-256: `9ce75c487ba9c475a818ce6c3fec4c7c8977a4f91b66957271a53eae34ed2dac`
- ordered case IDs LF SHA-256: `670c5814981f912ce3b704ee2373ae2cb87505cbe26280b1a58a8961ca369eac`
- source ID duplicate count: `0`
- pair ID duplicate count: `0`

제외 입력은 다음과 같다.

| 제외 집합 | source 수 | 추출 순서 SHA-256 |
|---|---:|---|
| `ai-mapping-counterexamples-v1.json`의 `.cases[].sourceId` | 7 | `94c3d4179190dafb150ef33447adbd72418756c9aa19468f139f92e60dbfa137` |
| `ai-mapping-sample-100-v1.json`의 `.orderedSourceIds[]` | 100 | `b3b07e21cf31d973ee871b3156830c57e2b475bd422633677db8f34fb057e40c` |
| `heldout-evidence-v1.json`의 `.cases[].source.id` | 10 | `84f9776fd7996298b14cb85d740b58fb5e126c94f282be2ab1b8b47d8893feee` |

세 제외 집합의 sorted-unique 합집합은 110 IDs이고 LF SHA-256은 `690acc1c022ce319618bacfda210486014e188f3ae94fc5ef49cca014a35d71c`다. 신규 sorted-unique 10 IDs와 이 합집합의 exact string intersection은 `0`이다.

## 3. case 구성 원칙

- 동일 source ID를 두 번 쓰지 않는다.
- source와 target은 sealed local snapshot에 실제로 존재해야 한다.
- 모든 pair는 sealed `mapping-candidates` record 안의 candidate pair여야 한다.
- 정의, 품사, source sense label, source raw example entry를 원문대로 보존한다.
- lexicographic cross-reference처럼 usage example이 아닌 raw entry는 삭제하지 않고 `usable=false`와 이유 code로 보존한다.
- 모든 `usable=true` source example에 stable ID를 부여한다.
- target example은 case당 3개를 보존해 최소 1개 조건을 넘긴다.
- 모호한 고유명만으로 뜻을 결정하는 사례, 장문만으로 뜻을 결정하는 사례, 해석 불가능한 고어만으로 뜻을 결정하는 사례는 피한다. temporal-restriction 사례의 예문도 정의와 함께 읽으면 referent가 직접 식별되는 것을 택했다.

## 4. 사전등록된 언어규칙 coverage

packet은 전체적으로 다음을 실제로 시험한다. 이 절은 E/F의 exact five-file read-list 밖에 있으며 case별 expected answer를 지정하지 않는다.

1. **문법적 복수 positive 후보**: singular source definition의 대상이 예문에서 문법적으로 복수로 나타나도 자동으로 lexical collective가 되지 않는 사례가 있다.
2. **collective/group vs state negative 후보**: source 정의가 person/group referent를 가리키지만 target 정의가 관찰 행위·상태를 가리키는 사례가 있다.
3. **target 예문 비배타성 positive 후보**: source와 target 정의가 직접 대응하지만 target 예문 목록에 source와 동일한 collocation이 없는 사례가 있다. 동일 문맥 부재만으로 fail을 만들지 않는다.
4. **capitalization**: 새 ID 후보 전체에서 explicit source sense-level capitalization qualifier를 찾되, 존재하면 Korean target conflict가 아니라 `source-only-preservable`로 보존한다.
5. **source-only usage**: register, domain, temporal, regional explicit restriction과 target metadata absence를 `source-only-preservable`로 보존하는 사례를 포함한다. 이는 semantic non-exact를 exact로 올리지 않는다.

## 5. capitalization eligibility의 사전 한계

sealed source snapshot 1,005 records의 `englishGloss`와 `sourceSenseLabels`를 case-insensitive pattern `capitali[sz]|uppercase|lowercase`로 전수 검색했다.

- matching source sense: 1
- matching IDs LF SHA-256: `60f663e01e40ce500a3dfe78f4fc4a4a30368a7ae6ef75fe9d7061379222ee8d`
- 필수 제외 후 eligible new source sense: 0
- eligible IDs bytes SHA-256: empty bytes의 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

유일한 matching source ID는 기존 7/100 제외 집합에 있어 사용할 수 없었다. 따라서 “완전히 새 source ID” 조건을 유지하면서 capitalization-qualified case를 넣는 것은 현재 snapshot에서 불가능하다. 요청된 fallback에 따라 다른 explicit source evidence가 있는 새 senses를 선택했다. 신규 10건의 capitalization은 모두 `unknown` const다. 예문 첫 글자나 고유명 대문자를 qualifier로 승격하지 않는다.

## 6. usage const 파생

normative usage 축과 순서는 `register`, `domain`, `temporal`, `regional`, `capitalization`이다.

각 case에서 evidence는 축별로 다음 구조를 가진다.

- `sourceEvidenceStatus`: `explicit` 또는 `absent`
- `sourceExplicitValues`: 원천에 명시된 값만
- `sourceEvidencePointers`: 정의 qualifier 또는 source sense label의 위치
- `targetMetadataStatus`: target snapshot의 sense-level metadata 존재 여부
- `targetExplicitValues`: target metadata에 명시된 값만
- `deterministicValue`: 아래 규칙의 결과

현재 packet에 적용되는 파생은 다음 두 가지다.

- source explicit + target metadata absent → `source-only-preservable`
- source absent + target metadata absent → `unknown`

target headword, 정의, 예문, 상식으로 usage metadata를 추측하지 않는다. source restriction이 없고 target metadata도 없으면 반드시 `unknown`이다. 정의상의 referent/event/necessary-condition 차이는 semantic relation에서만 다루고 usage `conflict`로 중복 기록하지 않는다.

schema의 각 prefix item은 evidence의 five-axis `deterministicValue`와 같은 `const`를 가진다. evidence/schema 불일치 하나라도 methodology audit `NO-GO`다.

## 7. 새 normative adjudication core

ordered case core는 다음 필드만 포함한다.

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

semantic relation vocabulary는 `exact`, `broader`, `narrower`, `overlap`, `disjoint`다. target-to-source 방향이다. 기존 diagnostic semantic booleans와 mismatch code/presence는 이 packet의 normative core에서 제거한다.

자유서술은 top-level `nonNormativeNotes`에만 둘 수 있고 그 presence와 내용은 core, consensus, label, publication eligibility에 입력하지 않는다.

## 8. example 규칙과 full coverage

- `evaluatedSourceExampleIds`는 evidence의 `usableSourceExampleIds` 전부와 순서까지 같아야 한다.
- target 예문 목록에 source와 동일한 상황이 없다는 이유만으로 `fail` 또는 `insufficient`를 만들지 않는다.
- source usable example 0 또는 target sense attestation 없음은 `insufficient`다.
- `fail`에는 target sense attestation과 usable source example의 구체적 counterexample ID가 필요하다.
- `pass`에는 target sense attestation, full coverage, counterexample null이 필요하다.

schema는 verdict, attestation, counterexample의 결합과 case별 exact source example ID 목록을 강제한다.

## 9. E/F exact consensus admission

독립 methodology audit `GO` 뒤에만 E/F blank form을 만든다. E와 F는 seal의 exact five-file read-list만 읽고 독립 판정한다.

두 form은 각각 schema-valid여야 한다. ordered 10-case core를 지침의 고정 key order로 compact UTF-8 JSON array, trailing newline 없음으로 직렬화한다. E/F core bytes는 SHA 비교뿐 아니라 직접 byte comparison에서도 같아야 한다.

한 field라도 다르면 전체 `NO-GO`다. majority, case/field별 tie-break, 추가 resolver, 한쪽 결과 채택, 토론 후 수정은 금지한다.

exact consensus 뒤 기계 파생한 `semanticGold`가 positive 최소 4, negative 최소 4여야 한다. methodology audit와 후속 결과 audit도 `GO`여야 한다.

## 10. `semanticGold`와 `publicationEligible`

valid exact-consensus case에서 다음을 모두 만족할 때만 `semanticGold=positive`다.

1. `targetRelationToSource=exact`
2. `example.verdict=pass`
3. evaluated source example IDs가 evidence의 usable IDs 전부와 순서까지 같음
4. `targetSenseAttested=true`
5. `counterexampleSourceExampleId=null`

그 밖의 valid consensus case는 `semanticGold=negative`다. usage는 semantic polarity에 입력하지 않는다.

`publicationEligible=true`는 semantic positive이고 usage 다섯 축 어디에도 `unknown`, `conflict`, `target-only`가 없으며 각 축이 `match`, `source-only-preservable`, `not-applicable` 중 하나일 때만 가능하다.

deterministic layer는 veto-only다. semantic negative를 positive로, non-exact를 exact로, example fail/insufficient를 pass로, `unknown`/`conflict`/`target-only`를 match로, approval false를 true로 바꿀 수 없다.

## 11. future provider gate

provider 실행은 admission과 결과 audit 뒤의 별도 승인 단계다. base 계약이 봉인한 두 model identity, repetition, seed, temperature를 변경하지 않는다.

- 10 cases × 2 models × 3 repetitions = 정확히 60 attempts
- 선택적 재실행과 retry 0
- 각 attempt의 full normative fingerprint가 consensus core와 exact match
- 각 attempt의 `semanticGold`가 consensus에서 기계 파생한 값과 exact match
- 각 attempt의 final approval이 consensus `publicationEligible`와 exact match
- errors/refusal/truncation/timeout/provenance/coverage failures 0
- semantic-negative final approval true인 negative approval escape 0
- 60/60 exact가 아니면 전체 gate fail

semantic-positive이지만 usage veto로 publication-ineligible인 case의 final approval false는 positive miss가 아니다. 그러나 fingerprint 또는 semanticGold가 다르면 miss다.

held-out gate 전 legacy 7건과 sample 100건 실행은 금지한다. best-of-N, majority, 평균, 결과 선택, 결과를 본 뒤 taxonomy/case/model 변경은 금지한다.

## 12. 현재 gate state

- `independentMethodologyAuditGo=false`
- `blankFormsAuthorized=false`
- `adjudicationAuthorized=false`
- `finalGoldPresent=false`
- `providerCallsAuthorized=false`
- `providerCallsObserved=0`
- `legacySevenAuthorized=false`
- `sample100Authorized=false`
- `gitPushAuthorized=false`
- `productionDeployAuthorized=false`

GitHub push, Cloudflare deploy, 실제 data write/publication은 별도 명시 승인이 없으면 계속 금지한다.
