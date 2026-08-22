# 한영이음 사전 — 공식 프로젝트 상태

마지막 갱신: 2026-08-22 (KST)

## 현재 목표와 완료 조건

로컬 Node 서버에 의존하던 사전 MVP를 GitHub 저장소와 연결된 Cloudflare Worker로 이전한다.

이번 단계의 완료 조건:

- 정적 화면과 `/api/lookup`을 Cloudflare Worker 한 서비스에서 제공
- GitHub `main` 푸시를 Cloudflare Workers Builds가 자동 감지하도록 설정 가능한 저장소 상태
- 운영 필수값 누락 시 배포 및 API가 안전하게 실패
- API 캐시, 입력 검증, Wiktionary 오류 처리를 Worker 환경에서 보존
- 자동 테스트, 타입·문법 검사, 배포 번들 검증 통과
- GitHub 외부 전송과 Cloudflare 실제 배포 전 사용자 승인 경계 보존

## 확정된 결정과 이유

1. 서비스 이름은 `한영이음`으로 한다. 영어와 한국어를 잇는 사전이라는 역할이 이름에서 바로 드러나고 발음이 쉽기 때문이다.
2. npm 패키지 식별자는 `hanyeong-ieum-dictionary`, GitHub 저장소와 Cloudflare Worker 이름은 `han02eum`으로 한다. 이미 생성된 짧은 `han02eum.dwnc.workers.dev` 주소를 유지하며, Cloudflare 프로젝트와 `wrangler.jsonc`의 Worker 이름은 반드시 일치시킨다.
3. 새 운영 기반은 Cloudflare Workers Static Assets로 한다. 정적 화면과 서버 API를 한 배포 단위와 같은 출처에서 제공할 수 있다.
4. Git 연동은 Cloudflare Workers Builds가 GitHub `main` 브랜치를 감시하는 방식으로 한다. 사용자가 선택한 운영 흐름이며 푸시마다 검증·배포 이력을 남길 수 있다.
5. Wikimedia 호출은 브라우저가 아니라 Worker가 수행한다. 공개 연락처 User-Agent, 캐시, 제한 시간, 오류 처리를 한곳에서 관리하기 위해서다.
6. `WIKIMEDIA_USER_AGENT`는 Cloudflare 런타임 비밀값으로 두고 필수값으로 선언한다. 연락처가 이메일일 수도 있어 저장소 노출을 피하고, 누락된 운영 배포를 차단하기 위해서다.
7. Worker의 Cache API를 사용해 성공·미존재 응답을 10분간 공유 캐시한다. 서버 한 프로세스에 묶인 기존 메모리 캐시를 제거하기 위해서다.
8. Cloudflare 자동 호출 로그와 추적은 끄고 검색어가 없는 오류 코드만 기록한다. 자동 관측 정보에 요청 URL과 검색어가 남는 것을 줄이기 위해서다.
9. `main` 푸시는 배포를 일으킬 수 있으므로 원격 저장소 생성·연결·푸시는 저장소 공개 범위와 연락처 값 확인 후 진행한다.

## 완료한 작업

- 기존 `server.mjs`를 Cloudflare Worker 모듈 구조로 교체
- 정적 자산 바인딩과 `/api/*` 우선 라우팅 설정
- Wikimedia API 중계, 8초 제한 시간, 5 MiB 응답 상한, 오류 매핑
- 검색어 NFC 정규화, 길이·제어문자 검증
- Cloudflare Cache API 기반 10분 공유 캐시와 HIT/MISS 응답 헤더
- 운영 User-Agent 누락 시 배포 검증 실패 및 API 503 처리
- API와 정적 자산 보안 헤더, 검색어를 남기지 않는 최소 오류 로그 설정
- Node 순수 로직 테스트와 Cloudflare 런타임 라우팅 테스트 구성
- GitHub/Cloudflare 연결 절차와 검증 명령 문서화
- 서비스 이름을 `한영이음`, npm 패키지 식별자를 `hanyeong-ieum-dictionary`, 배포 Worker 이름을 `han02eum`으로 확정하고 화면·설정·문서에 반영
- 컨텍스트 한계 전에 공식 상태와 인수인계를 먼저 갱신하도록 프로젝트 지침 추가
- Cloudflare Worker `han02eum`과 GitHub `tsusaikang/han02eum` 연결
- Workers Builds를 `main`, `npm run verify`, `npm run deploy`로 설정하고 비운영 브랜치 자동 빌드 비활성화
- `WIKIMEDIA_USER_AGENT` 런타임 Secret 등록 및 암호화 표시 확인

## 산출물과 관련 파일

- Worker 진입점: `src/worker.js`
- 요청 처리·캐시: `src/handler.js`
- Wikimedia 연동: `src/dictionary-api.js`
- 배포 설정: `wrangler.jsonc`
- 정적 자산 보안 헤더: `public/_headers`
- 사용자 화면: `public/index.html`, `public/styles.css`, `public/app.js`
- 사전 파서: `public/dictionary-parser.js`
- 자동 테스트: `test/server.test.mjs`, `test/parser-helpers.test.mjs`, `test/worker/routes.spec.js`
- 배포 절차: `docs/CLOUDFLARE_DEPLOYMENT.md`
- 데이터 결정: `docs/DATA_SOURCES.md`

## 검증 결과

- `npm run check`: 통과
- `npm run test:node`: 11/11 통과
- `npm run test:worker`: 3/3 통과
- `npm run cf-typegen:check`: 통과
- `npm run verify`: 통과(Node 로직·캐시 11/11, Worker 런타임 3/3 포함)
- `npm run deploy:dry-run`: 통과(정적 파일 6개 인식, 번들 8.81 KiB / gzip 3.15 KiB)
- `wrangler check startup`: 통과(로컬 시작 프로파일 17.8 ms; 실서버 성능 수치는 아님)
- GitHub `main` 푸시를 감지한 Cloudflare Workers Build `3f11c2ad`가 커밋 `95ccc3e`를 검증·배포
- 운영 주소 `https://han02eum.dwnc.workers.dev/`에서 첫 실배포 확인
- 실 URL `hello` 검색: IPA, 한국어 뜻, 영영 정의, 예문, 출처 정상 표시
- 실 URL `안녕` 검색: 로마자, 영어 뜻, 예문, 출처 정상 표시
- 미존재 단어 안내 정상 표시
- 동일 `hello` API 재요청에서 `X-Dictionary-Cache: HIT` 확인
- 390 × 844 모바일 화면에서 헤더, 검색창, 추천 검색어, 결과 카드가 가로로 잘리지 않음
- 배포 후 Logs 활성, Invocation logs 비활성, Traces 비활성 상태 확인

위 실 URL 결과가 현재 운영 체크포인트다. Wiktionary 원문과 리비전은 이후 변경될 수 있으므로 항목 내용 자체는 시점 의존적이다.

## 미해결 문제

- GitHub 저장소는 `tsusaikang/han02eum`으로 정했고 로컬 `origin`에 연결했다. 비로그인 HTTP 요청에서 200 응답을 확인해 공개 저장소 및 Wikimedia 공개 연락처 URL로 사용하기로 했다.
- 코드 공개 라이선스와 상업 이용 여부는 아직 사용자 확정이 필요하다.
- Wiktionary 항목별 번역·예문 품질 편차와 문서 구조 변경 가능성은 남아 있다.
- 사용자 도메인 연결은 선택 사항으로 남아 있다.

## 다음 단계

1. 필요하면 workers.dev 주소 대신 사용자 도메인을 연결한다.
2. 코드 공개 라이선스와 상업 이용 계획을 확정한다.
3. 실제 사용 중 발견되는 Wiktionary 항목별 품질 편차를 수집하고 파서 개선 우선순위를 정한다.

## 중요한 제약과 주의사항

- 운영 환경은 공개 연락처가 포함된 `WIKIMEDIA_USER_AGENT`를 반드시 설정한다.
- Workers Builds의 빌드용 변수는 런타임에 전달되지 않는다. 이 값은 반드시 Worker의 **Settings > Variables & Secrets**에 넣는다.
- 검색 URL의 자동 수집을 줄이기 위해 Cloudflare 호출 로그와 추적을 다시 켜지 않는다. 관측을 확대할 때는 보존 기간과 검색어 마스킹 방식을 먼저 정한다.
- Cloudflare Worker 이름과 `wrangler.jsonc`의 `name`을 다르게 만들지 않는다.
- `main` 연결 뒤의 푸시는 운영 배포가 될 수 있으므로 검증되지 않은 변경을 바로 푸시하지 않는다.
- Wiktionary 출처 링크·리비전·CC BY-SA 표시를 제거하지 않는다.
- 상용 사전 사이트 스크래핑, 대규모 덤프/DB 구축, 다른 출처 자동 병합은 별도 승인 범위다.

## Git 체크포인트

- 로컬 저장소는 `main` 브랜치이며 전환 전 기준 커밋은 `b7ae0a2`이다.
- GitHub 원격 `origin`은 SSH 주소 `git@github.com:tsusaikang/han02eum.git`에 연결했고, 공개 주소는 `https://github.com/tsusaikang/han02eum`이다.
- HTTPS 푸시는 로컬 인증 정보가 없어 중단됐고 아무것도 전송되지 않았다. 기존 SSH 키가 GitHub 계정 `tsusaikang`으로 인증되는 것을 확인한 뒤 같은 저장소로 전환했다.
- `main` 최초 푸시를 완료했고 로컬 브랜치는 `origin/main`을 추적한다.
- 서비스 이름 변경과 프로젝트 지침은 커밋 `9adbb12`로 원격에 보존됐다.
- Cloudflare Worker 이름 정합성 수정과 첫 자동 배포 트리거는 커밋 `95ccc3e`로 원격에 보존됐다.
- Cloudflare 전환 변경은 최종 전체 검증을 통과해 새 로컬 커밋으로 보존했다.

## 인수인계 체크포인트

Cloudflare Worker `han02eum`과 GitHub 저장소 연결, 자동 빌드 명령, 운영 브랜치, 런타임 Secret 설정을 완료했다. 최초 빌드의 Worker 이름 불일치를 수정한 커밋 `95ccc3e`를 `main`에 푸시했고, Cloudflare가 이를 자동 감지해 Build `3f11c2ad`에서 검증·배포했다. 운영 주소에서 영어·한국어·미존재 검색, 캐시 HIT, 모바일 화면, 로그 보호 설정을 확인했다. GitHub → Cloudflare 자동 배포 이전 목표는 완료됐다.

새 작업 권장. 배포 이전 단계가 끝났고 다음은 도메인·라이선스·사전 품질처럼 별도 의사결정이 필요한 운영 개선 단계다.

새 작업의 첫 메시지로 사용할 인수인계 프롬프트:

> `/Users/jusang/projects/english-dictionary/docs/PROJECT_STATE.md`를 먼저 읽고 한영이음 프로젝트의 다음 운영 개선 단계를 진행해줘. GitHub `tsusaikang/han02eum`의 `main`은 Cloudflare Worker `han02eum`에 자동 배포되며 운영 주소는 `https://han02eum.dwnc.workers.dev/`다. 첫 자동 배포와 영어·한국어 검색, 미존재 항목, 캐시 HIT, 모바일 화면 검수까지 완료됐다. 기존 Wikimedia 출처·라이선스 표시, 런타임 Secret, 검색어 로그 보호, 검증 후 푸시 원칙을 유지해라. 먼저 사용자와 다음 우선순위가 사용자 도메인, 코드 라이선스, 또는 사전 품질 개선 중 무엇인지 정하고 작업하라.
