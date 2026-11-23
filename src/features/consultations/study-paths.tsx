import Image from "next/image";
import Link from "next/link";
import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { programmeFields, programmesPerPage } from "@/config/programme-areas";
import { filterProgrammes, programmeDestinations } from "@/lib/programmes";
import { getPublishedProgrammes } from "@/server/repositories/programmes";
import { studyLevels } from "@/lib/validation/assessment";
import { ProgrammeResultsHeading } from "./programme-results-heading";
import { DestinationSelect } from "./destination-select";

export async function StudyPaths({
  query,
}: {
  query: { level?: string; field?: string; destination?: string; page?: string };
}) {
  const [t, programmes] = await Promise.all([getWorkspaceText(), getPublishedProgrammes()]);
  const level = typeof query.level === "string" ? query.level.slice(0, 80) : "";
  const field = typeof query.field === "string" ? query.field.slice(0, 160) : "";
  const destination = typeof query.destination === "string" ? query.destination.slice(0, 100) : "";
  const destinations = programmeDestinations(programmes);
  const fields = [...new Set([...programmeFields.map((f) => f.value), ...programmes.map((p) => p.field)])];
  const guides = filterProgrammes(programmes, { level, field, destination });
  const pages = Math.max(1, Math.ceil(guides.length / programmesPerPage));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const visible = guides.slice((page - 1) * programmesPerPage, page * programmesPerPage);
  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (field) params.set("field", field);
    if (destination) params.set("destination", destination);
    params.set("page", String(next));
    return `/pathways?${params}#programme-results`;
  };
  return (
    <section className="section container" id="programmes">
      <div className="study-path-heading">
        <h2>
          <Text>Find your study path</Text>
        </h2>
      </div>
      <form
        key={`${level}|${field}|${destination}`}
        id="programme-filters"
        className="study-path-filters"
        action="/pathways#programme-results"
        method="get"
      >
        <label>
          <Text>Study level</Text>
          <select name="level" defaultValue={level}>
            <option value="">{t("All levels")}</option>
            {[
              ...new Set([
                ...studyLevels,
                ...programmes.map((p) => p.study_level),
                ...(level ? [level] : []),
              ]),
            ].map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Text>Academic field</Text>
          <select name="field" defaultValue={field}>
            <option value="">{t("All fields")}</option>
            {[...new Set([...fields, ...(field ? [field] : [])])].map((value) => (
              <option key={value} value={value}>
                {t(programmeFields.find((f) => f.value === value)?.label || value)}
              </option>
            ))}
          </select>
        </label>
        <div className="destination-filter">
          <label htmlFor="programme-destination">
            <Text>Destination interest</Text>
          </label>
          <DestinationSelect
            id="programme-destination"
            name="destination"
            options={[...new Set([...destinations, ...(destination ? [destination] : [])])]}
            defaultValue={destination ? [destination] : []}
          />
        </div>
        <div className="study-path-filter-actions">
          <Link className="text-link" href="/pathways#programme-results">
            <Text>Reset</Text>
          </Link>
          <button type="submit" className="button button-primary">
            <Text>Explore paths</Text>
          </button>
        </div>
      </form>
      <ProgrammeResultsHeading key={`${level}|${field}|${destination}|${page}`} />
      <p className="programme-result-count">
        {guides.length} <Text>programme options</Text>
      </p>
      <div className="study-path-grid">
        {visible.map((p) => (
          <article className="study-path-card" key={p.id}>
            <div className="study-path-photo">
              <Image src={p.image} alt="" fill sizes="(max-width:767px) 100vw,(max-width:1023px) 50vw,33vw" />
            </div>
            <div>
              <span className="eyebrow">{t(p.study_level)}</span>
              <h3>{p.title}</h3>
              {p.funding_type && <p>{t(p.funding_type)}</p>}
              <p>{p.eligibility}</p>
              <Link href="/consultation" className="text-link">
                <Text>Discuss this study path →</Text>
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!guides.length && (
        <p className="programme-empty" role="status">
          <Text>No programmes match these filters.</Text>
        </p>
      )}
      {pages > 1 && (
        <nav className="programme-pagination" aria-label={t("Programme pages")}>
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-link">
              <Text>← Previous</Text>
            </Link>
          ) : (
            <span />
          )}
          <span>
            <Text>Page</Text> {page} <Text>of</Text> {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-link">
              <Text>Next →</Text>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
