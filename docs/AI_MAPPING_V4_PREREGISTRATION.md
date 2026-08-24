# 한영 의미 연결 v4 사전등록 v1

상태: **설계 봉인 단계 / 최종 gold 없음 / provider 호출 금지**  
계약 ID: `bilingual-meaning-link-v4-preregistration/v1`  
held-out packet: `meaning-link-v4-heldout-10-v1`

## 1. 범위와 불변 경계

- 이 단계는 v4 방법론, blind held-out evidence, 독립 판정 양식, deterministic veto-only 및 admission/gate 골격만 고정한다.
- 기존 v3 fixture, audit, 실행 산출물, 기록된 SHA, 7행과 100행의 순서·내용·경로는 수정·삭제·덮어쓰기하지 않는다.
- v4는 `pilot/evaluation/v4/`, `scripts/lib/v4/`의 별도 versioned 경로만 사용한다.
- 이 사전등록과 독립 코드·방법론 감사가 모두 `GO`가 되기 전 실제 AI/provider/network 호출은 **0회**여야 한다.
- held-out gate가 통과하기 전 기존 7행과 동일 100행을 실행하지 않는다. 기존 v3 명령과 output 경로는 v4에서 재사용하지 않는다.
- Git commit/push, GitHub 상태 변경, Cloudflare 운영 배포, 운영 UI/API 병합은 이 계약 범위 밖이며 별도 명시 승인 전 금지한다.

## 2. Blind held-out 구성과 독립 adjudication

- packet은 로컬 고정 candidate snapshot의 source/candidate 원문 evidence만 담은 중립 ID 10건이다.
- packet에는 v2/v3 결과, 모델명/출력, 기존 gold, 예상 판정, positive/negative/control 역할명, 검색 점수, 후보 순위를 넣지 않는다.
- 두 primary adjudicator A/B는 서로의 판정과 대화를 보지 않고 같은 packet을 독립 판정한다.
- 각 adjudicator가 읽을 수 있는 파일은 이 문서, blind evidence, adjudication schema, 그리고 후속 담당자가 schema에서 별도 생성·봉인한 자신의 A 또는 B form뿐이다. 다른 form, 이전 보고서·fixture·audit·AI 결과, 구현 테스트는 읽지 않는다.
- 모든 10건을 `completed`로 판정하고 독립성 attestation을 참으로 기록해야 admission 대상이 된다.
- 의미 관계, 세 semantic boolean, semantic mismatch, 다섯 usage 축, usage mismatch, example verdict, 평가한 source example ID 집합, target sense attestation, counterexample ID와 example mismatch를 합친 normative fingerprint가 A/B에서 완전히 같아야 그 case를 합의로 본다.
- 한 필드라도 다르면 해당 case는 `disagreement`이고 전체 adjudication admission은 실패한다. 토론, 평균, 다수결, 한쪽 선택으로 해소하지 않는다.
- 불일치를 해소하려면 현재 A/B 산출물을 불변 보존한 뒤, primary 결과를 보지 않는 별도 resolver 절차·양식·seal을 새 버전으로 먼저 사전등록하고 독립 방법론 감사를 다시 받아야 한다. 그 전 provider 호출은 계속 0회다.

### Gold 파생과 수량 게이트

최종 gold는 이 단계에서 기록하지 않는다. A/B 합의 뒤 후속 gate 구현이 아래처럼 기계적으로 파생한다.

- `positive`: semantic이 `exact`, 세 semantic boolean이 모두 참, semantic mismatch가 null, 모든 usage가 `match`·`source-only-preservable`·`not-applicable` 중 하나, example이 `pass`, 모든 usable source example ID가 평가됐고 target sense가 실제 target 예문에서 입증되며 반례/mismatch가 없음.
- `negative`: 위 positive 조건 중 하나라도 충족하지 않음.
- 정확히 10건 모두 합의되어야 하며 admitted gold에 최소 positive 4건, negative 4건이 있어야 한다. 수량이 모자라면 이 v1 packet은 `NO-GO`로 닫고 gold·산출물을 보존한다. 결과를 본 뒤 현 packet에 사례를 교체·추가하거나 기준을 완화하지 않는다.

## 3. 결과 전에 고정하는 언어·증거 규칙

1. **문법적 복수와 lexical group sense**
   - 문법적 복수는 singular member sense와 정의가 같으면 자동으로 별도 lexical group/collective sense가 되지 않는다.
   - 별도 collective/group sense는 정의 자체가 구성원 개인이 아니라 집단 referent를 지시할 때만 인정한다.
   - 복수형 예문이나 집합적 문맥만으로 개인 의미를 집단 의미로 바꾸거나 semantic exact를 승격하지 않는다.

2. **예문 목록의 비배타성**
   - source/target 예문 목록은 가능한 모든 문맥을 열거한 폐쇄 목록이 아니라 비배타적 증거다.
   - 어떤 문맥이 목록에 없다는 이유만으로 정의 범위를 좁히거나 `fail`로 만들지 않는다.
   - usable source 예문 전부에서 candidate sense가 자연스럽게 적용되는지와, 제공된 target 예문 중 실제 candidate sense를 입증하는 것이 있는지만 판정한다.
   - source usable 예문이 0개거나 target sense 입증이 없으면 `insufficient`이며, 부재만으로 `fail`은 아니다. 구체적 의미 반례가 있을 때만 `fail`이다.

3. **한국어 대문자 비적용**
   - 한국어 문자체계에는 영어식 대소문자 축을 직접 적용하지 않는다.
   - 영어 source에 capitalization 정보가 실제 evidence로 있으면 한국어 target conflict가 아니라 `source-only-preservable`이다.
   - source에도 실제 capitalization 근거가 없으면 `unknown`이며 `match`나 `conflict`를 추정하지 않는다.

4. **source-only usage 보존**
   - source-only restriction을 별도 metadata로 보존할 수 있어도 semantic non-exact를 exact로 승격하지 않는다.
   - target metadata 부재는 `match`가 아니다. source restriction이 명시돼 보존 가능하면 `source-only-preservable`, 그렇지 않으면 `unknown`이다.
   - 명시적으로 모순되는 evidence가 있을 때만 `conflict`다.

## 4. Deterministic rule은 veto-only

- rule layer는 모델/상위 판정이 승인한 것을 차단할 수만 있고 미승인을 승인으로 바꿀 수 없다.
- semantic non-exact, usage `conflict`·`unknown`·`target-only`, example `fail`·`insufficient`, schema/provenance/example coverage 오류는 exact/pass/approval로 승격할 수 없다.
- 복수→집단 무근거 승격, 예문 목록을 폐쇄 목록으로 취급, 한국어 capitalization conflict 오적용, target metadata 부재를 match로 취급, source-only usage로 semantic을 승격한 흔적은 모두 veto 사유다.
- upstream approval이 false이면 다른 모든 입력이 양호해도 최종 approval은 반드시 false다.

## 5. 실행 admission과 반복 계약

held-out provider 실행 admission은 아래가 모두 참일 때만 열린다.

- 이 단계의 preregistration/blind evidence/schema seal SHA와 후속 A/B form·판정 산출물의 별도 seal SHA 검증 성공
- A/B 10건 완결·독립 attestation·전 필드 합의 및 admitted positive 4 / negative 4 이상 수량 통과
- 구현자 및 adjudicator와 독립적인 code auditor의 signed `GO`
- 구현자 및 adjudicator와 독립적인 methodology auditor의 signed `GO`
- code/method reviewer가 서로 다른 사람이고 audit 대상 SHA가 seal과 일치
- 기존/partial/lock/output 충돌 없음과 실제 호출 수 0을 독립 preflight에서 확인

실행기는 이 1단계에 구현하지 않는다. 향후 구현 시 아래 값은 결과 전에 고정한다.

- prompt contract: `bilingual-equivalence/v4-preregistered-1`
- primary: `@cf/openai/gpt-oss-20b`, repetitions 3, seeds `317`, `331`, `347`
- blind verifier: `@cf/qwen/qwen3-30b-a3b-fp8`, repetitions 3, seeds `719`, `733`, `751`
- temperature 0, model/case/repetition당 최대 1 attempt, 자동 retry 0
- verifier는 primary 결론·근거·gold·다른 반복을 보지 않음
- 10 case × 2 model × 3 repetition = 정확히 60 attempt; 누락·중복·추가 호출 금지
- 모든 성공·실패·오류 attempt와 raw-free provenance/usage audit을 새 충돌 없는 v4 경로에 배타적으로 보존하고 선택적 재실행·결과 채택 금지

## 6. Held-out 집계와 실패 조건

- 각 attempt의 normative fingerprint는 해당 adjudicated consensus와 완전히 같아야 한다.
- positive case는 6/6 assessment 모두 positive여야 한다.
- negative case는 approval escape가 0/6이어야 하며 6/6 fingerprint가 consensus와 같아야 한다.
- 전체 60/60 attempt가 존재하고 provider/schema/refusal/truncation/timeout/provenance/example-coverage 오류가 0이어야 한다.
- 하나라도 누락·중복·오류·fingerprint 불일치·negative escape·positive miss가 있으면 held-out gate 전체가 실패한다. 평균·다수결·best-of-N으로 구제하지 않는다.
- 모든 반복은 보존하며 같은 packet/model/prompt로 재시도해 기대 결과만 고르지 않는다.

## 7. 기존 7행·동일 100행 후속 경계

- held-out gate 통과와 held-out 결과 독립 감사 `GO` 전에는 기존 7행과 동일 100행 모두 금지다.
- 통과 뒤에도 기존 v3 command/output을 재사용하지 않고 별도 v4 bundle 계약과 사용자 실행 승인을 먼저 확정한다.
- 동일 100행은 그 뒤 정확히 1회만 실행한다. 부분·실패 attempt도 그 1회에 포함하며 자동 재시도하지 않는다.
- 100행 완료 뒤 frozen 7행과 겹치는 source ID를 100 bundle 안에서 원천 재계산하는 overlap post-run gate를 반드시 실행한다. 한 행이라도 누락·오류·회귀하면 전체 100행 평가를 실패로 표시한다.
- 100행에는 사람 gold가 없으므로 승인 변화, 모델 합의, 축별 불일치, overlap 회귀, 오류, 사용량·비용만 보고하고 precision/accuracy/오승인률을 주장하지 않는다.

## 8. 현재 단계의 강제 상태

현재 단계에는 A/B form이나 gold가 없고 admission은 `NO-GO`다. 후속 담당자가 schema에서 form을 생성·별도 봉인하고 독립 adjudication과 code/method audit을 완료하기 전 `providerCallAllowed=false`, `heldoutGatePassed=false`, `sample100Allowed=false`를 유지한다.
