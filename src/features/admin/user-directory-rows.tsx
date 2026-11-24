import Link from "next/link";
import { Text } from "@/lib/i18n/workspace-text";
import { NavigableRow } from "@/components/layout/navigable-row";
import { UserRoleMenu } from "@/features/admin/user-role-menu";
export type DirectoryUser = {
  id: string;
  number: number;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string;
  location: string;
  caseHref?: string;
  reference?: string;
  applications: number;
  joined: string;
  lastSignIn: string;
};
export function UserDirectoryRows({ users }: { users: DirectoryUser[] }) {
  return (
    <>
      <div className="table-scroll desktop-case-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "User",
                "Role",
                "Status",
                "Contact",
                "Consultation",
                "Applications",
                "Joined",
                "Last sign-in",
                "",
              ].map((label, i) => (
                <th scope="col" key={i}>
                  <Text>{label}</Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <NavigableRow key={user.id} href={`/admin/users/${user.id}`}>
                <td>{user.number}</td>
                <td>
                  <Link className="text-link" href={`/admin/users/${user.id}`}>
                    {user.name || <Text>Unnamed account</Text>}
                  </Link>
                  <small>{user.email}</small>
                </td>
                <td className="capitalize">
                  <Text>{user.role}</Text>
                </td>
                <td>
                  <Text>{user.status}</Text>
                </td>
                <td>
                  {user.phone || <Text>No phone</Text>}
                  <small>{user.location}</small>
                </td>
                <td>
                  {user.caseHref ? (
                    <Link className="text-link" href={user.caseHref}>
                      {user.reference || <Text>Open case</Text>}
                    </Link>
                  ) : (
                    <Text>None</Text>
                  )}
                </td>
                <td>{user.applications}</td>
                <td>{user.joined}</td>
                <td>{user.lastSignIn}</td>
                <td>
                  <UserRoleMenu id={user.id} role={user.role} />
                </td>
              </NavigableRow>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="mobile-case-list user-directory-cards">
        {users.map((user) => (
          <li className="user-directory-card" key={user.id}>
            <div className="case-card-top">
              <span className="case-number">{user.number}</span>
              <span className="status-pill">
                <Text>{user.role}</Text>
              </span>
              <UserRoleMenu id={user.id} role={user.role} />
            </div>
            <h2>
              <Link className="user-directory-card-link" href={`/admin/users/${user.id}`}>
                {user.name || <Text>Unnamed account</Text>} <span aria-hidden>→</span>
              </Link>
            </h2>
            <p className="case-email">{user.email}</p>
            <p>
              {user.phone || <Text>No phone</Text>}
              {user.location ? ` · ${user.location}` : ""}
            </p>
            <dl className="case-card-progress">
              <div>
                <dt>
                  <Text>Consultation</Text>
                </dt>
                <dd>
                  {user.caseHref ? (
                    <Link href={user.caseHref}>{user.reference || <Text>Open case</Text>}</Link>
                  ) : (
                    <Text>None</Text>
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  <Text>Applications</Text>
                </dt>
                <dd>{user.applications}</dd>
              </div>
            </dl>
            <p className="case-card-meta">
              <span>
                <Text>Joined</Text> {user.joined}
              </span>
              <span>
                <Text>{user.status}</Text>
              </span>
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}
