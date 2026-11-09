// Gmail readonly 클라이언트. 본문은 분류 시점에만 조회하고 DB에 저장하지 않는다 (PRD 6장).
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

const MAX_EMAILS = 200;
const QUERY = "newer_than:30d -in:chats"; // PRD 2장: 최근 30일 또는 최대 200건

export async function getAccessToken(userId: string): Promise<string> {
  const row = db.select().from(schema.oauthTokens).where(eq(schema.oauthTokens.userId, userId)).get();
  if (!row) throw new Error("Gmail 연동 정보가 없습니다. 다시 로그인해 주세요.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: row.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Google 토큰 갱신 실패. 연동을 해제 후 다시 연결해 주세요.");
  const data = await res.json();
  return data.access_token as string;
}

async function gmailGet(accessToken: string, path: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500)); // 단순 백오프
    return gmailGet(accessToken, path);
  }
  if (!res.ok) throw new Error(`Gmail API 오류 (${res.status})`);
  return res.json();
}

/** 최근 30일 메시지 ID 목록 (최대 200건) */
export async function listMessageIds(accessToken: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < MAX_EMAILS) {
    const qs = new URLSearchParams({
      q: QUERY,
      maxResults: String(Math.min(100, MAX_EMAILS - ids.length)),
    });
    if (pageToken) qs.set("pageToken", pageToken);
    const data = await gmailGet(accessToken, `messages?${qs}`);
    for (const m of data.messages ?? []) ids.push(m.id);
    pageToken = data.nextPageToken;
    if (!pageToken || !data.messages?.length) break;
  }
  return ids;
}

export type RawEmail = {
  gmailMessageId: string;
  sender: string;
  senderDomain: string;
  subject: string;
  receivedAt: Date;
  snippet: string;
  body: string; // 저장하지 않고 분류에만 사용
};

function decodeBase64Url(s: string): string {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data)
    return decodeBase64Url(payload.body.data);
  if (payload.mimeType === "text/html" && payload.body?.data)
    return decodeBase64Url(payload.body.data);
  for (const part of payload.parts ?? []) {
    const found = extractBody(part);
    if (found) return found;
  }
  return "";
}

export async function fetchEmail(accessToken: string, id: string): Promise<RawEmail> {
  const msg = await gmailGet(accessToken, `messages/${id}?format=full`);
  const headers: Record<string, string> = {};
  for (const h of msg.payload?.headers ?? []) headers[h.name.toLowerCase()] = h.value;
  const from = headers["from"] ?? "";
  const emailMatch = from.match(/<([^>]+)>/);
  const senderEmail = (emailMatch ? emailMatch[1] : from).trim().toLowerCase();
  return {
    gmailMessageId: msg.id,
    sender: senderEmail,
    senderDomain: senderEmail.split("@")[1] ?? "",
    subject: headers["subject"] ?? "(제목 없음)",
    receivedAt: new Date(Number(msg.internalDate)),
    snippet: msg.snippet ?? "",
    body: extractBody(msg.payload),
  };
}
