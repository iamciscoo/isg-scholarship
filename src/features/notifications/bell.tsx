"use client";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { useInbox } from "./use-inbox";
export function NotificationBell({ signedIn }: { signedIn: boolean }) {
  const {
    locale,
    m: { ui: t },
  } = useLocale();
  const [open, setOpen] = useState(false);
  const { inbox, error, pending, refresh, read } = useInbox(signedIn);
  const receiptTasks = inbox?.receiptTasks || [];
  const count = (inbox?.unread || 0) + (inbox?.receiptTaskCount || 0);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <Popover.Trigger
        className="bell-trigger"
        aria-label={`${t.notifications}${count ? ` (${count})` : ""}`}
      >
        <Bell size={18} />
        {count > 0 && <span className="notification-count">{count > 99 ? "99+" : count}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="notification-popover"
          sideOffset={8}
          align="end"
          collisionPadding={12}
          aria-label={t.notifications}
        >
          <div className="notification-heading">
            <h2>{t.notifications}</h2>
            {Boolean(inbox?.unread) && (
              <button disabled={pending} onClick={() => read(null)} aria-label={t.markAll} title={t.markAll}>
                <CheckCheck size={19} />
              </button>
            )}
          </div>
          <div className="notification-scroll">
            {error && inbox && (
              <p role="status" className="notification-empty">
                Updates are delayed.{" "}
                <button className="text-link" onClick={() => void refresh(true)}>
                  Retry
                </button>
              </p>
            )}
            {!!receiptTasks.length && (
              <ul className="notification-list" aria-label="Receipts to upload">
                {receiptTasks.map((task) => (
                  <li key={task.link} className="is-unread">
                    <h3>{task.replacement ? "Upload a replacement receipt" : "Upload your receipt"}</h3>
                    <p>{task.title}</p>
                    <div>
                      <Link href={task.link} onClick={() => setOpen(false)}>
                        Open payment →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!signedIn ? (
              <div className="notification-empty">
                <p>{t.guestNotifications}</p>
                <Link className="text-link" href="/login">
                  {t.signIn}
                </Link>
              </div>
            ) : error && !inbox ? (
              <div className="notification-empty">
                <p role="alert">{t.retry}</p>
                <button className="text-link" onClick={() => void refresh(true)}>
                  {t.readMore}
                </button>
              </div>
            ) : !inbox ? (
              <p className="notification-empty" role="status">
                {t.wait}
              </p>
            ) : !inbox.items.length ? (
              !receiptTasks.length && <p className="notification-empty">{t.emptyNotifications}</p>
            ) : (
              <ul className="notification-list">
                {inbox.items.map((n) => (
                  <li key={n.id} className={n.is_read ? "" : "is-unread"}>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                    <time dateTime={n.created_at}>
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(n.created_at),
                      )}
                    </time>
                    <div>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => {
                            setOpen(false);
                            if (!n.is_read) void read(n.id);
                          }}
                        >
                          {t.readMore}
                        </Link>
                      )}
                      {!n.is_read && (
                        <button onClick={() => read(n.id)} disabled={pending}>
                          {t.markRead}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
