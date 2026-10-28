# GitHub → Cloudflare Workers 배포 안내

기존 운영 경로와 일반 수정의 반영 절차를 설명하는 정본이다. 안내 갱신: 2026-10-29 (KST). 2026-09-10의 배포·실제 화면 확인 이력은 완료 기록 (로컬 보관 경로: `docs/PROJECT_HISTORY_20260909_234322.md #completed-20260910`), 최신 공개 상태와 확인 시점은 [프로젝트 상태](PROJECT_STATE.md)를 따른다. 문서 갱신 자체가 새 배포나 Cloudflare 계정 설정 재확인을 뜻하지 않는다.

## 현재 운영 경로

기존 `git@github.com:tsusaikang/han02eum.git`의 `main` → Cloudflare Workers Builds → Worker `han02eum` → [han02eum.com](https://han02eum.com) 경로를 사용한다. 운영을 위해 로컬 서버를 계속 켜둘 필요는 없다. 일반 수정마다 저장소·Worker·도메인·연결을 새로 만들지 않는다.

원본 작업공간의 미커밋 자료와 별도 작업은 보존하고, 공개할 변경만 현재 원격 main을 기준으로 통합한다. 사용할 checkout과 브랜치 상태는 실제로 확인한다. 9월에 쓴 임시 공개용 clone은 당시 실행 기록이며 현재 존재하는 작업 위치로 간주하지 않는다.

## 일반 수정 반영

1. 변경에 맞는 검사를 실행하고 배포 대상에서 `npm run verify`를 확인한다. 로컬 전용 과거 파일럿 자료에 의존하는 검사 제약은 [프로젝트 상태](PROJECT_STATE.md)와 관련 시험 범위에서 구분한다.
2. 승인된 제품 변경만 기존 GitHub `main`에 반영하고 Workers Builds의 해당 커밋 빌드·배포 결과를 확인한다. push 성공과 배포 완료를 구분한다.
3. 실제 서비스에서 요청한 동작을 확인한다. 기본 영어 검색의 두 출처 결과, 한국어 검색·상세 더보기, 빈 결과와 일부 출처 실패 안내 중 변경에 해당하는 동작을 확인한다. 화면 변경은 모바일 표시도 확인한다.
4. 출처·통계 변경은 [수록량 집계와 갱신](DATA_SOURCES.md#수록량-집계와-갱신)에 따라 근거와 공개 안내를 함께 확인한다. 이전 주소 변경은 `?q=` 유지와 기본 검색으로의 이동을 확인한다.
5. 실제 반영 커밋·확인 결과·남은 문제는 [프로젝트 상태](PROJECT_STATE.md)에 기록한다.

기본 검색은 보존된 영어판 API를 사용하지 않으므로 `/api/lookup`의 캐시 HIT를 현재 기본 검색의 완료 기준으로 삼지 않는다. 새로운 계정·권한·DNS·도메인·비용·비공개 자료 전송 등은 [작업 지침](../AGENTS.md)의 별도 승인 경계를 따른다.

## 설정 근거와 보존된 API

- [wrangler.jsonc](../wrangler.jsonc): Worker 이름 `han02eum`, 진입 `src/worker.js`, 정적 자산 `public`, `/api/*`의 Worker 우선 처리를 확인할 수 있다.
- [package.json](../package.json): `verify`, `deploy` 등 실제 명령의 정본이다. `package-lock.json`으로 설치 버전을 재현한다. 과거 Git 연결 설정은 build `npm run verify`, deploy `npm run deploy`였으며 현재 계정의 실제 설정 확인과 구분한다.
- `npm run deploy`의 `predeploy`는 `scripts/build-deployment-meta_20261029_002011.mjs`로 `public/meta.json`을 생성한다. 실제 커밋(`commit`)과 빌드 시각(`builtAt`)만 담으며 Git에서는 제외한다. 배포 확인 시 `/meta.json`의 `commit`을 push한 SHA와 대조한다. 이 빌드 시각은 안내판 갱신일·자료 집계일과 별개다.
- 기존 `/api/lookup` 구현과 `WIKIMEDIA_USER_AGENT` 필수 런타임 설정은 남아 있다. 기본 정적 검색의 외부 사전 수집 기능으로 해석하지 않는다. [.dev.vars.example](../.dev.vars.example)은 로컬 설정 형식이며 운영 비밀값을 저장소에 기록하지 않는다.
- 현재 설정 파일은 요청 URL 자동 저장용 invocation logs와 traces를 끈다. 다시 켜는 경우에는 검색어 마스킹·보존 기간을 확인한다. 이 설정만으로 모든 로그에 민감한 값이 없다고 단정하지 않는다.

## 운영 복구와 과거 설정

배포 문제가 생기면 기존 Cloudflare 배포 이력의 직전 정상 버전과 적용 범위를 확인해 복구하고, 수정·검증된 커밋을 기존 경로로 반영한다. Git 이력을 강제로 되돌리거나 비밀값을 커밋하지 않는다.

초기 설정·이전 검색 점검 원문 (로컬 보관 경로: `docs/PROJECT_HISTORY_20260909_234322.md #deployment-setup-before-20261029`)은 2026-08-22에 작성한 신규 저장소·Worker 연결 절차와 당시 API 중심 점검을 보존한다. 기존 운영의 일반 수정 절차로 재실행하지 않는다.

## 참고 문서

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Workers Builds 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Static Assets 바인딩](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Wrangler 필수 비밀값 설정](https://developers.cloudflare.com/workers/wrangler/configuration/#secrets)
