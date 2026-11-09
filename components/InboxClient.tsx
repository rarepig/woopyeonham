"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Postmark, ConfidenceBadge } from "./badges";

type Row = {
  id: string; subject: string; sender: string; receivedAt: string;
  categoryId: string | null; isImportant: boolean;
  summary: string; confidence: number; reason: string; source: string;
};
type Cat = { id: string; name: string };

export default function InboxClient({ categories, rows }: { categories: Cat[]; rows: Row[] }) {
  const [tab, setTab] = useState<string>("all"); // all | none | categoryId
  const [notice, setNotice] = useState("");
  const router = useRouter();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.categoryId ?? "none", (m.get(r.categoryId ?? "none") ?? 0) + 1);
    return m;
  }, [rows]);

  const visible = rows.filter((r) =>
    tab === "all" ? true : tab === "none" ? !r.categoryId : r.categoryId === tab
  );

  async function correct(emailId: string, categoryId: string | null) {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId, categoryId }),
    });
    const data = await res.json();
    if (data.promoted) {
      setNotice(`앞으로 "${data.sender}" 발신 메일은 이 카테고리로 바로 분류됩니다.`);
      setTimeout(() => setNotice(""), 5000);
    }
    router.refresh();
  }

  async function toggleImportant(emailId: string, next: boolean) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailId, isImportant: next }),
    });
    router.refresh();
  }

  return (
    <>
      <div className="tabs" role="tablist">
        <button role="tab" className={`tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
          전체 <span className="count">{rows.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} role="tab" className={`tab ${tab === c.id ? "active" : ""}`} onClick={() => setTab(c.id)}>
            {c.name} <span className="count">{counts.get(c.id) ?? 0}</span>
          </button>
        ))}
        <button role="tab" className={`tab ${tab === "none" ? "active" : ""}`} onClick={() => setTab("none")}>
          미분류 <span className="count">{counts.get("none") ?? 0}</span>
        </button>
      </div>

      {notice && <p className="sub" style={{ margin: "10px 0 0", color: "var(--focus)" }}>{notice}</p>}

      <div className="maillist" style={{ marginTop: notice ? 8 : 0 }}>
        {visible.length === 0 && <div className="empty">이 카테고리에는 메일이 없습니다.</div>}
        {visible.map((r) => (
          <div key={r.id} className="mailrow">
            {r.isImportant && <Postmark />}
            <div className="meta">
              <div className="subject">{r.subject}</div>
              {r.summary && <div className="summary">{r.summary}</div>}
              <div className="mono sub from" title={r.reason}>
                {r.sender} · {new Date(r.receivedAt).toLocaleDateString("ko-KR")}
                {r.reason && ` · ${r.reason}`}
              </div>
            </div>
            <div className="controls">
              <ConfidenceBadge confidence={r.confidence} categoryId={r.categoryId} />
              <select
                className="select"
                value={r.categoryId ?? ""}
                aria-label="카테고리 수정"
                onChange={(e) => correct(r.id, e.target.value || null)}
              >
                <option value="">미분류</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="btn ghost" style={{ padding: "3px 10px", fontSize: "0.78rem" }}
                onClick={() => toggleImportant(r.id, !r.isImportant)}>
                {r.isImportant ? "중요 해제" : "중요 표시"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
