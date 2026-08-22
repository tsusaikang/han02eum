# 말결 사전 — 공식 프로젝트 상태

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

1. 새 운영 기반은 Cloudflare Workers Static Assets로 한다. 정적 화면과 서버 API를 한 배포 단위와 같은 출처에서 제공할 수 있다.
2. Git 연동은 Cloudflare Workers Builds가 GitHub `main` 브랜치를 감시하는 방식으로 한다. 사용자가 선택한 운영 흐름이며 푸시마다 검증·배포 이력을 남길 수 있다.
3. Worker 이름은 `malgyeol-dictionary`로 고정한다. Cloudflare 프로젝트 이름과 `wrangler.jsonc`의 이름이 달라 빌드가 실패하는 것을 방지한다.
4. Wikimedia 호출은 브라우저가 아니라 Worker가 수행한다. 공개 연락처 User-Agent, 캐시, 제한 시간, 오류 처리를 한곳에서 관리하기 위해서다.
5. `WIKIMEDIA_USER_AGENT`는 Cloudflare 런타임 비밀값으로 두고 필수값으로 선언한다. 연락처가 이메일일 수도 있어 저장소 노출을 피하고, 누락된 운영 배포를 차단하기 위해서다.
6. Worker의 Cache API를 사용해 성공·미존재 응답을 10분간 공유 캐시한다. 서버 한 프로세스에 묶인 기존 메모리 캐시를 제거하기 위해서다.
7. Cloudflare 자동 호출 로그와 추적은 끄고 검색어가 없는 오류 코드만 기록한다. 자동 관측 정보에 요청 URL과 검색어가 남는 것을 줄이기 위해서다.
8. `main` 푸시는 배포를 일으킬 수 있으므로 원격 저장소 생성·연결·푸시는 저장소 공개 범위와 연락처 값 확인 후 진행한다.

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
- `npm run test:node`: 8/8 통과
- `npm run test:worker`: 3/3 통과
- `npm run cf-typegen:check`: 통과
- `npm run verify`: 통과(Node 로직·캐시 11/11, Worker 런타임 3/3 포함)
- `npm run deploy:dry-run`: 통과(정적 파일 6개 인식, 번들 8.81 KiB / gzip 3.15 KiB)
- `wrangler check startup`: 통과(로컬 시작 프로파일 17.8 ms; 실서버 성능 수치는 아님)
- 외부 GitHub 푸시와 Cloudflare 실배포는 아직 수행하지 않음

기존 MVP에서 확인한 `hello`, `안녕`, 404, 데스크톱·모바일 화면 결과는 전환 전 기준이다. Worker 전환 후 실 URL 브라우저 검수는 첫 배포 뒤 다시 수행해야 한다.

## 미해결 문제

- GitHub 저장소 이름과 공개/비공개 범위를 사용자가 정해야 한다.
- `WIKIMEDIA_USER_AGENT`에 넣을 공개 저장소 또는 연락처 URL이 필요하다.
- Cloudflare 계정에서 Worker 생성, 런타임 비밀값 등록, GitHub 연결이 필요하다.
- 첫 실배포 뒤 실제 영어·한국어 검색과 모바일 화면을 검수해야 한다.
- 코드 공개 라이선스와 상업 이용 여부는 아직 사용자 확정이 필요하다.
- Wiktionary 항목별 번역·예문 품질 편차와 문서 구조 변경 가능성은 남아 있다.

## 다음 단계

1. 사용자가 GitHub 저장소 이름, 공개 범위, 공개 연락처 URL을 확정한다.
2. 로컬 전환 결과를 커밋한 뒤 GitHub 원격 저장소에 `main`을 푸시한다.
3. Cloudflare Worker `malgyeol-dictionary`에 필수 비밀값을 등록한다.
4. GitHub 저장소를 Workers Builds에 연결하고 `main` 자동 배포를 활성화한다.
5. 첫 배포 URL에서 `hello`, `안녕`, 미존재 단어, 캐시 HIT, 모바일 화면을 검수한다.
6. 필요하면 workers.dev 주소 대신 사용자 도메인을 연결한다.

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
- GitHub 원격은 아직 연결하지 않았고 외부 전송도 하지 않았다.
- Cloudflare 전환 변경은 최종 전체 검증을 통과해 새 로컬 커밋으로 보존했다.

## 인수인계 체크포인트

Cloudflare용 코드 전환, 전체 검증, 로컬 커밋까지 완료됐다. 다음 단계부터는 외부 계정 상태를 바꾸는 작업이다. GitHub 저장소 공개 범위와 Wikimedia 공개 연락처 URL이 정해지기 전에는 원격 저장소 생성·푸시·실배포를 수행하지 않는다.

현재 컨텍스트로 계속하는 편이 효율적이므로 새 작업은 아직 필요하지 않다.
