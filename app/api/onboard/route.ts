import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";

// 온보딩: 카테고리 일괄 생성 + 중요 기준 저장
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { categories, importantCriteria } = await req.json();
  if (!Array.isArray(categories) || categories.length < 1)
    return NextResponse.json({ error: "카테고리를 1개 이상 만들어 주세요." }, { status: 400 });
  for (const c of categories) {
    if (!c.name?.trim() || !c.description?.trim())
      return NextResponse.json({ error: "모든 카테고리에 이름과 한 줄 설명이 필요합니다." }, { status: 400 });
  }
  db.insert(schema.categories).values(
    categories.map((c: any) => ({
      userId, name: String(c.name).trim(), description: String(c.description).trim(),
    }))
  ).run();
  db.update(schema.users)
    .set({ importantCriteria: importantCriteria?.trim() || null, onboarded: true })
    .where(eq(schema.users.id, userId)).run();
  return NextResponse.json({ ok: true });
}
