"use client";
import { useState } from "react";
import { ActionForm } from "@/components/forms/action-form";
import { scheduleMeeting } from "./meeting-actions";
export function MeetingScheduler({
  user,
  requests,
}: {
  user: string;
  requests: { id: string; note: string; status: string }[];
}) {
  const [start, setStart] = useState(""),
    [minutes, setMinutes] = useState(45);
  const date = start ? new Date(start) : null;
  const valid = date && !Number.isNaN(date.getTime());
  const [zone, setZone] = useState("");
  return (
    <ActionForm action={scheduleMeeting} label="Schedule Google Meet">
      <input type="hidden" name="user" value={user} />
      <input type="hidden" name="start" value={valid ? date.toISOString() : ""} />
      <input
        type="hidden"
        name="end"
        value={valid ? new Date(date.getTime() + minutes * 60000).toISOString() : ""}
      />
      <input type="hidden" name="zone" value={zone} />
      <label>
        Start time ({zone || "your local time"})
        <input
          type="datetime-local"
          required
          value={start}
          onChange={(e) => {
            setStart(e.target.value);
            setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
          }}
        />
      </label>
      <label>
        Duration
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {[30, 45, 60, 90, 120].map((n) => (
            <option value={n} key={n}>
              {n} minutes
            </option>
          ))}
        </select>
      </label>
      <label>
        Google Meet link
        <input name="url" type="url" required placeholder="https://meet.google.com/abc-defg-hij" />
      </label>
      <p>
        Create a real meeting in Google Meet or Calendar, then paste its link. ISG does not create a Google
        meeting automatically.
      </p>
      <label>
        Related request
        <select name="request">
          <option value="">Additional meeting</option>
          {requests
            .filter((r) => r.status === "requested")
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.note.slice(0, 100)}
              </option>
            ))}
        </select>
      </label>
    </ActionForm>
  );
}
