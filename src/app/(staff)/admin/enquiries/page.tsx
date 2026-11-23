import { Text, DateText } from "@/lib/i18n/workspace-text";
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
      <h1>
        <Text>{"Every question matters."}</Text>
      </h1>
      <p>
        <Text>
          {
            "Contact enquiries are restricted to administrators. Respond through ISG’s approved communication channels."
          }
        </Text>
      </p>
      <section className="workspace-panel">
        <h2>
          <Text>{"Contact inbox"}</Text>
        </h2>
        {error ? (
          <p className="notice notice-error" role="alert">
            <Text>{"The contact inbox could not be loaded."}</Text>
          </p>
        ) : !data?.length ? (
          <div className="empty-state">
            <h3>
              <Text>{"No enquiries yet."}</Text>
            </h3>
            <p>
              <Text>{"Messages submitted through the website will appear here."}</Text>
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <Text>{"From"}</Text>
                  </th>
                  <th>
                    <Text>{"Topic"}</Text>
                  </th>
                  <th>
                    <Text>{"Message"}</Text>
                  </th>
                  <th>
                    <Text>{"Received"}</Text>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      <small>{row.email}</small>
                      {row.whatsapp && (
                        <small>
                          <Text>{"WhatsApp"}</Text> {row.whatsapp}
                        </small>
                      )}
                    </td>
                    <td>{row.topic}</td>
                    <td className="min-w-64 whitespace-pre-wrap">{row.message}</td>
                    <td>{<DateText value={row.created_at} />}</td>
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
            {count || 0} <Text>{"enquiries • Page"}</Text> {page}
          </span>
          <div className="flex gap-5">
            {page > 1 && (
              <Link href={`/admin/enquiries?page=${page - 1}`}>
                <Text>{"Previous"}</Text>
              </Link>
            )}
            {page * 20 < (count || 0) && (
              <Link href={`/admin/enquiries?page=${page + 1}`}>
                <Text>{"Next"}</Text>
              </Link>
            )}
          </div>
        </div>
      </section>
    </Workspace>
  );
}
