import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getEmailsWithLatest } from "@/lib/queries";
import Topbar from "@/components/Topbar";
import SyncRunner from "@/components/SyncRunner";
import { Postmark } from "@/components/badges";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const userId = await requireUserId();
  if (!userId) redirect("/");

  const emails = await getEmailsWithLatest(userId);
  const important = emails.filter((e) => e.latest?.isImportant);
  const unclassified = emails.filter((e) => e.latest && !e.latest.categoryId);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const analyzedToday = emails.filter(
    (e) => e.latest?.createdAt && e.latest.createdAt >= today
  ).length;

  return (
    <main className="shell">
      <Topbar />
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>대시보드</h1>
          <p className="sub mono">
            오늘 분석 {analyzedToday} · 중요 {important.length} · 미분류 {unclassified.length} · 전체 {emails.length}
          </p>
        </div>
        <SyncRunner label="새 메일 가져오기" auto={emails.length === 0} />
      </div>

      <h2>중요 메일</h2>
      {important.length === 0 ? (
        <div className="panel empty">
          지금 확인이 필요한 메일이 없습니다.
          {emails.length === 0 && " 위의 '새 메일 가져오기'로 분석을 시작하세요."}
        </div>
      ) : (
        <div className="stack">
          {important.slice(0, 8).map((e) => (
            <div key={e.id} className="panel row" style={{ gap: 16 }}>
              <Postmark />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{e.subject}</div>
                <div className="sub" style={{ marginTop: 2 }}>{e.latest!.summary}</div>
                <div className="mono sub" style={{ marginTop: 4 }}>
                  {e.sender} · {e.latest!.reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {unclassified.length > 0 && (
        <>
          <h2>미분류</h2>
          <div className="panel row" style={{ justifyContent: "space-between" }}>
            <span className="sub">
              AI가 확신하지 못한 메일 {unclassified.length}건이 있습니다. 직접 지정하면 다음부터 반영됩니다.
            </span>
            <Link href="/inbox" className="btn ghost" style={{ flex: "none" }}>
              정리하러 가기
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
