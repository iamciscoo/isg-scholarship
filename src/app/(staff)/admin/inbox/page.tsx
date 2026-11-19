import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { NotificationReadButton } from "@/features/notifications/read-button";
import type { Inbox } from "@/features/notifications/types";
export default async function AdminInbox() {
  const { db } = await requireStaff(true);
  const { data, error } = await db.rpc("account_notification_inbox");
  const inbox = data as Inbox | null;
  return (
    <>
      <h1>Your notifications.</h1>
      <p>New enquiries and applicant activity, kept inside your private workspace.</p>
      <section className="workspace-panel">
        <div className="flex items-center justify-between gap-4">
          <h2>{error ? "Inbox" : `${inbox?.unread || 0} unread`}</h2>
          {!!inbox?.unread && <NotificationReadButton />}
        </div>
        {error ? (
          <p role="alert">Notifications could not be loaded. Please try again.</p>
        ) : !inbox?.items.length ? (
          <p>You’re up to date. New activity will appear here.</p>
        ) : (
          <ul className="notification-list admin-inbox-list">
            {inbox.items.map((n) => (
              <li key={n.id} className={n.is_read ? "" : "is-unread"}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <time dateTime={n.created_at}>
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Dar_es_Salaam",
                  }).format(new Date(n.created_at))}
                </time>
                <div>
                  {n.link && <Link href={n.link}>Open workspace update →</Link>}
                  {!n.is_read && <NotificationReadButton id={n.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {inbox?.items.length === 20 && (
        <p className="field-help">
          Showing your 20 most recent updates. The unread count includes earlier updates.
        </p>
      )}
    </>
  );
}
