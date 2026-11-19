"use client";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { markNotificationsRead } from "./actions";
import type { Inbox } from "./types";
export function NotificationBell({ signedIn }: { signedIn: boolean }) {
  const {
    locale,
    m: { ui: t },
  } = useLocale();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!signedIn) return;
      try {
        const result = await fetch("/api/notifications", { cache: "no-store", signal });
        if (!result.ok) throw new Error("inbox_unavailable");
        setInbox(await result.json());
        setError(false);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setError(true);
      }
    },
    [signedIn],
  );
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (!document.hidden) void refresh(controller.signal);
    };
    load();
    const interval = setInterval(load, 15000);
    window.addEventListener("focus", load);
    window.addEventListener("isg:notifications-read", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", load);
      window.removeEventListener("isg:notifications-read", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refresh]);
  const read = (id: string | null) =>
    start(async () => {
      if (await markNotificationsRead(id)) {
        await refresh();
        window.dispatchEvent(new Event("isg:notifications-read"));
      } else setError(true);
    });
  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open) void refresh();
      }}
    >
      <Popover.Trigger
        className="bell-trigger"
        aria-label={`${t.notifications}${inbox?.unread ? ` (${inbox.unread} ${t.unread})` : ""}`}
      >
        <Bell size={18} />
        {Boolean(inbox?.unread) && (
          <span className="notification-count">{inbox!.unread > 99 ? "99+" : inbox!.unread}</span>
        )}
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
          {!signedIn ? (
            <div className="notification-empty">
              <p>{t.guestNotifications}</p>
              <Link className="text-link" href="/login">
                {t.signIn}
              </Link>
            </div>
          ) : error ? (
            <div className="notification-empty">
              <p role="alert">{t.retry}</p>
              <button className="text-link" onClick={() => void refresh()}>
                {t.readMore}
              </button>
            </div>
          ) : !inbox ? (
            <p className="notification-empty" role="status">
              {t.wait}
            </p>
          ) : !inbox.items.length ? (
            <p className="notification-empty">{t.emptyNotifications}</p>
          ) : (
            <ul className="notification-list">
              {inbox.items.map((n) => (
                <li key={n.id} className={n.is_read ? "" : "is-unread"}>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <time dateTime={n.created_at}>
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(n.created_at))}
                  </time>
                  <div>
                    {n.link && <Link href={n.link}>{t.readMore}</Link>}
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
