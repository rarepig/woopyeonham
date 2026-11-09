import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";

// 연동 해제 + 전체 데이터 파기 (PRD 7장)
export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = db.select().from(schema.oauthTokens)
    .where(eq(schema.oauthTokens.userId, userId)).get();
  if (token) {
    // Google 토큰 revoke (실패해도 데이터 삭제는 진행)
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token.refreshToken}`, {
      method: "POST",
    }).catch(() => {});
  }
  db.delete(schema.users).where(eq(schema.users.id, userId)).run(); // cascade로 전체 파기
  return NextResponse.json({ ok: true });
}
