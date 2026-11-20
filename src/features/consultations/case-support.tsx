import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/forms/action-form";
import { requestMeeting, finishMeeting } from "./meeting-actions";
import { MeetingScheduler } from "./meeting-scheduler";
import { meetingSlots, meetingTopics, meetingZones } from "./meeting-options";
import type { ConsultationCase } from "./payment-panel";
export async function CaseSupport({
  record,
  advisor,
  staff = false,
}: {
  record: ConsultationCase;
  advisor: string | null;
  staff?: boolean;
}) {
  if (!advisor) return null;
  const db = await createClient();
  const [requests, meetings] = await Promise.all([
    db
      .from("meeting_requests")
      .select("id,note,status,created_at")
      .eq("user_id", record.user_id)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("consultation_meetings")
      .select("id,starts_at,ends_at,time_zone,meet_url,status,note")
      .eq("user_id", record.user_id)
      .order("starts_at", { ascending: false })
      .limit(100),
  ]);
  if (requests.error || meetings.error) throw Error("Consultation support unavailable");
  return (
    <>
      <p className="case-history">
        Full history:
        {["requests", "meetings"].map((type) => (
          <Link
            className="text-link"
            key={type}
            href={`/dashboard/consultations/history?type=${type}&user=${record.user_id}`}
          >
            {type}
          </Link>
        ))}
      </p>
      <section className="workspace-panel">
        <h2>{staff ? "Advisor meetings" : `Meet with ${advisor}`}</h2>
        {!meetings.data?.length ? (
          <p>No meetings have been scheduled yet.</p>
        ) : (
          <div className="operation-grid">
            {meetings.data.map((m) => (
              <article className="operation-card" key={m.id}>
                <span className="status-pill">{m.status}</span>
                <h3>{new Date(m.starts_at).toLocaleString("en-GB", { timeZone: m.time_zone })}</h3>
                <p>
                  {m.time_zone} · {Math.round((Date.parse(m.ends_at) - Date.parse(m.starts_at)) / 60000)}{" "}
                  minutes
                </p>
                {m.status === "scheduled" && (
                  <a className="text-link" href={m.meet_url} target="_blank" rel="noopener noreferrer">
                    Join meeting ↗
                  </a>
                )}
                {m.note && <p>{m.note}</p>}
                {staff && m.status === "scheduled" && (
                  <ActionForm action={finishMeeting} label="Update meeting">
                    <input type="hidden" name="user" value={record.user_id} />
                    <input type="hidden" name="meeting" value={m.id} />
                    <label>
                      Outcome
                      <select name="status" required>
                        <option value="">Select outcome</option>
                        <option value="completed">Completed — unlock application form</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </ActionForm>
                )}
              </article>
            ))}
          </div>
        )}
      
      
        {staff ? (
          <MeetingScheduler user={record.user_id} requests={requests.data || []} />
        ) : (
          <ActionForm action={requestMeeting} label="Request an advisor meeting">
            <label>
              Preferred date
              <input name="date" type="date" required min={new Date().toISOString().slice(0, 10)} />
            </label>
            <label>
              Preferred time
              <select name="time" defaultValue="10:00">
                {meetingSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your time zone
              <select name="zone" defaultValue="Africa/Dar_es_Salaam">
                {meetingZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Topic
              <select name="topic">
                {meetingTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Anything else? (optional)
              <input name="details" maxLength={200} />
            </label>
          </ActionForm>
        )}
        {!!requests.data?.length && (
          <>
            <h3>Meeting requests</h3>
            <ul className="case-file-list">
              {requests.data.map((r) => (
                <li key={r.id}>
                  <p>{r.note}</p>
                  <span>{r.status}</span>
                  <time>{new Date(r.created_at).toLocaleDateString("en-GB")}</time>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
