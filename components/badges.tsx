/** 소인 스탬프 — 중요 메일 시그니처 */
export function Postmark() {
  return <span className="postmark" aria-label="중요 메일">중요</span>;
}

/** 신뢰도: 원값 숨김, 3단계 표기 */
export function ConfidenceBadge({ confidence, categoryId }: { confidence: number; categoryId: string | null }) {
  if (!categoryId) return <span className="badge none">미분류</span>;
  if (confidence >= 0.85) return <span className="badge high">확실</span>;
  return <span className="badge mid">보통</span>;
}
