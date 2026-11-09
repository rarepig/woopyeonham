import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "우편함 — AI 메일 어시스턴트",
  description: "Gmail을 읽기 전용으로 분석해 내 기준대로 정리해 주는 메일 어시스턴트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
