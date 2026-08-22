# 데이터 출처와 이용 조건

마지막 검토: 2026-08-22

## 채택한 출처

MVP는 **영문 Wiktionary 한 곳**을 원천으로 사용합니다.

- 영어 항목에는 영어 정의, IPA, 음원, 용례와 여러 언어 번역이 함께 있어 영영·영한을 구성할 수 있습니다.
- 한국어 항목에는 발음·로마자 표기와 영어 정의가 있어 한영을 구성할 수 있습니다.
- 결과마다 원문 URL과 리비전 번호를 보존합니다.
- 텍스트는 [Wiktionary 저작권 안내](https://en.wiktionary.org/wiki/Wiktionary:Copyrights)에 따라 CC BY-SA 4.0/GFDL 조건으로 제공됩니다. 화면에는 원문 링크와 CC BY-SA 4.0 표시를 항상 노출합니다.
- 음원은 파일별 라이선스가 다를 수 있으므로 Wikimedia가 제공하는 원본 URL을 스트리밍하고, 파일을 재배포하지 않습니다.

데이터는 [MediaWiki Action API의 `action=parse`](https://www.mediawiki.org/wiki/API:Parsing_wikitext)를 서버에서 호출합니다. 운영 호출은 [Wikimedia API 이용 지침](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines)과 [User-Agent 정책](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy/en)을 따라야 합니다.

현재 운영 중계 서버는 Cloudflare Worker입니다. `WIKIMEDIA_USER_AGENT`는 저장소에 실제 값을 기록하지 않고 Cloudflare의 런타임 비밀값으로 설정하며, 괄호 안에는 공개 접근 가능한 연락처 URL을 사용합니다.

## 채택하지 않은 출처

- 네이버·다음·상용 사전 화면 스크래핑: 재사용 허가가 확인되지 않았고 화면 구조도 안정적인 데이터 계약이 아닙니다.
- Merriam-Webster/Cambridge 무료 API: 비상업 또는 평가용 제한이 있어 서비스의 기본 데이터로 고정하지 않았습니다.
- 국립국어원 한국어기초사전 API: 신뢰도 높은 한영 보강 후보이지만 별도 키 발급과 출처별 병합 규칙이 필요해 이번 무키 MVP에서는 제외했습니다.
- 생성형 AI 단독 뜻 생성: 출처 추적과 재현성이 낮아 사전 원천으로 사용하지 않습니다.

## 품질 한계

Wiktionary는 공동 편집 데이터이므로 항목별 완성도가 다릅니다. 특히 다음 경우가 있습니다.

- 영어 정의는 있지만 한국어 번역이 없는 항목
- IPA 대신 로마자 표기만 있는 한국어 항목
- 예문이 없거나, 인용 예문이 길고 문체가 오래된 항목
- 상위 문서 구조 변경으로 일부 항목의 자동 추출이 누락되는 경우

따라서 MVP는 원문 링크를 항상 제공하고, 찾지 못한 필드는 사실처럼 보충하지 않습니다.

## 다음 데이터 단계

사용량이 늘면 실시간 HTML 해석 대신 [Kaikki/Wiktextract](https://kaikki.org/) 덤프를 정기 수집해 자체 검색 색인을 만드는 편이 안정적입니다. 그 단계에는 다음이 필요합니다.

1. 원본 덤프 URL, 다운로드 시각, SHA-256, Wiktionary 덤프 날짜 기록
2. 원본과 변환 데이터 분리 및 변환 버전 기록
3. sense 단위 영한 번역 연결과 중복·동형어 보존
4. CC BY-SA 귀속과 동일조건변경허락 범위에 대한 배포 검토
5. 국립국어원 한영 데이터를 추가할 경우 출처별 결과를 섞지 않고 명시적으로 구분

이 작업은 MVP 출시와 별도 단계로 승인받아 진행합니다.
