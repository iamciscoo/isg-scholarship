import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { NotificationComposer } from "@/features/notifications/composer";
export default async function Notifications({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const [query, { db, user, role }, t] = await Promise.all([searchParams, requireStaff(true), getWorkspaceText()]);
  const composerKey = query.new || "initial";
  const [people, messages] = await Promise.all([
    db.rpc("notification_recipients"),
    db
      .from("account_notifications")
      .select("id,title,body,recipient_id,created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (people.error || messages.error) throw new Error("Notification workspace unavailable");
  const recipients = (people.data as { id: string; name: string }[]).map((person) => ({
    ...person,
    name: person.name || t("Unnamed account"),
  }));
  const recipientNames = new Map(recipients.map(({ id, name }) => [id, name]));
  return (
    <Workspace role={role} email={user.email || ""} active="notifications">
      <h1>
        <Text>{"Keep your students informed."}</Text>
      </h1>
      <p>
        <Text>
          {
            "Publish account updates to one person or to all active accounts. Every publication is recorded in the activity log."
          }
        </Text>
      </p>
      <div className="notification-admin-grid">
        <section className="workspace-panel">
          <h2>
            <Text>{"New notification"}</Text>
          </h2>
          <NotificationComposer recipients={recipients} key={composerKey} requestId={randomUUID()} />
        </section>
        <section className="workspace-panel">
          <h2>
            <Text>{"Recently published"}</Text>
          </h2>
          {!messages.data.length ? (
            <p>
              <Text>{"No account notifications have been published."}</Text>
            </p>
          ) : (
            <ul className="notification-history">
              {messages.data.map((n) => (
                <li key={n.id}>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>
                    {n.recipient_id
                      ? recipientNames.get(n.recipient_id) || t("One account")
                      : t("All active accounts")}{" "}
                    · {new Date(n.created_at).toISOString().slice(0, 10)}
                  </small>
                </li>
              ))}
            </ul>
          )}
          <Link href={"/admin/notifications?new=" + randomUUID()} className="text-link">
            <Text>{"Start a new message"}</Text>
          </Link>
        </section>
      </div>
    </Workspace>
  );
}
