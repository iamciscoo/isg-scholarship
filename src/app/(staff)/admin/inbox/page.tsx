import { getWorkspaceText } from "@/lib/i18n/server";

import { notificationCopy } from "@/features/notifications/notification-copy";
import { Text, DateText } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { NotificationReadButton } from "@/features/notifications/read-button";
import type { Inbox } from "@/features/notifications/types";
export default async function AdminInbox() {
  const { db } = await requireStaff(true);
  const translate = await getWorkspaceText();
  const { data, error } = await db.rpc("account_notification_inbox");
  const inbox = data as Inbox | null;
  return (
    <>
      <h1>
        <Text>{"Your notifications."}</Text>
      </h1>
      <p>
        <Text>{"New enquiries and applicant activity, kept inside your private workspace."}</Text>
      </p>
      <section className="workspace-panel">
        <div className="flex items-center justify-between gap-4">
          <h2>{error ? translate("Inbox") : translate("{count} unread", { count: inbox?.unread || 0 })}</h2>
          {!!inbox?.unread && <NotificationReadButton />}
        </div>
        {error ? (
          <p role="alert">
            <Text>{"Notifications could not be loaded. Please try again."}</Text>
          </p>
        ) : !inbox?.items.length ? (
          <p>
            <Text>{"You’re up to date. New activity will appear here."}</Text>
          </p>
        ) : (
          <ul className="notification-list admin-inbox-list">
            {inbox.items.map((n) => (
              <li key={n.id} className={n.is_read ? "" : "is-unread"}>
                <h3>{notificationCopy(n, translate).title}</h3>
                <p>{notificationCopy(n, translate).body}</p>
                <time dateTime={n.created_at}>{<DateText value={n.created_at} time />}</time>
                <div>
                  {n.link && (
                    <Link href={n.link}>
                      <Text>{"Open workspace update →"}</Text>
                    </Link>
                  )}
                  {!n.is_read && <NotificationReadButton id={n.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {inbox?.items.length === 20 && (
        <p className="field-help">
          <Text>{"Showing your 20 most recent updates. The unread count includes earlier updates."}</Text>
        </p>
      )}
    </>
  );
}
