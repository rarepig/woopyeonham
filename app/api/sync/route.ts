import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { syncChunk } from "@/lib/sync";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const progress = await syncChunk(userId);
    return NextResponse.json(progress);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "동기화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
