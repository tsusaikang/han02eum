# 원천 기반 영한·한영 사전

2026-09-07. 새 구조는 영어판 Wiktionary의 뜻에 한국어 뜻을 매칭하는 것을 선행조건으로 삼지 않는다.

## 제품 구조

- 기본 `/`: 한국어판 Wiktionary 영어 항목의 한국어 뜻을 보여 주는 영한 검색, 한국어기초사전 원문을 보여 주는 한영 검색.
- 영어 기본 뜻이 없으면 한국어기초사전의 영어 대응표현 검색을 별도 영역으로 펼친다. 이 관계를 Wiktionary 뜻의 exact 번역으로 만들지 않는다.
- 영어판 Wiktionary는 별도의 영영 원문 링크로 제공한다.
- `/legacy_20260907_205800.html`: 기존 검색 화면과 공개 exact208을 보존한다. 기존 app·원천·검토 결과를 삭제하거나 새 원천으로 재분류하지 않는다.
- 기존 공유 주소 `?q=`를 유지하고 입력 언어로 검색 방향을 자동 판별한다. 방향 선택 버튼은 없으며 이전 `direction` 파라미터는 검색 방향을 강제하지 않는다. 검색 성공 알림은 화면 공간을 차지하지 않고 접근성 알림으로 제공한다.

## 입력과 가공

한국어판 원시 입력은 [Kaikki raw 배포](https://kaikki.org/dictionary/rawdata.html)의 [ko-extract.jsonl.gz](https://kaikki.org/dictionary/downloads/ko/ko-extract.jsonl.gz)이다. 원본은 `.local/sources/kowiktionary_20260907_205330/`에 보존한다. 빌더는 `scripts/build-native-english-ko_20260907_205330.mjs`이며 다음 명령으로 아직 존재하지 않는 출력 폴더에 만들 수 있다.

```sh
node scripts/build-native-english-ko_20260907_205330.mjs INPUT.jsonl.gz NEW_OUTPUT_DIRECTORY
```

빌더의 버전과 로더 버전은 현재 입력에 고정돼 있다. 다음 원천 갱신 때에는 새 버전 경로와 로더 상수를 함께 갱신한다. 기존 결과를 덮어쓰지 않는다. 다운로드 URL은 갱신 가능한 주소이므로 manifest의 입력 hash는 이번 파일을 식별하며 미래 다운로드가 같은 내용임을 보장하지 않는다.

한국어 뜻이 있는 원래 영어 표제형15,370개를 정규화 검색키15,248개·원천 항목16,584개·뜻21,543개로 제공한다. 한국어 뜻이 없거나 명백히 깨진1,304뜻은 새 제품용 변환에서 제외했고 원본에는 남아 있다. unknown 품사9,841항목도 유효 한국어 뜻을 보존하며 품사를 추정하지 않는다. 품질 전수 검토·사전 전체 수록률을 뜻하는 숫자는 아니다.

원표제어와 뜻 경계를 유지한다. 공백·Unicode를 정규화하고 검색키는 소문자로 찾되, `US`와 `us`처럼 대소문자가 의미를 구별하면 정확 표제어 일치를 우선한다. 정확한 대소문자 표제어가 없으면 동일 검색키의 원표제어 후보를 각각 표시한다. 원천의 예문·발음이 있는 범위만 표시하고, 예문에만 있는 한국어를 새 정의로 승격하지 않는다.

한국어기초사전은 기존 v1/recovered/Korean-only 정적 자료를 재사용한다. 한영 검색51,909표제형·76,833뜻은 참고·활용 안내도 포함한 기존 raw 범위다. 한영 로더는 원천 영어 표현을 exact 중복 처리 때문에 숨기지 않는다. 영어 역검색은 기존 단일 영어표현18,173검색키 범위이며 여러 단어 표현의 역검색을 새로 생성하지 않는다. 영한 primary의 공백 표현 지원과 구분한다.

## 파일

- `public/native-english-ko_20260907_205330/`: 새 영한64샤드·manifest.
- `public/native-english-ko.js`: 영한 조회와 대소문자 구분.
- `public/native-korean-en_20260907_205345.js`: 한영 원천·영어 대응표현 조회.
- `public/native-dictionary-app_20260907_205350.js`: 검색과 원문 뜻 표시.
- `public/native-dictionary_20260907_205350.css`, `public/native-dictionary_20260907_205350.html`: 새 UI. 활성 `public/index.html`은 이 HTML과 동일하다.
- `test/native-english-ko_20260907_205330.test.mjs`, `test/native-korean-en_20260907_205345.test.mjs`, `test/native-dictionary-ui_20260907_205350.test.mjs`: 새 동작 검사.

## 출처와 이용조건

영한 자료는 한국어판 위키낱말사전 기여자 원문, CC BY-SA 4.0 및 Kaikki 추출·가공 사실을 뜻별 접힌 출처에 표시한다. 추출 프로그램 MIT와 사전 데이터 라이선스는 별개다. [한국어판 자료 안내](https://kaikki.org/kowiktionary/), [원천 예시·라이선스](https://ko.wiktionary.org/wiki/apple).

한영 자료는 한국어기초사전 원문 및 CC BY-SA 2.0 KR을 표시한다. 새 멀티미디어 자료를 별도 수집하거나 재생하지 않는다. [국립국어원 저작권 정책](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo).

## 실행과 점검

기존 Worker·계정·도메인·비밀값·배포 설정은 변경하지 않는다. 새 기본 검색은 같은 도메인의 정적 사전 자료만 읽는다. 기존 `/api/lookup`은 이전 검색에서 계속 사용한다. 새 정적 화면은 로컬 정적 서버에서도 확인할 수 있다. 이전 검색 API까지 확인하려면 기존 Worker 개발 환경을 사용한다.

배포 대상 checkout에서 `npm run verify`를 사용한다. 이전 화면의 기존 기능 검사는 HTML fixture를 보존된 legacy 페이지로 읽고, 새 화면 검사는 활성 index와 실제 새 loader를 읽는다. 실제 운영 반영과 브라우저 확인 결과의 정본은 `docs/PROJECT_STATE.md`를 따른다.
