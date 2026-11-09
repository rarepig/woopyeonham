"use client";
import { signIn } from "next-auth/react";

export default function SignInButtons({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <div className="stack" style={{ maxWidth: 320 }}>
      {googleEnabled && (
        <button className="btn" onClick={() => signIn("google", { callbackUrl: "/" })}>
          Google 계정으로 시작
        </button>
      )}
      <button className="btn ghost" onClick={() => signIn("demo", { callbackUrl: "/" })}>
        데모 메일함으로 체험
      </button>
      {!googleEnabled && (
        <p className="sub" style={{ fontSize: "0.8rem" }}>
          Google 연동은 .env에 GOOGLE_CLIENT_ID / SECRET을 설정하면 활성화됩니다.
        </p>
      )}
    </div>
  );
}
