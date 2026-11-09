import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { classifyEmail } from "@/lib/classify";
import { getEmailsWithLatest, getUser, getCategories } from "@/lib/queries";

// 미분류 메일 일괄 재분류 (청크 처리 — 클라이언트가 done까지 반복 호출)
const CHUNK = 8;

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = getUser(userId);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const categories = getCategories(userId).map((c) => ({
    id: c.id, name: c.name, description: c.description,
  }));

  const all = await getEmailsWithLatest(userId);
  const unclassified = all.filter((e) => !e.latest?.categoryId);
  const batch = unclassified.slice(0, CHUNK);

  for (const email of batch) {
    // 본문은 저장하지 않으므로 snippet 기반으로 재분류 (MVP 트레이드오프, README 참고)
    const result = await classifyEmail(
      userId, categories,
      { sender: email.sender, subject: email.subject, body: email.snippet },
      user.importantCriteria
    );
    db.insert(schema.classifications).values({
      emailId: email.id, categoryId: result.categoryId, isImportant: result.isImportant,
      summary: result.summary, confidence: result.confidence,
      reason: result.reason, source: result.source,
    }).run();
  }
  return NextResponse.json({
    processed: batch.length,
    remaining: Math.max(0, unclassified.length - batch.length),
    done: unclassified.length <= CHUNK,
  });
}
