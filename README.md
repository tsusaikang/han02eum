# 말결 사전

영어와 한국어 단어를 검색해 발음, 영한·영영·한영 뜻, 예문을 함께 보는 웹 사전 MVP입니다.

운영 환경은 **Cloudflare Worker + Static Assets**입니다. 브라우저 화면과 `/api/lookup`이 한 도메인에서 제공되며, GitHub `main` 브랜치에 새 커밋이 올라오면 Cloudflare Workers Builds가 자동으로 검증하고 배포하도록 구성합니다.

## 구조

- `public/`: 브라우저 화면과 Wiktionary 결과 파서
- `src/worker.js`: Cloudflare Worker 진입점
- `src/handler.js`: 정적 파일/API 라우팅, Cloudflare 캐시, 오류 응답
- `src/dictionary-api.js`: Wikimedia API 호출과 응답 검증
- `wrangler.jsonc`: Worker·정적 자산·필수 운영값 설정
- `docs/CLOUDFLARE_DEPLOYMENT.md`: GitHub 연동 배포 절차

검색 결과는 영문 Wiktionary의 현재 공개 항목을 공식 MediaWiki API로 읽어 브라우저에서 구조화해 표시합니다. 원문 HTML을 화면에 직접 삽입하지 않고 텍스트만 추출합니다.

## 검증

Node.js 20 이상에서 의존성을 설치한 뒤 전체 검증을 실행합니다.

```sh
npm ci
npm run verify
```

운영 서비스는 로컬 서버를 계속 켜둘 필요가 없습니다. 필요할 때만 `.dev.vars.example`을 `.dev.vars`로 복사해 공개 연락처 값을 바꾸고 `npm run dev`로 로컬 확인을 할 수 있습니다.

## 현재 제공 범위

- 영어 검색: IPA, 공개 음원 또는 기기 음성, 한국어 번역어, 영영 뜻, 예문
- 한국어 검색: 발음 표기 또는 로마자 표기, 영어 뜻, 제공되는 경우 예문
- 검색 URL 공유와 뒤로 가기
- 원문 링크, Wiktionary 리비전 번호, CC BY-SA 4.0 표시
- Cloudflare 공유 캐시를 이용한 10분 API 캐시
- Wikimedia 지연·호출 제한·비정상 응답·대용량 응답 방어

## 배포 전 필수 설정

Cloudflare Worker 이름은 `wrangler.jsonc`의 `malgyeol-dictionary`와 같아야 합니다. Worker의 **Settings > Variables & Secrets**에 다음 런타임 비밀값을 먼저 추가합니다.

- 이름: `WIKIMEDIA_USER_AGENT`
- 값 예시: `MalgyeolDictionary/0.2 (https://github.com/OWNER/REPOSITORY)`

괄호 안에는 실제로 공개 접근 가능한 저장소나 연락처 페이지를 넣어야 합니다. 이 값이 없으면 배포 검증이 실패하고 API도 안전하게 503을 반환합니다.

GitHub 연결과 Workers Builds 입력값은 [Cloudflare 배포 안내](./docs/CLOUDFLARE_DEPLOYMENT.md), 데이터 선택과 라이선스 판단은 [데이터 출처 문서](./docs/DATA_SOURCES.md), 현재 공식 상태는 [프로젝트 상태 문서](./docs/PROJECT_STATE.md)를 확인하세요.
