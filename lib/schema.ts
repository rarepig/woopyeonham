// PRD 6장 데이터 설계. 메일 본문은 저장하지 않는다 — 메타데이터 + AI 산출물만.
import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const now = () => integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  googleId: text("google_id").unique(),
  email: text("email").notNull().unique(),
  importantCriteria: text("important_criteria"),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
});

export const oauthTokens = sqliteTable("oauth_tokens", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  refreshToken: text("refresh_token").notNull(),
  scope: text("scope"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()),
});

export const categories = sqliteTable("categories", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: now(),
});

export const emails = sqliteTable(
  "emails",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id").notNull(),
    sender: text("sender").notNull(),
    senderDomain: text("sender_domain").notNull().default(""),
    subject: text("subject").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp_ms" }).notNull(),
    snippet: text("snippet").notNull().default(""),
  },
  (t) => ({
    uq: uniqueIndex("emails_user_msg_uq").on(t.userId, t.gmailMessageId),
    byDate: index("emails_user_date_idx").on(t.userId, t.receivedAt),
  })
);

// 수정 시 새 행 추가로 이력 보존. categoryId null = 미분류.
export const classifications = sqliteTable(
  "classifications",
  {
    id: id(),
    emailId: text("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    isImportant: integer("is_important", { mode: "boolean" }).notNull().default(false),
    summary: text("summary").notNull().default(""),
    confidence: real("confidence").notNull().default(0),
    reason: text("reason").notNull().default(""),
    source: text("source").notNull(), // "llm" | "sender_rule" | "user" | "mock"
    createdAt: now(),
  },
  (t) => ({ byEmail: index("cls_email_idx").on(t.emailId, t.createdAt) })
);

export const feedbacks = sqliteTable("feedbacks", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emailId: text("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  beforeCategoryId: text("before_category_id"),
  afterCategoryId: text("after_category_id"),
  createdAt: now(),
});

export const senderRules = sqliteTable(
  "sender_rules",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sender: text("sender").notNull(),
    categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    createdAt: now(),
  },
  (t) => ({ uq: uniqueIndex("rules_user_sender_uq").on(t.userId, t.sender) })
);

export const syncStates = sqliteTable("sync_states", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
  totalTarget: integer("total_target").notNull().default(0),
});
