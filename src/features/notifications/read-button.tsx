"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "./actions";
export function NotificationReadButton({ id = null }: { id?: string | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="text-link"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(false);
            try {
              if (!(await markNotificationsRead(id))) {
                setError(true);
                return;
              }
              window.dispatchEvent(new Event("isg:notifications-read"));
              router.refresh();
            } catch {
              setError(true);
            }
          })
        }
      >
        {pending ? "Updating…" : id ? "Mark as read" : "Mark all as read"}
      </button>
      {error && <span role="alert">Please try again.</span>}
    </>
  );
}
