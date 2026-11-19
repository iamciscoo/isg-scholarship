import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/forms/action-form";
import { sendFollowUp, requestMeeting, finishMeeting } from "./meeting-actions";
import { MeetingScheduler } from "./meeting-scheduler";
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
  const [messages, requests, meetings] = await Promise.all([
    db
      .from("consultation_messages")
      .select("id,author_id,body,created_at")
      .eq("user_id", record.user_id)
      .order("created_at", { ascending: false })
      .limit(100),
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
  if (messages.error || requests.error || meetings.error) throw Error("Consultation support unavailable");
  return (
    <>
      <p className="workspace-action-row">
        Full history:
        {["messages", "requests", "meetings"].map((type) => (
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
        <p>
          Additional requests are included in your consultation fee. ISG confirms availability before
          scheduling.
        </p>
        {staff ? (
          <MeetingScheduler user={record.user_id} requests={requests.data || []} />
        ) : (
          <ActionForm action={requestMeeting} label="Request an advisor meeting">
            <label>
              Availability and topics
              <textarea
                name="note"
                maxLength={1000}
                required
                placeholder="Include your time zone and a few suitable dates."
              />
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
                    Join Google Meet ↗
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
                    <label>
                      Note visible to applicant
                      <textarea name="note" minLength={3} maxLength={1000} required />
                    </label>
                  </ActionForm>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="workspace-panel">
        <h2>{staff ? "Messages with applicant" : "Ask your advisor"}</h2>
        <p>
          Ask as many follow-up questions as you need. No additional consultation fee applies. Keep sensitive
          documents in the document area.
        </p>
        <ActionForm action={sendFollowUp} label={staff ? "Send reply" : "Send question"}>
          <input type="hidden" name="user" value={record.user_id} />
          <label>
            {staff ? "Reply" : "Your question"}
            <textarea name="body" required maxLength={2000} />
          </label>
        </ActionForm>
        <ol className="notification-history">
          {messages.data?.map((m) => (
            <li key={m.id}>
              <strong>{m.author_id === record.user_id ? "Applicant" : "ISG team"}</strong>
              <p>{m.body}</p>
              <small>
                {new Date(m.created_at).toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" })} EAT
              </small>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
