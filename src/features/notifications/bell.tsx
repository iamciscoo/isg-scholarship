"use client";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  const path = usePathname();
  const request = useRef<AbortController | null>(null);
  const receiptTasks = inbox?.receiptTasks || [];
  const count = (inbox?.unread || 0) + (inbox?.receiptTaskCount || 0);
  const refresh = useCallback(async () => {
    if (!signedIn) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await fetch("/api/notifications", { cache: "no-store", signal: controller.signal });
      if (!result.ok) throw new Error("inbox_unavailable");
      const latest = await result.json();
      if (request.current !== controller || controller.signal.aborted) return;
      setInbox(latest);
      setError(false);
    } catch {
      if (!controller.signal.aborted && request.current === controller) setError(true);
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [signedIn]);
  useEffect(() => {
    if (!signedIn) return;
    const load = () => {
      if (!document.hidden) void refresh();
    };
    load();
    const interval = setInterval(() => {
      if (!request.current) load();
    }, 5000);
    window.addEventListener("focus", load);
    window.addEventListener("isg:notifications-read", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      request.current?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", load);
      window.removeEventListener("isg:notifications-read", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refresh, path, signedIn]);
  const read = (id: string | null) =>
    start(async () => {
      if (await markNotificationsRead(id)) {
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
          {!!receiptTasks.length && (
            <ul className="notification-list" aria-label="Receipts to upload">
              {receiptTasks.map((task) => (
                <li key={task.link} className="is-unread">
                  <h3>{task.replacement ? "Upload a replacement receipt" : "Upload your receipt"}</h3>
                  <p>{task.title}</p>
                  <div>
                    <Link href={task.link}>Open payment →</Link>
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
              <button className="text-link" onClick={() => void refresh()}>
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
