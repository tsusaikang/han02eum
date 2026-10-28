# 한영이음 사전

안내 갱신: 2026-10-29 (KST). 공개 반영 상태와 확인 시점은 [프로젝트 상태](./docs/PROJECT_STATE.md)를 따릅니다.

[한영이음](https://han02eum.com)은 영어·한국어를 한 검색창에서 찾는 웹 사전입니다. 한국어판 위키낱말사전의 영어 뜻과 한국어기초사전의 한영 자료를 출처별로 보여 줍니다. 두 자료의 뜻을 임의로 같은 뜻으로 합치지 않으며, 제공되는 뜻풀이·품사·발음·예문과 원문 링크를 확인할 수 있습니다.

운영 환경은 **Cloudflare Worker + Static Assets**입니다. 기존 GitHub `main` 반영이 Cloudflare Workers Builds의 자동 배포로 이어집니다. 현재 공개 상태, 남은 문제와 다음 작업은 [프로젝트 상태](./docs/PROJECT_STATE.md)에서 관리합니다.

## 구조

- `public/index.html`, `public/native-dictionary_20260907_205350.html`, `public/native-dictionary-app_20260907_205350.js`: 기본 검색 화면과 표시
- `public/native-english-ko.js`, `public/native-korean-en_20260907_205345.js`: 출처별 검색 자료 로더
- `public/native-english-ko_*/`, `public/native-krdict_*/`: 검색용으로 나눈 자료와 출처 정보
- `public/legacy_20260907_205800.html`: 지원이 종료된 이전 검색 주소에서 기본 검색으로 이동하는 호환 진입점.
- `public/app.js`, `public/dictionary-parser.js`: 이전 구현 보존 자료
- `src/worker.js`, `src/handler.js`, `src/dictionary-api.js`: 요청 라우팅, 정적 자산과 보존된 `/api/lookup` 구현. 기본 검색은 이 API를 사용하지 않습니다.
- `scripts/`, `test/`: 자료 생성·교정 도구와 관련 검사
- `wrangler.jsonc`: Worker·정적 자산 설정

## 로컬 실행과 검사

Node.js 20 이상에서 의존성을 설치합니다.

```sh
npm ci
```

Worker 개발 환경은 `.dev.vars.example`을 `.dev.vars`로 복사하고 `WIKIMEDIA_USER_AGENT`에 실제 공개 연락처를 넣어 실행합니다. 이 변수는 보존된 영어판 API와 기존 배포 설정에 연결되며, 기본 검색은 같은 도메인의 정적 사전 자료를 읽습니다. 운영 서비스를 위해 로컬 서버를 계속 켜둘 필요는 없습니다.

```sh
npm run dev
```

종합 검사 명령은 `npm run verify`입니다. 저장소에는 과거 파일럿과 로컬 보존 자료에 의존하는 검사도 있으므로, 변경 범위의 확인 방법과 알려진 실행 제약은 [프로젝트 상태](./docs/PROJECT_STATE.md)를 함께 확인합니다. 기본 검색을 실행하는 데 유료 AI 파일럿은 필요하지 않습니다.

## 공개 안내와 근거

별도 `/records/` 사이트는 없습니다. 기존 공개 안내와 근거는 다음과 같습니다. 수록량·조합 방법을 바꿀 때 함께 확인합니다.

<!-- record-map:start -->
- [출처와 수록 범위](https://han02eum.com/dictionary-sources_20260909_235001.html): 이용자용 공개 안내
- [데이터 출처 안내](./docs/DATA_SOURCES.md): 출처별 역할·이용 조건·집계 해석
- [집계 결과 JSON](./public/source-metadata_20260909_235001.json): 제품 자료에서 계산한 수량과 기준일
- [집계 프로그램](./scripts/build-source-metadata_20260909_235001.mjs): 위 수량의 재생성 방법
<!-- record-map:end -->

실행과 페이지 확인은 [수록량 집계와 갱신](./docs/DATA_SOURCES.md#수록량-집계와-갱신)을 따릅니다. 안내 문서의 갱신일과 자료의 기준일은 다릅니다. 9월 집계 자료를 10월에 새로 수집·측정한 자료로 해석하지 않습니다.

## 자료와 작업 안내

아래는 프로젝트 작업공간의 문서 지도입니다. 로컬 보관 문서는 GitHub에 포함되지 않을 수 있으며, 문서 링크가 있다는 사실은 그 원문을 웹에 공개한다는 뜻이 아닙니다.

- [출처별 사전 구조](./docs/NATIVE_DICTIONARY_20260907_212917.md): 현재 조회·표시 구조와 재생성 도구. 검색 동작이나 원천 자료를 바꿀 때 확인
- [Cloudflare 배포 안내](./docs/CLOUDFLARE_DEPLOYMENT.md): 기존 배포 경로·확인 순서·설정 근거. 초기 설정 이력은 별도로 연결
- [프로젝트 상태](./docs/PROJECT_STATE.md): 현재 결정·공개 상태·미해결 문제·다음 행동
- 요구사항 (로컬 보관 경로: `docs/REQUIREMENTS.md`): 요구사항과 안정 ID
- [작업 지침](./AGENTS.md): 위임·후속 수정·완료·승인 범위
- 정리 전 README (로컬 보관 경로: `docs/PROJECT_HISTORY_20260909_234322.md #정리-전-readme`): 과거 v3 AI 재평가의 명령·고정 입력·승인 경계와 당시 소개 원문. 현재 실행 순서로 자동 재개하지 않습니다.
