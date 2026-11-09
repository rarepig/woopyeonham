// PRD 5장: 단일 LLM 호출로 category / is_important / summary / confidence / reason 생성.
// 개인화 = 최근 수정 이력 20건 few-shot 주입. ANTHROPIC_API_KEY가 없으면 모의 분류기로 동작.
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "./db";

export type ClassifyResult = {
  categoryId: string | null;
  isImportant: boolean;
  summary: string;
  confidence: number;
  reason: string;
  source: "llm" | "mock";
};

type CategoryLite = { id: string; name: string; description: string };

const CONFIDENCE_THRESHOLD = 0.6; // 미만이면 미분류 (PRD 3장)

async function buildFewShot(userId: string): Promise<string> {
  const feedbacks = db
    .select({
      sender: schema.emails.sender,
      subject: schema.emails.subject,
      categoryName: schema.categories.name,
    })
    .from(schema.feedbacks)
    .innerJoin(schema.emails, eq(schema.feedbacks.emailId, schema.emails.id))
    .innerJoin(schema.categories, eq(schema.feedbacks.afterCategoryId, schema.categories.id))
    .where(and(eq(schema.feedbacks.userId, userId), isNotNull(schema.feedbacks.afterCategoryId)))
    .orderBy(desc(schema.feedbacks.createdAt))
    .limit(20)
    .all();
  if (!feedbacks.length) return "";
  const lines = feedbacks.map(
    (f) => `- 발신자 "${f.sender}", 제목 "${f.subject}" → 사용자가 "${f.categoryName}"로 지정`
  );
  return `\n\n[사용자의 과거 수정 이력 — 이 사용자의 기준을 최우선으로 반영할 것]\n${lines.join("\n")}`;
}

export async function classifyEmail(
  userId: string,
  categories: CategoryLite[],
  email: { sender: string; subject: string; body: string },
  importantCriteria: string | null
): Promise<ClassifyResult> {
  if (!process.env.ANTHROPIC_API_KEY) return mockClassify(categories, email);

  const fewShot = await buildFewShot(userId);
  const catList = categories.map((c) => `- ${c.name}: ${c.description}`).join("\n");
  const prompt = `당신은 메일 분류 어시스턴트입니다. 아래 메일을 분석하여 JSON만 출력하세요. 마크다운 백틱이나 다른 텍스트를 포함하지 마세요.

[카테고리 목록]
${catList}

[중요 메일 기준]
(a) 회신·마감·결제·계정 보안 등 사용자의 행동이 필요한 메일
(b) 사용자 정의 기준: ${importantCriteria || "(없음)"}${fewShot}

[분석할 메일]
발신자: ${email.sender}
제목: ${email.subject}
본문: ${email.body || "(본문 없음)"}

[출력 형식 — JSON only]
{"category": "카테고리 이름 또는 null", "is_important": true|false, "summary": "한 줄 요약", "confidence": 0.0~1.0, "reason": "판단 근거 한 문장"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`LLM API 오류 (${res.status})`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const clean = text.replace(/```json|```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return {
      categoryId: null, isImportant: false,
      summary: email.subject, confidence: 0,
      reason: "AI 응답 해석 실패로 미분류 처리", source: "llm",
    };
  }
  const matched = categories.find((c) => c.name === parsed.category);
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  return {
    categoryId: matched && confidence >= CONFIDENCE_THRESHOLD ? matched.id : null,
    isImportant: !!parsed.is_important,
    summary: String(parsed.summary || email.subject).slice(0, 200),
    confidence,
    reason: String(parsed.reason || "").slice(0, 300),
    source: "llm",
  };
}

/** API 키 없이 실행할 때를 위한 결정적 모의 분류기 */
function mockClassify(
  categories: CategoryLite[],
  email: { sender: string; subject: string; body: string }
): ClassifyResult {
  const hay = `${email.sender} ${email.subject} ${email.body}`.toLowerCase();
  let best: CategoryLite | null = null;
  let bestScore = 0;
  for (const c of categories) {
    const keywords = `${c.name} ${c.description}`.toLowerCase().split(/[\s,·—\-]+/).filter((w) => w.length > 1);
    const score = keywords.filter((w) => hay.includes(w)).length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  const important = /마감|결제|보안|인증|회신|urgent|invoice|payment|deadline/.test(hay);
  const confidence = best ? Math.min(0.95, 0.55 + bestScore * 0.15) : 0.3;
  return {
    categoryId: best && confidence >= CONFIDENCE_THRESHOLD ? best.id : null,
    isImportant: important,
    summary: email.body ? email.body.slice(0, 80) : email.subject,
    confidence,
    reason: best ? `키워드 일치(모의 분류기): ${best.name}` : "일치하는 카테고리 없음(모의 분류기)",
    source: "mock",
  };
}
