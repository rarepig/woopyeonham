# 우편함 — AI 개인화 메일 어시스턴트

Gmail을 **읽기 전용**으로 분석해 사용자 정의 카테고리로 정리하고, 중요한 메일을 요약해 먼저 보여주는 웹앱. 분류는 이 서비스 UI에서만 표시되며 **원본 Gmail은 절대 변경하지 않습니다** (`gmail.readonly` 단일 scope).

## 빠른 시작 (키 없이 데모 모드)

```bash
npm install
cp .env.example .env        # NEXTAUTH_SECRET만 임의 문자열로 채우면 됨
npm run dev
```

DB는 첫 실행 시 SQLite 파일(`data.db`)로 자동 생성됩니다. 별도 마이그레이션 명령이 없습니다.

http://localhost:3000 → **"데모 메일함으로 체험"** 클릭 → 온보딩 → 모의 메일 24건이 분석됩니다.
API 키가 없으면 키워드 기반 모의 분류기가, `ANTHROPIC_API_KEY`를 넣으면 실제 LLM이 동작합니다.

## 실제 Gmail 연동

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성 → **Gmail API 활성화**
2. OAuth 동의 화면: 외부 + **테스트 모드**, 테스트 사용자에 본인 이메일 추가
   (`gmail.readonly`는 restricted scope라 프로덕션 공개에는 CASA 심사가 필요하지만, 테스트 모드 100명까지는 심사 없이 사용 가능)
3. OAuth 클라이언트 ID(웹) 생성, 리디렉션 URI: `http://localhost:3000/api/auth/callback/google`
4. `.env`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY` 입력 후 재시작

## 동작 방식

```
로그인(OAuth readonly) → 온보딩(카테고리+한 줄 설명, 중요 기준)
→ 초기 분석: 최근 30일 / 최대 200건, 8건 청크로 반복 처리(진행률 표시)
→ 메일별: 발신자 규칙 있으면 즉시 분류(LLM 생략)
          없으면 전처리(HTML 제거·인용 제거·1500자) → LLM 1회 호출
          → { category, is_important, summary, confidence, reason }
→ confidence < 0.6 → 미분류
→ 사용자 수정 → Feedback 저장 → 최근 20건이 다음 프롬프트에 few-shot 주입
→ 같은 발신자 2회 수정 → 발신자 규칙 승격 (이후 LLM 비용 0)
```

## 설계 원칙 (PRD 반영)

- **본문 비저장**: DB에는 메타데이터 + AI 산출물만. 본문은 분류 시점에 조회 후 폐기
- **분류 이력 보존**: `Classification`은 수정 시 새 행 추가 (source: llm / sender_rule / user / mock)
- **카테고리 삭제 = 미분류로**: FK `SetNull`로 자동 처리, 설정에서 일괄 재분류 가능
- **계정 삭제**: Google 토큰 revoke + cascade hard delete

## MVP 트레이드오프 (알려진 한계)

- 재분류는 저장된 snippet 기반 (본문 비저장 원칙과의 트레이드오프 — 필요 시 Gmail 재조회로 개선)
- 데모 계정은 단일 공유 계정 (`demo@example.com`)
- refresh token 암호화는 DB 수준에 위임 (프로덕션에서는 KMS 필드 암호화 권장)
- SQLite 기본 (Drizzle ORM — Postgres 전환 시 `drizzle-orm/node-postgres` 드라이버와 `lib/schema.ts`의 pg 스키마로 교체)

## 로드맵

Embedding 캐스케이드 → 비용 절감 대시보드 → 신뢰도 캘리브레이션 → Outlook
