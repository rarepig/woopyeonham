import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getUser } from "@/lib/queries";
import SignInButtons from "@/components/SignInButtons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUserId();
  if (userId) {
    const user = getUser(userId);
    redirect(user?.onboarded ? "/dashboard" : "/onboarding");
  }
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID;
  return (
    <main className="shell" style={{ paddingTop: 96, maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <span className="postmark" style={{ width: 64, height: 64, fontSize: "0.9rem" }}>우편</span>
      </div>
      <h1 style={{ fontSize: "1.9rem" }}>메일은 쌓이고,<br />정리는 AI가 합니다.</h1>
      <p className="sub" style={{ marginTop: 10, marginBottom: 36 }}>
        Gmail을 <strong>읽기 전용</strong>으로 분석해 내가 정한 카테고리로 정리하고,
        중요한 메일만 요약해 먼저 보여줍니다. 원본 메일함은 절대 변경하지 않습니다.
      </p>
      <SignInButtons googleEnabled={googleEnabled} />
    </main>
  );
}
