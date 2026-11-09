import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";

// 사용자 수정: 새 Classification(source=user) 추가 + Feedback 기록 + 발신자 규칙 승격(2회 누적)
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { emailId, categoryId, isImportant } = await req.json();

  const email = db.select().from(schema.emails)
    .where(and(eq(schema.emails.id, emailId), eq(schema.emails.userId, userId))).get();
  if (!email) return NextResponse.json({ error: "not found" }, { status: 404 });

  const latest = db.select().from(schema.classifications)
    .where(eq(schema.classifications.emailId, emailId))
    .orderBy(desc(schema.classifications.createdAt)).limit(1).get();

  const newCategoryId = categoryId === undefined ? latest?.categoryId ?? null : categoryId;
  const newImportant = isImportant === undefined ? latest?.isImportant ?? false : !!isImportant;

  db.insert(schema.classifications).values({
    emailId, categoryId: newCategoryId, isImportant: newImportant,
    summary: latest?.summary ?? email.subject,
    confidence: 1, reason: "사용자가 직접 지정", source: "user",
  }).run();

  let promoted = false;
  if (categoryId !== undefined) {
    db.insert(schema.feedbacks).values({
      userId, emailId,
      beforeCategoryId: latest?.categoryId ?? null,
      afterCategoryId: categoryId,
    }).run();
    // 같은 발신자를 같은 카테고리로 2회 이상 수정 → 발신자 규칙 승격
    if (categoryId) {
      const count = db.select({ id: schema.feedbacks.id }).from(schema.feedbacks)
        .innerJoin(schema.emails, eq(schema.feedbacks.emailId, schema.emails.id))
        .where(and(
          eq(schema.feedbacks.userId, userId),
          eq(schema.feedbacks.afterCategoryId, categoryId),
          eq(schema.emails.sender, email.sender),
        )).all().length;
      if (count >= 2) {
        db.insert(schema.senderRules)
          .values({ userId, sender: email.sender, categoryId })
          .onConflictDoUpdate({
            target: [schema.senderRules.userId, schema.senderRules.sender],
            set: { categoryId },
          }).run();
        promoted = true;
      }
    }
  }
  return NextResponse.json({ ok: true, promoted, sender: email.sender });
}
