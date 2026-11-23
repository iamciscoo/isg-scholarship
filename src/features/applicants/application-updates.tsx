import { Text, DateText } from "@/lib/i18n/workspace-text";
import { fullApplicationStatusLabel, type FullApplicationUpdate } from "@/lib/validation/application-review";

export function applicationDate(value: string) {
  return <DateText value={value} time />;
}

export function ApplicationUpdates({ updates }: { updates: FullApplicationUpdate[] }) {
  if (!updates.length) return null;
  return (
    <section className="workspace-panel" aria-labelledby="application-updates-heading">
      <h2 id="application-updates-heading">
        <Text>{"Latest updates"}</Text>
      </h2>
      <ol className="notification-list">
        {updates.map((update) => (
          <li key={update.id}>
            <h3>
              <Text>{fullApplicationStatusLabel(update.status)}</Text>
            </h3>
            <p className="preserve-lines">{update.note}</p>
            <time dateTime={update.created_at}>{applicationDate(update.created_at)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
