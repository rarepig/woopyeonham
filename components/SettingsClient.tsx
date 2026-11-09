"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type Cat = { id: string; name: string; description: string };

export default function SettingsClient({
  categories, criteria, isDemo, ruleCount,
}: { categories: Cat[]; criteria: string; isDemo: boolean; ruleCount: number }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [reclassifying, setReclassifying] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function addCategory() {
    setError("");
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc }),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setName(""); setDesc("");
    router.refresh();
  }

  async function removeCategory(id: string, catName: string) {
    if (!confirm(`"${catName}" 카테고리를 삭제할까요? 해당 메일은 미분류로 이동합니다.`)) return;
    await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function reclassify() {
    setReclassifying(true); setError("");
    try {
      let done = false;
      while (!done) {
        const res = await fetch("/api/reclassify", { method: "POST" });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "재분류 실패");
        setRemaining(d.remaining);
        done = d.done;
      }
      router.refresh();
    } catch (e: any) { setError(e.message); }
    finally { setReclassifying(false); }
  }

  async function deleteAccount() {
    if (!confirm("연동을 해제하고 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch("/api/account", { method: "DELETE" });
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="stack" style={{ gap: 0 }}>
      <h2>카테고리</h2>
      <div className="panel stack">
        {categories.map((c) => (
          <div key={c.id} className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{c.name}</strong>
              <span className="sub" style={{ marginLeft: 8 }}>{c.description}</span>
            </div>
            <button className="btn ghost" onClick={() => removeCategory(c.id, c.name)} aria-label={`${c.name} 삭제`}>×</button>
          </div>
        ))}
        <div className="row">
          <input className="input" style={{ maxWidth: 140 }} placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="한 줄 설명" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <button className="btn" onClick={addCategory} disabled={!name.trim() || !desc.trim()}>추가</button>
        </div>
      </div>

      <h2>재분류</h2>
      <div className="panel row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="sub">
          카테고리를 바꾼 뒤 미분류 메일을 다시 분류합니다.
          {remaining !== null && ` (남은 메일 ${remaining}건)`}
        </span>
        <button className="btn ghost" onClick={reclassify} disabled={reclassifying}>
          {reclassifying ? "재분류 중…" : "미분류 재분류 실행"}
        </button>
      </div>

      <h2>개인화 현황</h2>
      <div className="panel">
        <p className="sub">
          중요 기준: {criteria || "(설정 안 함)"} · 발신자 자동 규칙 <span className="mono">{ruleCount}</span>개
        </p>
        <p className="sub" style={{ marginTop: 6 }}>
          같은 발신자를 두 번 이상 같은 카테고리로 수정하면 자동 규칙이 만들어집니다.
        </p>
      </div>

      <h2>계정</h2>
      <div className="panel row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="sub">
          {isDemo ? "데모 계정입니다." : "Gmail은 읽기 전용으로만 연결되어 있습니다."} 삭제 시 모든 데이터가 즉시 파기됩니다.
        </span>
        <div className="row">
          <button className="btn ghost" onClick={() => signOut({ callbackUrl: "/" })}>로그아웃</button>
          <button className="btn danger" onClick={deleteAccount}>연동 해제 및 데이터 삭제</button>
        </div>
      </div>

      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  );
}
