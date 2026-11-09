import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { name, description } = await req.json();
  if (!name?.trim() || !description?.trim())
    return NextResponse.json({ error: "이름과 한 줄 설명이 필요합니다." }, { status: 400 });
  const cat = db.insert(schema.categories)
    .values({ userId, name: name.trim(), description: description.trim() })
    .returning().get();
  return NextResponse.json(cat);
}

// 삭제: FK가 SET NULL이므로 영향받는 메일은 자동으로 미분류가 된다 (PRD 시나리오 7)
export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json();
  db.delete(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId))).run();
  return NextResponse.json({ ok: true });
}
