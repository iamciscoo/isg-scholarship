"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInboxRead } from "./inbox-client";
import { LoadingDots } from "@/components/ui/loading-dots";
export function NotificationReadButton({ id = null }: { id?: string | null }) {
  const translate = useWorkspaceText();
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
              if (!(await markInboxRead(id))) {
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
        {pending ? (
          <>
            <Text>{"Updating"}</Text>
            <LoadingDots />
          </>
        ) : id ? (
          translate("Mark as read")
        ) : (
          translate("Mark all as read")
        )}
      </button>
      {error && (
        <span role="alert">
          <Text>{"Please try again."}</Text>
        </span>
      )}
    </>
  );
}
