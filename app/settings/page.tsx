import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getUser, getCategories } from "@/lib/queries";
import Topbar from "@/components/Topbar";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const userId = await requireUserId();
  if (!userId) redirect("/");
  const user = getUser(userId);
  if (!user) redirect("/");
  const categories = getCategories(userId);
  const ruleCount = db.select({ id: schema.senderRules.id }).from(schema.senderRules)
    .where(eq(schema.senderRules.userId, userId)).all().length;
  return (
    <main className="shell">
      <Topbar />
      <h1>설정</h1>
      <SettingsClient
        categories={categories.map((c) => ({ id: c.id, name: c.name, description: c.description }))}
        criteria={user.importantCriteria ?? ""}
        isDemo={user.isDemo}
        ruleCount={ruleCount}
      />
    </main>
  );
}
