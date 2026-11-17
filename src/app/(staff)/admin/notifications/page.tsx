import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { NotificationComposer } from "@/features/notifications/composer";
export default async function Notifications({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const composerKey = (await searchParams).new || "initial";
  const { db, user, role } = await requireStaff(true);
  const [people, messages] = await Promise.all([
    db
      .from("profiles")
      .select("id,first_name,last_name")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("account_notifications")
      .select("id,title,body,recipient_id,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (people.error || messages.error) throw new Error("Notification workspace unavailable");
  const recipients = people.data.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim() || `Account ${p.id.slice(0, 8)}`,
  }));
  return (
    <Workspace role={role} email={user.email || ""} active="notifications">
      <h1>Keep your students informed.</h1>
      <p>
        Publish account updates to one person or to all active accounts. Every publication is recorded in the
        activity log.
      </p>
      <div className="notification-admin-grid">
        <section className="workspace-panel">
          <h2>New notification</h2>
          <NotificationComposer recipients={recipients} key={composerKey} requestId={randomUUID()} />
        </section>
        <section className="workspace-panel">
          <h2>Recently published</h2>
          {!messages.data.length ? (
            <p>No account notifications have been published.</p>
          ) : (
            <ul className="notification-history">
              {messages.data.map((n) => (
                <li key={n.id}>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>
                    {n.recipient_id
                      ? recipients.find((r) => r.id === n.recipient_id)?.name || "One account"
                      : "All active accounts"}{" "}
                    · {new Date(n.created_at).toISOString().slice(0, 10)}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <Link href={"/admin/notifications?new=" + randomUUID()} className="text-link">
            Start a new message
          </Link>
        </section>
      </div>
    </Workspace>
  );
}
