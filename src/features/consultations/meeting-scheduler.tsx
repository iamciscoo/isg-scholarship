"use client";
import { ActionForm, type ActionState } from "@/components/forms/action-form";
import { scheduleMeeting } from "./meeting-actions";

const durations = [30, 45, 60, 90, 120];

async function submitMeeting(state: ActionState, data: FormData) {
  const start = new Date(String(data.get("localStart") ?? ""));
  const minutes = Number(data.get("duration"));
  if (!Number.isFinite(start.getTime()) || !durations.includes(minutes)) {
    return { error: "Choose a start time and meeting duration." };
  }
  data.set("start", start.toISOString());
  data.set("end", new Date(start.getTime() + minutes * 60_000).toISOString());
  data.set("zone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  return scheduleMeeting(state, data);
}

export function MeetingScheduler({
  user,
  requests,
}: {
  user: string;
  requests: { id: string; note: string; status: string }[];
}) {
  return (
    <ActionForm action={submitMeeting} label="Schedule meeting">
      <input type="hidden" name="user" value={user} />
      <label>
        Start time (your local time)
        <input name="localStart" type="datetime-local" required />
      </label>
      <label>
        Duration
        <select name="duration" defaultValue={45}>
          {durations.map((n) => (
            <option value={n} key={n}>
              {n} minutes
            </option>
          ))}
        </select>
      </label>
      <label>
        Meeting link
        <input name="url" type="url" required placeholder="https://meet.google.com/abc-defg-hij" />
      </label>
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
