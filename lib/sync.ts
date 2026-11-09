// 초기/증분 동기화. 클라이언트가 done=true가 될 때까지 반복 호출하는 청크 처리 방식.
// 발신자 규칙이 있으면 LLM 호출 없이 즉시 분류한다 (PRD 5장 — 캐스케이드의 씨앗).
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { classifyEmail } from "./classify";
import { preprocess } from "./preprocess";
import { getAccessToken, listMessageIds, fetchEmail, type RawEmail } from "./gmail";
import { DEMO_MAILS } from "./demo";
import { getUser, getCategories } from "./queries";

const CHUNK = 8;

export type SyncProgress = { processed: number; total: number; done: boolean };

export async function syncChunk(userId: string): Promise<SyncProgress> {
  const user = getUser(userId);
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");
  const categories = getCategories(userId).map((c) => ({
    id: c.id, name: c.name, description: c.description,
  }));

  const existing = new Set(
    db.select({ id: schema.emails.gmailMessageId }).from(schema.emails)
      .where(eq(schema.emails.userId, userId)).all().map((r) => r.id)
  );

  let pending: RawEmail[] = [];
  let total = 0;

  if (user.isDemo) {
    total = DEMO_MAILS.length;
    pending = DEMO_MAILS.filter((m) => !existing.has(m.id))
      .slice(0, CHUNK)
      .map((m) => ({
        gmailMessageId: m.id,
        sender: m.sender,
        senderDomain: m.sender.split("@")[1] ?? "",
        subject: m.subject,
        receivedAt: new Date(Date.now() - m.daysAgo * 86400_000),
        snippet: m.body.slice(0, 100),
        body: m.body,
      }));
  } else {
    const accessToken = await getAccessToken(userId);
    const ids = await listMessageIds(accessToken);
    total = ids.length;
    const newIds = ids.filter((id) => !existing.has(id)).slice(0, CHUNK);
    pending = await Promise.all(newIds.map((id) => fetchEmail(accessToken, id)));
  }

  const rules = db.select().from(schema.senderRules)
    .where(eq(schema.senderRules.userId, userId)).all();
  const ruleMap = new Map(rules.map((r) => [r.sender, r.categoryId]));

  for (const raw of pending) {
    const body = preprocess(raw.body);
    const email = db.insert(schema.emails).values({
      userId,
      gmailMessageId: raw.gmailMessageId,
      sender: raw.sender,
      senderDomain: raw.senderDomain,
      subject: raw.subject,
      receivedAt: raw.receivedAt,
      snippet: raw.snippet,
    }).returning().get();

    const ruleCategoryId = ruleMap.get(raw.sender);
    if (ruleCategoryId) {
      db.insert(schema.classifications).values({
        emailId: email.id,
        categoryId: ruleCategoryId,
        isImportant: false,
        summary: raw.snippet || raw.subject,
        confidence: 1,
        reason: "발신자 규칙에 따라 자동 분류",
        source: "sender_rule",
      }).run();
      continue;
    }

    const result = await classifyEmail(
      userId, categories,
      { sender: raw.sender, subject: raw.subject, body },
      user.importantCriteria
    );
    db.insert(schema.classifications).values({
      emailId: email.id,
      categoryId: result.categoryId,
      isImportant: result.isImportant,
      summary: result.summary,
      confidence: result.confidence,
      reason: result.reason,
      source: result.source,
    }).run();
  }

  const processed = db.select({ id: schema.emails.id }).from(schema.emails)
    .where(eq(schema.emails.userId, userId)).all().length;

  db.insert(schema.syncStates)
    .values({ userId, lastSyncedAt: new Date(), totalTarget: total })
    .onConflictDoUpdate({
      target: schema.syncStates.userId,
      set: { lastSyncedAt: new Date(), totalTarget: total },
    }).run();

  return { processed, total, done: processed >= total || pending.length === 0 };
}
