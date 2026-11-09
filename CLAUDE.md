# CLAUDE.md — 프로젝트 인수인계 문서

> 이 문서는 Claude Code가 이 프로젝트를 이어받아 작업하기 위한 컨텍스트다.
> 사람이 읽어도 되지만, 1차 독자는 Claude Code다.

## 1. 이 프로젝트가 무엇인가

**우편함** — AI 개인화 메일 어시스턴트 (Next.js 웹앱, 한국어 UI).

Gmail을 **읽기 전용**(`gmail.readonly` 단일 scope)으로 분석해서:
- 사용자가 정의한 카테고리(이름 + 한 줄 설명)로 메일을 LLM 분류
- 중요 메일을 요약해 대시보드 상단에 우선 표시
- 사용자의 수정 피드백으로 분류를 개인화

**절대 원칙 (변경 금지):**
1. **원본 Gmail을 절대 변경하지 않는다.** 라벨/폴더/읽음 상태 조작 없음. 분류는 이 앱의 UI에만 존재한다.
2. **메일 본문을 DB에 저장하지 않는다.** 저장은 메타데이터(발신자/제목/수신시각/snippet) + AI 산출물만. 본문은 분류 시점에 Gmail API로 조회 → LLM 전달 → 폐기.
3. **분류 이력은 보존한다.** `classifications`는 UPDATE 하지 않고 새 행을 INSERT한다 (최신 행 = 현재 분류).

전체 요구사항은 PRD 참고 (대화에서 함께 작성됨): 카테고리 설명 필수, confidence < 0.6 → 미분류, 초기 분석 최근 30일/최대 200건, 동일 발신자 2회 수정 → 발신자 규칙 승격, 카테고리 삭제 → 미분류 이동.

## 2. 기술 스택과 왜 그렇게 됐는가

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 14.2.5 (App Router) | 1주 MVP, 프론트+API 통합 |
| DB | **Drizzle ORM + better-sqlite3** | 원래 Prisma였으나 개발 샌드박스에서 엔진 바이너리(binaries.prisma.sh) 다운로드가 차단되어 전환. 순수 npm 의존성만 사용. Postgres 전환은 로드맵 |
| 인증 | NextAuth v4 (JWT 세션) | Google provider(gmail.readonly, offline, consent) + `demo` Credentials provider |
| AI | Anthropic Messages API 직접 fetch | 기본 모델 env `LLM_MODEL` (기본값 `claude-haiku-4-5-20251001`) |

**3단 폴백 구조 (중요):**
- `GOOGLE_CLIENT_ID` 없음 → 데모 로그인만 노출, 모의 메일 24건(`lib/demo.ts`) 사용
- `ANTHROPIC_API_KEY` 없음 → `lib/classify.ts`의 `mockClassify()` (키워드 매칭) 폴백
- 둘 다 있으면 실제 Gmail + 실제 LLM

**DB 초기화:** 마이그레이션 명령이 없다. `lib/db.ts`가 첫 실행 시 `CREATE TABLE IF NOT EXISTS`로 부트스트랩한다. **스키마를 바꾸면 `lib/schema.ts`(Drizzle 정의)와 `lib/db.ts`(DDL) 두 곳을 함께 수정해야 한다.** DB 파일: `data.db` (env `DATABASE_FILE`).

## 3. 코드 지도

```
lib/
  schema.ts      Drizzle 테이블 8개: users, oauthTokens, categories, emails,
                 classifications, feedbacks, senderRules, syncStates
  db.ts          better-sqlite3 + 부트스트랩 DDL (WAL, foreign_keys ON)
  queries.ts     getEmailsWithLatest(메일+최신 분류, JS 그룹핑), getUser, getCategories
  auth.ts        NextAuth 옵션, requireUserId() — 모든 보호 라우트가 사용
  gmail.ts       토큰 갱신(refresh_token), listMessageIds(30일/200건), fetchEmail(본문 추출, 429 백오프)
  preprocess.ts  HTML 제거 → 인용/서명 제거 → 1500자 절단
  classify.ts    LLM 호출(JSON 강제) + few-shot(최근 피드백 20건 join) + mockClassify 폴백
  sync.ts        syncChunk(): 8건씩 처리. 발신자 규칙 우선 → 없으면 LLM. 진행률 반환
  demo.ts        한국어 모의 메일 24건

app/api/
  auth/[...nextauth]/  NextAuth 핸들러
  sync/          POST — syncChunk 1회. 클라이언트가 done까지 반복 호출하는 청크 프로토콜
  onboard/       POST — 카테고리 일괄 생성 + 중요 기준 + onboarded=true
  feedback/      POST — {emailId, categoryId?|isImportant?} → user 분류 행 추가,
                 feedback 기록, 같은 발신자 2회 → sender_rules upsert, {promoted} 반환
  categories/    POST 생성 / DELETE 삭제(FK SET NULL → 자동 미분류)
  reclassify/    POST — 미분류만 8건씩 재분류 (snippet 기반 — 본문 비저장 트레이드오프)
  account/       DELETE — Google revoke + user cascade 삭제

app/ 페이지: / (랜딩·로그인 분기) → /onboarding → /dashboard → /inbox → /settings
components/: Topbar, badges(Postmark·ConfidenceBadge), SignInButtons,
             SyncRunner(done까지 반복 호출 + router.refresh), InboxClient(탭·수정·중요토글),
             SettingsClient(카테고리 관리·재분류·계정 삭제)
```

**디자인 시스템** (`app/globals.css`): "우편물 분류대" 콘셉트. 토큰 — `--bg #edf0ec`, `--ink #1d2420`, `--stamp #ce3b2c`(중요 전용). 서체 IBM Plex Sans KR + IBM Plex Mono. 시그니처는 중요 메일의 회전된 점선 원형 소인(`.postmark`) 배지. **빨강은 중요 표시 외에 쓰지 말 것.** 신뢰도는 원값 노출 금지, 확실(≥0.85)/보통/미분류 3단계 배지.

## 4. 현재 상태 (검증 완료)

`npm run build` 통과. 프로덕션 서버에서 런타임 검증 완료:
- 데모 로그인 → 온보딩 → 24건 동기화 (8건 × 3청크, 진행률 정상)
- 같은 발신자 2회 수정 시 `promoted: true` 확인
- 재분류 청크 동작, dashboard/inbox/settings 모두 200

로컬 실행: `npm install` → `.env.example`을 `.env`로 복사, `NEXTAUTH_SECRET`만 채움 → `npm run dev`

## 5. 다음 할 일 (우선순위순)

### P0 — 실환경 검증 (샌드박스에서 불가능했던 것)
1. **실제 Google OAuth 플로우 테스트.** 코드는 작성됐지만 실제 Google 계정으로 검증된 적 없다. Google Cloud Console 설정(README 참고) 후 로그인 → refresh_token 저장 → 토큰 갱신 → 메일 조회까지 확인. `lib/gmail.ts`의 본문 추출(`extractBody`)이 실제 멀티파트 메일에서 깨지는 케이스 확인.
2. **실제 LLM 분류 품질 확인.** `ANTHROPIC_API_KEY` 넣고 데모 메일 24건 분류 → 미분류 비율과 중요 판정이 합리적인지 확인. 프롬프트는 `lib/classify.ts`.

### P1 — 알려진 결함/부채
3. **재분류가 snippet(100자)만 사용** (`app/api/reclassify/route.ts`). 실 Gmail 사용자는 재분류 시 본문을 Gmail API로 재조회하도록 개선 (본문 비저장 원칙은 유지 — 조회 후 폐기).
4. **데모 계정이 단일 공유 계정** (`demo@example.com`). 동시 사용 시 데이터 섞임. 세션별 데모 유저 생성 고려.
5. **동시 sync 방어 없음.** 같은 유저가 sync를 이중 호출하면 unique 제약(`emails_user_msg_uq`)으로 에러. sync_states에 running 플래그 추가 또는 insert를 `onConflictDoNothing`으로.
6. **refresh_token 평문 저장.** 프로덕션 전 필드 암호화 필요.

### P2 — PRD 로드맵
7. Embedding 캐스케이드 (LLM 호출 전 유사 메일 비교 — `classifications.source`가 확장 지점)
8. 비용 절감 대시보드 (source별 처리 비율: sender_rule vs llm)
9. 신뢰도 캘리브레이션 (피드백 대비 실측 정확도로 0.6 임계값 보정)
10. Postgres 전환 + Outlook 지원

## 6. 작업 시 규칙

- 응답/커밋 메시지/UI 문구는 한국어 유지
- 절대 원칙 3개(1장) 위반하는 변경 금지 — 특히 "본문 저장" 유혹(재분류 개선 시)
- 스키마 변경 시 `lib/schema.ts` + `lib/db.ts` DDL 동기화, 기존 `data.db` 삭제 후 재생성 안내
- 청크 프로토콜(클라이언트 반복 호출) 유지 — 서버리스 타임아웃 회피 설계
- 빌드 확인: `npm run build` (별도 lint/test 스크립트 없음 — 테스트 추가는 환영)
