# 데이터 출처와 이용 조건

마지막 검토: 2026-08-23

## 운영 중인 기본 출처

운영 서비스는 현재 **영문 Wiktionary**를 기본 원천으로 사용한다.

- 영어 항목의 영어 정의, IPA, 음원 링크, 예문과 번역표를 사용한다.
- 한국어 항목의 발음·로마자 표기와 영어 정의를 사용한다.
- 결과마다 원문 URL과 리비전 번호를 보존한다.
- 텍스트는 [Wiktionary 저작권 안내](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)에 따라 CC BY-SA 4.0/GFDL 조건으로 제공된다.
- 음원은 파일별 라이선스가 다를 수 있으므로 원본 URL만 사용하고 파일을 재배포하지 않는다.

데이터는 [MediaWiki Action API의 `action=parse`](https://www.mediawiki.org/wiki/API:Parsing_wikitext)를 Cloudflare Worker에서 호출한다. 운영 호출은 [Wikimedia API 이용 지침](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines)과 [User-Agent 정책](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy/en)을 따른다. 실제 `WIKIMEDIA_USER_AGENT`는 저장소가 아닌 Cloudflare 런타임 비밀값으로 관리한다.

## 보강 파일럿 출처

한국어 번역이 비어 있는 Wiktionary 의미의 후보를 찾기 위해 **국립국어원 한국어기초사전 전체 내려받기 JSON**을 사용한다.

- 공식 내려받기: [한국어기초사전 전체 내려받기](https://krdict.korean.go.kr/download/downloadPopup)
- 사용한 스냅샷: 2026-08-19
- 압축 파일 크기: 84,455,509바이트
- 압축 파일 SHA-256: `7cf41e62a2a36158a8be2b6d2f84c086221e9b29d4345c44e5497eebf21c8c40`
- 추출한 고유 표제어 ID: 53,671개
- 영어 대역 의미 레코드: 71,058개
- 텍스트 이용 조건: [한국어기초사전 저작권 정책](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo)에 따른 CC BY-SA 2.0 KR

발음 음원과 이미지는 파일별 조건이 다를 수 있으므로 이 파일럿에 포함하지 않는다. 원본 약 1GB와 파생 색인은 GitHub에 올리지 않고 `.local/`에서만 처리한다.

## AI의 역할

AI는 사전 원천이나 번역 생성기가 아니다. Wiktionary의 기존 영어 의미와 한국어기초사전이 이미 제공한 영어 의미를 비교하고, 미리 검색된 후보 중 같은 개념인지 판정하는 보조 처리기다.

- AI가 후보 밖의 한국어 단어를 새로 만들 수 없다.
- 양방향으로 같은 개념인 `exact` 관계만 승인 가능하다.
- 일반 판정과 반대 사례 탐색 판정이 같은 후보에 합의해야 한다.
- 불일치, 형식 오류, 외부 호출 오류는 모두 미승인으로 처리한다.
- 모델명, 실행 시각, 두 판단, 토큰 사용량, 양쪽 원문 ID와 링크를 결과에 남긴다.

AI가 승인한 연결은 두 출처를 하나의 익명 데이터처럼 합치는 것이 아니라, Wiktionary 의미와 한국어기초사전 의미 사이의 파생 연결 레이어로 분리한다. 운영 화면에 도입할 경우 원 Wiktionary 번역과 AI 연결 보강의 출처·성격을 각각 표시해야 한다.

2026-08-23의 100건 실제 파일럿에서는 19건이 AI 승인됐으나, 독립 AI 감사자 두 명이 모두 엄격한 동치로 본 것은 6건뿐이었다. 같은 모델의 두 번 합의는 상하위 범위, 사건 유형, 실제 예문과 사용역 차이를 충분히 걸러내지 못했다. 따라서 이 결과는 운영 데이터에 병합하지 않았으며, 자세한 내용은 `docs/AI_MAPPING_PILOT_REPORT.md`에 기록했다.

## 채택하지 않은 출처와 방식

- 네이버·다음·상용 사전 화면 스크래핑: 재사용 허가와 안정적인 데이터 계약이 확인되지 않았다.
- Collins 영한 사전: `royal` 명사에 `왕족`을 직접 제공하지만 API 키, 데이터셋 접근 범위, 저장·재배포 조건을 계약으로 확인해야 하므로 현재 파일럿 원천으로 채택하지 않았다.
- 생성형 AI 단독 뜻 생성: 출처 추적과 재현성이 낮아 사용하지 않는다.
- 후보 점수만으로 자동 공개: `왕족`과 `왕실`처럼 가까우나 다른 개념을 구분하지 못하므로 금지한다.

## 품질 한계

- Wiktionary 번역표의 의미 설명이 영어 정의와 정확히 일치하지 않으면 자동 귀속을 보류한다.
- 한국어기초사전 영어 대역어는 직역 표제어가 아닐 수 있다. `왕족`의 영어 대역어는 `royal`이 아니라 `being of royal blood`다.
- 같은 품사와 비슷한 영어 문구만으로 개체/집단, 넓은 뜻/좁은 뜻을 완전히 구분할 수 없다.
- AI 합의는 사람의 정답표가 아니므로, 운영 도입 전 고정 평가셋에서 오승인률을 측정해야 한다.
- 원천 리비전이나 뜻풀이가 바뀌면 기존 연결을 자동 재검토 대상으로 돌려야 한다.
