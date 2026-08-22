# GitHub → Cloudflare Workers 배포 안내

마지막 검토: 2026-08-22 (KST)

이 프로젝트는 Cloudflare Workers Builds가 GitHub `main` 브랜치의 새 커밋을 감지해 정적 화면과 Worker API를 함께 배포하도록 준비되어 있습니다. 운영 환경에서는 로컬 서버를 계속 실행할 필요가 없습니다.

## 1. 외부 작업 전 확정할 값

- GitHub 저장소 이름
- 저장소 공개 범위: 공개 또는 비공개
- Wikimedia에 전달할 공개 연락처 URL

비공개 저장소를 쓰는 경우 저장소 주소는 공개 연락처가 될 수 없습니다. 별도의 공개 웹페이지나 공개 가능한 이메일 연락처를 사용합니다.

## 2. GitHub에 올리기

1. GitHub에 빈 저장소를 만든다.
2. 자동 생성 README, `.gitignore`, 라이선스 파일은 추가하지 않는다. 로컬 저장소에 이미 같은 역할의 파일이 있다.
3. 이 로컬 저장소에 GitHub 원격을 연결한다.
4. `main` 브랜치를 처음 푸시한다.

Cloudflare 연결 이후의 `main` 푸시는 운영 배포를 시작할 수 있습니다.

## 3. Cloudflare Worker와 필수값 준비

Cloudflare 대시보드에서 Worker 이름을 정확히 `malgyeol-dictionary`로 만든다. 이 이름은 `wrangler.jsonc`의 `name`과 같아야 합니다.

Worker의 **Settings > Variables & Secrets**에 다음 값을 런타임 비밀값으로 추가합니다.

- 이름: `WIKIMEDIA_USER_AGENT`
- 값: `MalgyeolDictionary/0.2 (공개 연락처 URL)`

예: `MalgyeolDictionary/0.2 (https://github.com/OWNER/REPOSITORY)`

이 값은 Workers Builds의 빌드 변수에 넣지 않습니다. 빌드 변수는 실행 중인 Worker에서 사용할 수 없습니다. 저장소의 `.dev.vars.example`은 형식 안내일 뿐 실제 운영값이 아닙니다.

필수값을 먼저 등록하기 어렵다면 Git 저장소를 연결한 뒤 최초 빌드가 누락 오류로 멈추는 것이 정상입니다. Worker 설정에서 값을 등록한 다음 빌드를 다시 시도합니다.

## 4. GitHub 저장소 연결

Worker의 **Settings > Builds**에서 GitHub 계정과 저장소를 연결하고 다음 값을 사용합니다.

| 항목 | 값 |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` 또는 비워 둠 |
| Build command | `npm run verify` |
| Deploy command | `npm run deploy` |
| Non-production deploy | 기본값 `npx wrangler versions upload` |

`package-lock.json`이 있으므로 Cloudflare가 의존성을 재현 가능하게 설치합니다. 실제 Wrangler 버전은 `package.json`에 고정된 범위를 사용합니다.

미리보기 브랜치 자동 배포는 처음에는 꺼 두는 편이 단순합니다. 필요해지면 별도 브랜치 빌드를 활성화합니다.

## 5. 첫 배포 후 확인

1. 빌드 단계에서 `npm run verify`가 통과했는지 확인한다.
2. 배포 주소의 첫 화면이 열리는지 확인한다.
3. `hello` 검색에서 발음·영한·영영 뜻·예문·출처가 보이는지 확인한다.
4. `안녕` 검색에서 발음 또는 로마자·영어 뜻·출처가 보이는지 확인한다.
5. 존재하지 않는 단어가 명확한 안내를 표시하는지 확인한다.
6. 같은 단어를 다시 검색했을 때 `/api/lookup` 응답의 `X-Dictionary-Cache`가 `HIT`인지 확인한다.
7. 모바일 폭에서 검색창과 결과 카드가 잘리지 않는지 확인한다.
8. Cloudflare Logs에는 검색어 원문이나 비밀값 없이 구조화된 오류 코드만 남는지 확인한다.

`wrangler.jsonc`는 요청 URL을 자동 저장하는 호출 로그와 추적을 꺼 둡니다. 이를 다시 켜기 전에는 검색어 마스킹과 보존 기간을 먼저 결정합니다.

## 6. 운영 롤백

문제가 있으면 Cloudflare의 배포 이력에서 직전 정상 버전을 다시 활성화합니다. 원인을 고친 뒤 검증을 통과한 새 커밋을 `main`에 푸시합니다. Git 이력을 강제로 되돌리거나 비밀값을 저장소에 커밋하지 않습니다.

## 참고 문서

- [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Workers Builds 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Workers Static Assets 바인딩](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Wrangler 필수 비밀값 설정](https://developers.cloudflare.com/workers/wrangler/configuration/#secrets)
