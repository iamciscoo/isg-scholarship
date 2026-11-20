import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { DeleteForm } from "@/components/forms/delete-form";
import { deleteContactEnquiry } from "@/features/admin/enquiry-actions";
export default async function Enquiries({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { db, user, role } = await requireStaff(true);
  const page = Math.min(10000, Math.max(1, Number.parseInt((await searchParams).page || "1", 10) || 1));
  const { data, error, count } = await db
    .from("contact_enquiries")
    .select("id,name,email,whatsapp,topic,message,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  return (
    <Workspace role={role} email={user.email || ""} active="enquiries">
      <h1>Every question matters.</h1>
      <p>
        Contact enquiries are restricted to administrators. Respond through ISG’s approved communication
        channels.
      </p>
      <section className="workspace-panel">
        <h2>Contact inbox</h2>
        {error ? (
          <p className="notice notice-error" role="alert">
            The contact inbox could not be loaded.
          </p>
        ) : !data?.length ? (
          <div className="empty-state">
            <h3>No enquiries yet.</h3>
            <p>Messages submitted through the website will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Topic</th>
                  <th>Message</th>
                  <th>Received</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      <small>{row.email}</small>
                      {row.whatsapp && <small>WhatsApp {row.whatsapp}</small>}
                    </td>
                    <td>{row.topic}</td>
                    <td className="min-w-64 whitespace-pre-wrap">{row.message}</td>
                    <td>
                      {new Date(row.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Africa/Dar_es_Salaam",
                      })}
                    </td>
                    <td>
                      <DeleteForm
                        action={deleteContactEnquiry}
                        id={row.id}
                        label="Delete"
                        confirm={`Delete the enquiry from ${row.name}? This cannot be undone.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            {count || 0} enquiries • Page {page}
          </span>
          <div className="flex gap-5">
            {page > 1 && <Link href={`/admin/enquiries?page=${page - 1}`}>Previous</Link>}
            {page * 20 < (count || 0) && <Link href={`/admin/enquiries?page=${page + 1}`}>Next</Link>}
          </div>
        </div>
      </section>
    </Workspace>
  );
}
