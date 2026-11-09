"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Draft = { name: string; description: string };

const SUGGESTED: Draft[] = [
  { name: "업무", description: "회사, 프로젝트, 동료와 주고받는 메일" },
  { name: "금융", description: "카드, 은행, 결제, 보험, 세금 관련 메일" },
  { name: "구독·뉴스레터", description: "뉴스레터, 다이제스트, 정기 소식" },
  { name: "프로모션", description: "할인, 광고, 마케팅 메일" },
  { name: "개인", description: "가족, 친구 등 개인적인 메일" },
];

export default function Onboarding() {
  const [categories, setCategories] = useState<Draft[]>(SUGGESTED.slice(0, 4));
  const [criteria, setCriteria] = useState("");
  const [phase, setPhase] = useState<"form" | "syncing">("form");
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [error, setError] = useState("");
  const router = useRouter();

  const update = (i: number, key: keyof Draft, value: string) =>
    setCategories((prev) => prev.map((c, j) => (j === i ? { ...c, [key]: value } : c)));

  async function start() {
    setError("");
    if (categories.some((c) => !c.name.trim() || !c.description.trim())) {
      setError("모든 카테고리에 이름과 한 줄 설명을 입력해 주세요. 설명은 AI 분류 정확도를 좌우합니다.");
      return;
    }
    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories, importantCriteria: criteria }),
    });
    if (!res.ok) {
      setError((await res.json()).error || "저장에 실패했습니다.");
      return;
    }
    setPhase("syncing");
    try {
      let done = false;
      while (!done) {
        const r = await fetch("/api/sync", { method: "POST" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "분석 실패");
        setProgress({ processed: d.processed, total: d.total });
        done = d.done;
      }
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message + " — 대시보드에서 새로고침으로 이어서 분석할 수 있습니다.");
    }
  }

  if (phase === "syncing") {
    const pct = progress.total ? Math.round((progress.processed / progress.total) * 100) : 0;
    return (
      <main className="shell" style={{ paddingTop: 96, maxWidth: 560 }}>
        <h1>메일함을 분석하고 있습니다</h1>
        <p className="sub">최근 30일, 최대 200건을 분석합니다. 완료된 메일부터 메일함에 표시됩니다.</p>
        <div style={{ marginTop: 28 }} className="stack">
          <div className="progress" role="progressbar" aria-valuenow={pct}>
            <div style={{ width: `${pct}%` }} />
          </div>
          <span className="mono sub">{progress.processed} / {progress.total} 분석 완료</span>
          {progress.processed > 0 && (
            <button className="btn ghost" onClick={() => router.push("/inbox")}>
              먼저 분석된 메일 보기
            </button>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="shell" style={{ paddingTop: 64, maxWidth: 640 }}>
      <h1>어떻게 정리해 드릴까요?</h1>
      <p className="sub">카테고리마다 한 줄 설명을 적어 주세요. AI는 이 설명을 기준으로 분류합니다.</p>

      <h2>카테고리 (3~7개 권장)</h2>
      <div className="stack">
        {categories.map((c, i) => (
          <div key={i} className="row">
            <input
              className="input" style={{ maxWidth: 140 }}
              value={c.name} placeholder="이름"
              onChange={(e) => update(i, "name", e.target.value)}
            />
            <input
              className="input"
              value={c.description} placeholder="한 줄 설명 (예: 카드, 은행, 결제 관련 메일)"
              onChange={(e) => update(i, "description", e.target.value)}
            />
            <button
              className="btn ghost" aria-label={`${c.name || "카테고리"} 삭제`}
              onClick={() => setCategories((prev) => prev.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {categories.length < 7 && (
          <button className="btn ghost" onClick={() => setCategories((p) => [...p, { name: "", description: "" }])}>
            + 카테고리 추가
          </button>
        )}
      </div>

      <h2>나에게 중요한 메일이란 (선택)</h2>
      <input
        className="input"
        value={criteria}
        placeholder="예: 마감이 있거나, 돈이 나가거나, 답장이 필요한 메일"
        onChange={(e) => setCriteria(e.target.value)}
      />

      {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
      <div style={{ marginTop: 28 }}>
        <button className="btn" onClick={start}>분석 시작</button>
      </div>
    </main>
  );
}
