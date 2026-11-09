"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** /api/sync를 done까지 반복 호출하며 진행률을 표시하는 공용 러너 */
export default function SyncRunner({ label = "새로고침", auto = false }: { label?: string; auto?: boolean }) {
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = useCallback(async () => {
    setRunning(true);
    setError("");
    try {
      let done = false;
      while (!done) {
        const res = await fetch("/api/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "동기화 실패");
        setProgress({ processed: data.processed, total: data.total });
        done = data.done;
        router.refresh(); // 완료분부터 즉시 목록 반영 (PRD 시나리오 3)
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [router]);

  // 접속 시 자동 1회
  const started = useRef(false);
  useEffect(() => {
    if (auto && !started.current) { started.current = true; run(); }
  }, [auto, run]);

  const pct = progress && progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row">
        <button className="btn ghost" onClick={run} disabled={running}>
          {running ? "분석 중…" : label}
        </button>
        {progress && (
          <span className="mono sub">{progress.processed} / {progress.total}</span>
        )}
      </div>
      {running && progress && (
        <div className="progress" role="progressbar" aria-valuenow={pct}>
          <div style={{ width: `${pct}%` }} />
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
