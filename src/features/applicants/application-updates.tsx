import { fullApplicationStatusLabel, type FullApplicationUpdate } from "@/lib/validation/application-review";

export function applicationDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(value));
}

export function ApplicationUpdates({ updates }: { updates: FullApplicationUpdate[] }) {
  if (!updates.length) return null;
  return (
    <section className="workspace-panel" aria-labelledby="application-updates-heading">
      <h2 id="application-updates-heading">Latest updates</h2>
      <ol className="notification-list">
        {updates.map((update) => (
          <li key={update.id}>
            <h3>{fullApplicationStatusLabel(update.status)}</h3>
            <p className="preserve-lines">{update.note}</p>
            <time dateTime={update.created_at}>{applicationDate(update.created_at)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
