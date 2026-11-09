// 공용 조회: 메일 + 최신 분류(이력 중 가장 최근 행)
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";

export type EmailWithLatest = typeof schema.emails.$inferSelect & {
  latest: typeof schema.classifications.$inferSelect | null;
};

export async function getEmailsWithLatest(userId: string): Promise<EmailWithLatest[]> {
  const emails = db
    .select().from(schema.emails)
    .where(eq(schema.emails.userId, userId))
    .orderBy(desc(schema.emails.receivedAt))
    .all();
  if (emails.length === 0) return [];

  const cls = db
    .select().from(schema.classifications)
    .where(inArray(schema.classifications.emailId, emails.map((e) => e.id)))
    .orderBy(desc(schema.classifications.createdAt))
    .all();

  const latestByEmail = new Map<string, (typeof cls)[number]>();
  for (const c of cls) if (!latestByEmail.has(c.emailId)) latestByEmail.set(c.emailId, c);

  return emails.map((e) => ({ ...e, latest: latestByEmail.get(e.id) ?? null }));
}

export function getUser(userId: string) {
  return db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
}

export function getCategories(userId: string) {
  return db.select().from(schema.categories)
    .where(eq(schema.categories.userId, userId))
    .orderBy(schema.categories.createdAt)
    .all();
}
