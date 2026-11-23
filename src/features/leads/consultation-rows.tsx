import Link from "next/link";
import { Text } from "@/lib/i18n/workspace-text";
import { NavigableRow } from "@/components/layout/navigable-row";
export type ConsultationRow = {
  id: string;
  href: string;
  number: number;
  name: string;
  email: string;
  reference: string;
  level: string;
  consultation: string;
  receipt: string;
  application: string;
  received: string;
};
export function ConsultationRows({ rows }: { rows: ConsultationRow[] }) {
  return (
    <>
      <div className="table-scroll desktop-case-table">
        <table>
          <thead>
            <tr>
              {[
                "#",
                "Applicant",
                "Reference",
                "Study goal",
                "Consultation",
                "Receipt",
                "Application",
                "Received",
              ].map((label) => (
                <th scope="col" key={label}>
                  <Text>{label}</Text>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <NavigableRow key={row.id} href={row.href}>
                <td>{row.number}</td>
                <td>
                  <Link href={row.href}>{row.name}</Link>
                  <small>{row.email}</small>
                </td>
                <td className="case-reference">{row.reference}</td>
                <td>
                  <Text>{row.level}</Text>
                </td>
                <td>
                  <span className="badge">
                    <Text>{row.consultation}</Text>
                  </span>
                </td>
                <td>
                  <Text>{row.receipt}</Text>
                </td>
                <td>
                  <Text>{row.application}</Text>
                </td>
                <td>{row.received}</td>
              </NavigableRow>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="mobile-case-list">
        {rows.map((row) => (
          <li key={row.id}>
            <Link className="case-list-card" href={row.href}>
              <div className="case-card-top">
                <span className="case-number">{row.number}</span>
                <span className="status-pill">
                  <Text>{row.consultation}</Text>
                </span>
                <span aria-hidden>→</span>
              </div>
              <h2>{row.name}</h2>
              <p className="case-email">{row.email}</p>
              <p className="case-card-meta">
                <span>
                  <Text>{row.level}</Text>
                </span>
                <time>{row.received}</time>
              </p>
              <span className="case-reference">{row.reference}</span>
              <dl className="case-card-progress">
                <div>
                  <dt>
                    <Text>Receipt</Text>
                  </dt>
                  <dd>
                    <Text>{row.receipt}</Text>
                  </dd>
                </div>
                <div>
                  <dt>
                    <Text>Application</Text>
                  </dt>
                  <dd>
                    <Text>{row.application}</Text>
                  </dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
