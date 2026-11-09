import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getEmailsWithLatest, getCategories } from "@/lib/queries";
import Topbar from "@/components/Topbar";
import InboxClient from "@/components/InboxClient";

export const dynamic = "force-dynamic";

export default async function Inbox() {
  const userId = await requireUserId();
  if (!userId) redirect("/");

  const categories = getCategories(userId);
  const emails = await getEmailsWithLatest(userId);

  const rows = emails.map((e) => ({
    id: e.id,
    subject: e.subject,
    sender: e.sender,
    receivedAt: new Date(e.receivedAt).toISOString(),
    categoryId: e.latest?.categoryId ?? null,
    isImportant: e.latest?.isImportant ?? false,
    summary: e.latest?.summary ?? "",
    confidence: e.latest?.confidence ?? 0,
    reason: e.latest?.reason ?? "",
    source: e.latest?.source ?? "",
  }));

  return (
    <main className="shell">
      <Topbar />
      <h1>메일함</h1>
      <p className="sub">분류는 이 화면에서만 표시되며, 실제 Gmail은 변경되지 않습니다.</p>
      <InboxClient categories={categories.map((c) => ({ id: c.id, name: c.name }))} rows={rows} />
    </main>
  );
}
