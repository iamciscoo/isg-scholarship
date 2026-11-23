"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Inbox } from "./types";
import { markInboxRead } from "./inbox-client";

export function useInbox(signedIn: boolean) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  const loadedAt = useRef(0);
  const reading = useRef(0);
  const refreshAfterRead = useRef(false);
  const path = usePathname();
  const previousPath = useRef(path);
  const refresh = useCallback(
    async (force = false) => {
      if (force && reading.current) refreshAfterRead.current = true;
      if (
        !signedIn ||
        (!force && request.current) ||
        reading.current ||
        (!force && Date.now() - loadedAt.current < 15_000)
      )
        return;
      if (force) request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      try {
        const response = await fetch("/api/notifications", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw Error("Unavailable");
        const latest: Inbox = await response.json();
        if (controller.signal.aborted || reading.current) return;
        setInbox(latest);
        loadedAt.current = Date.now();
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (request.current === controller) request.current = null;
      }
    },
    [signedIn],
  );
  useEffect(() => {
    const load = () => {
      if (!document.hidden) void refresh();
    };
    const changed = () => {
      void refresh(true);
    };
    load();
    const interval = setInterval(load, 30_000);
    window.addEventListener("focus", load);
    window.addEventListener("isg:notifications-read", changed);
    document.addEventListener("visibilitychange", load);
    return () => {
      request.current?.abort();
      request.current = null;
      clearInterval(interval);
      window.removeEventListener("focus", load);
      window.removeEventListener("isg:notifications-read", changed);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refresh]);
  useEffect(() => {
    if (previousPath.current === path) return;
    previousPath.current = path;
    const timer = setTimeout(() => void refresh(true), 0);
    return () => clearTimeout(timer);
  }, [path, refresh]);
  const read = async (id: string | null) => {
    reading.current++;
    request.current?.abort();
    request.current = null;
    setPending(true);
    setInbox(
      (current) =>
        current && {
          ...current,
          unread:
            id === null
              ? 0
              : Math.max(
                  0,
                  current.unread - (current.items.some((item) => item.id === id && !item.is_read) ? 1 : 0),
                ),
          items: current.items.map((item) =>
            id === null || item.id === id ? { ...item, is_read: true } : item,
          ),
        },
    );
    const ok = await markInboxRead(id);
    reading.current--;
    if (!reading.current) setPending(false);
    if (!ok) {
      setError(true);
      loadedAt.current = 0;
      await refresh(true);
    } else if (!reading.current && refreshAfterRead.current) {
      refreshAfterRead.current = false;
      await refresh(true);
    }
    return ok;
  };
  return { inbox: signedIn ? inbox : null, error, pending, refresh, read };
}
