# 말결 사전

영어와 한국어 단어를 검색해 발음, 영한·영영·한영 뜻, 예문을 함께 보는 웹 사전 MVP입니다.

## 실행

Node.js 20 이상에서 별도 패키지 설치 없이 실행됩니다.

```sh
npm start
```

브라우저에서 `http://127.0.0.1:4173`을 엽니다. 개발 중 파일 변경을 자동 반영하려면 `npm run dev`를 사용합니다.

검증 명령은 다음과 같습니다.

```sh
npm test
npm run check
```

## 현재 제공 범위

- 영어 검색: IPA, 공개 음원 또는 기기 음성, 한국어 번역어, 영영 뜻, 예문
- 한국어 검색: 발음 표기 또는 로마자 표기, 영어 뜻, 제공되는 경우 예문
- 검색 URL 공유와 뒤로 가기
- 원문 링크, Wiktionary 리비전 번호, CC BY-SA 4.0 표시
- 외부 호출을 줄이는 10분 메모리 캐시와 오류·호출량 제한 대응

검색 결과는 영문 Wiktionary의 현재 공개 항목을 공식 MediaWiki API로 읽어, 브라우저 안에서 구조화해 표시합니다. 원문 HTML을 화면에 직접 삽입하지 않고 텍스트만 추출합니다.

## 배포 전 필수 설정

Wikimedia의 User-Agent 정책에 맞게 공개 연락처가 포함된 값을 지정해야 합니다.

```sh
WIKIMEDIA_USER_AGENT="MalgyeolDictionary/0.1 (https://example.com/contact)" NODE_ENV=production npm start
```

운영 환경에서는 서버 한 대의 메모리 캐시 대신 공유 캐시, 요청 속도 제한, 관측 지표를 추가하는 것이 좋습니다. 데이터 선택과 라이선스 판단은 [데이터 출처 문서](./docs/DATA_SOURCES.md), 현재 공식 상태는 [프로젝트 상태 문서](./docs/PROJECT_STATE.md)를 확인하세요.
