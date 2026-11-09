// 데모 모드: OAuth 없이 서비스 흐름 전체를 체험하기 위한 모의 메일함.
export type DemoMail = {
  id: string; sender: string; subject: string; body: string; daysAgo: number;
};

export const DEMO_MAILS: DemoMail[] = [
  { id: "d01", sender: "billing@cardcorp.co.kr", subject: "6월 카드 이용대금 명세서", body: "고객님의 6월 이용대금은 842,300원이며 결제일은 7월 14일입니다. 결제 계좌 잔액을 확인해 주세요.", daysAgo: 2 },
  { id: "d02", sender: "no-reply@github.com", subject: "[GitHub] Security alert: new sign-in", body: "새로운 기기에서 로그인이 감지되었습니다. 본인이 아니라면 즉시 비밀번호를 변경하세요.", daysAgo: 1 },
  { id: "d03", sender: "hr@mycompany.com", subject: "연차 사용 계획 제출 요청 (7/15 마감)", body: "하반기 연차 사용 계획을 7월 15일까지 인사시스템에 제출해 주시기 바랍니다.", daysAgo: 3 },
  { id: "d04", sender: "newsletter@aiweekly.io", subject: "이번 주 AI 뉴스: 새 오픈소스 모델 공개", body: "이번 주 주요 소식과 논문 요약을 전해드립니다. 새로운 멀티모달 모델이 공개되었고...", daysAgo: 1 },
  { id: "d05", sender: "promo@shopmall.co.kr", subject: "🔥 여름 세일 최대 70% 할인", body: "여름 시즌 오프 특가! 지금 바로 확인하세요. 쿠폰 코드: SUMMER70", daysAgo: 0 },
  { id: "d06", sender: "prof.kim@univ.ac.kr", subject: "논문 초안 피드백", body: "보내준 초안 잘 읽었습니다. 3장 실험 설계 부분에 대해 이번 주 중 회신 부탁합니다.", daysAgo: 4 },
  { id: "d07", sender: "support@cloudhost.com", subject: "Invoice #8841 — Payment due", body: "Your monthly invoice of $23.00 is due on July 12. Please update your payment method.", daysAgo: 2 },
  { id: "d08", sender: "team@notion.so", subject: "Your weekly workspace digest", body: "지난주 워크스페이스에서 12개의 페이지가 업데이트되었습니다.", daysAgo: 5 },
  { id: "d09", sender: "landlord.park@gmail.com", subject: "월세 입금 확인 및 계약 갱신 안내", body: "이번 달 월세 입금 확인했습니다. 계약 만료가 9월이라 갱신 여부를 8월 초까지 알려주세요.", daysAgo: 6 },
  { id: "d10", sender: "promo@airline.co.kr", subject: "✈️ 특가 항공권 오픈", body: "제주 편도 29,000원부터. 좌석 한정 특가를 놓치지 마세요.", daysAgo: 3 },
  { id: "d11", sender: "noreply@bank.co.kr", subject: "자동이체 출금 예정 안내", body: "7월 10일에 통신요금 65,890원이 자동이체 출금될 예정입니다.", daysAgo: 1 },
  { id: "d12", sender: "recruiter@techcorp.com", subject: "포지션 제안: AI 프로덕트 엔지니어", body: "회원님의 프로필을 보고 연락드립니다. 관심 있으시면 이번 주 내로 회신 부탁드립니다.", daysAgo: 2 },
  { id: "d13", sender: "news@stockdaily.kr", subject: "오늘의 증시 마감 브리핑", body: "코스피는 전일 대비 0.8% 상승 마감했습니다. 주요 종목 동향은...", daysAgo: 0 },
  { id: "d14", sender: "no-reply@apple.com", subject: "영수증: App Store 구독 갱신", body: "iCloud+ 구독이 갱신되었습니다. 결제 금액: 3,300원", daysAgo: 7 },
  { id: "d15", sender: "friend.lee@gmail.com", subject: "이번 주말 등산 갈래?", body: "토요일 아침에 북한산 어때? 갈 수 있는지 목요일까지 알려줘.", daysAgo: 1 },
  { id: "d16", sender: "alert@monitoring.io", subject: "[RESOLVED] API latency spike", body: "지난밤 발생한 API 지연이 해소되었습니다. 원인: 배포 중 캐시 미스 증가.", daysAgo: 4 },
  { id: "d17", sender: "promo@fooddelivery.kr", subject: "오늘만! 배달비 무료 쿠폰", body: "저녁 주문 시 배달비 무료 쿠폰이 발급되었습니다.", daysAgo: 0 },
  { id: "d18", sender: "tax@hometax.go.kr", subject: "부가가치세 신고 안내", body: "7월 25일까지 1기 확정 부가가치세를 신고·납부하시기 바랍니다.", daysAgo: 5 },
  { id: "d19", sender: "updates@linkedin.com", subject: "회원님 게시물이 500회 노출되었습니다", body: "지난주 회원님의 활동 요약을 확인해 보세요.", daysAgo: 6 },
  { id: "d20", sender: "ceo@mycompany.com", subject: "전사 타운홀 일정 변경 (필독)", body: "이번 분기 타운홀이 7월 11일 오후 2시로 변경되었습니다. 전원 참석 바랍니다.", daysAgo: 1 },
  { id: "d21", sender: "no-reply@insurance.co.kr", subject: "보험료 납입 안내", body: "7월분 보험료 128,000원이 7월 20일 출금 예정입니다.", daysAgo: 3 },
  { id: "d22", sender: "digest@devblog.io", subject: "주간 개발 블로그 모음", body: "이번 주 인기 글: Next.js 캐싱 전략, Postgres 인덱스 튜닝...", daysAgo: 2 },
  { id: "d23", sender: "mom@family.kr", subject: "주말에 집에 오니?", body: "이번 주말에 시간 되면 집에 와서 저녁 같이 먹자. 미리 알려줘.", daysAgo: 2 },
  { id: "d24", sender: "security@bank.co.kr", subject: "해외 로그인 시도 차단 안내", body: "고객님 계정에 해외 IP 로그인 시도가 차단되었습니다. 본인 활동이 아니라면 비밀번호를 변경해 주세요.", daysAgo: 0 },
];
