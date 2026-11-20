import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
export default async function History({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; user?: string; page?: string }>;
}) {
  const { db, user, role } = await requireUser();
  const q = await searchParams;
  const owner = typeof q.user === "string" && z.uuid().safeParse(q.user).success ? q.user : user.id;
  const access = await db.from("consultation_cases").select("user_id").eq("user_id", owner).maybeSingle();
  if (access.error) throw Error("History unavailable");
  if (!access.data) notFound();
  const type = q.type === "meetings" ? "meetings" : "requests";
  const table = type === "meetings" ? "consultation_meetings" : "meeting_requests";
  const count = await db.from(table).select("id", { count: "exact", head: true }).eq("user_id", owner);
  if (count.error) throw Error("History unavailable");
  const page = Math.min(
    Math.max(1, Math.ceil((count.count || 0) / 20)),
    Math.max(1, Number.parseInt(q.page || "1", 10) || 1),
  );
  const items = await db
    .from(table)
    .select("*")
    .eq("user_id", owner)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (items.error) throw Error("History unavailable");
  const href = (p: number) => `/dashboard/consultations/history?type=${type}&user=${owner}&page=${p}`;
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <h1>Consultation {type}.</h1>
      <Link
        className="text-link"
        href={
          owner === user.id
            ? "/dashboard/consultations"
            : `/${role === "admin" ? "admin" : "advisor"}/cases/${owner}`
        }
      >
        ← Back to consultation
      </Link>
      <section className="workspace-panel">
        <ol className="notification-history">
          {items.data?.map((item) => (
            <li key={item.id}>
              {type === "requests" ? (
                <>
                  <strong>{item.status}</strong>
                  <p>{item.note}</p>
                </>
              ) : (
                <>
                  <strong>{item.status}</strong>
                  <p>
                    {new Date(item.starts_at).toLocaleString("en-GB", { timeZone: item.time_zone })} ·{" "}
                    {item.time_zone}
                  </p>
                  {item.status === "scheduled" && (
                    <a className="text-link" href={item.meet_url} rel="noopener noreferrer" target="_blank">
                      Join meeting ↗
                    </a>
                  )}
                  <p>{item.note}</p>
                </>
              )}
              <time>{new Date(item.created_at).toISOString()}</time>
            </li>
          ))}
        </ol>
        <div className="pagination">
          <span>
            {count.count || 0} records · Page {page}
          </span>
          <div>
            {page > 1 && <Link href={href(page - 1)}>← Previous </Link>}
            {page * 20 < (count.count || 0) && <Link href={href(page + 1)}> Older →</Link>}
          </div>
        </div>
      </section>
    </Workspace>
  );
}
