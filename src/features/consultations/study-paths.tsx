import Image from "next/image";
import Link from "next/link";
import { programmeAreas, programmeFields, programmesPerPage } from "@/config/programme-areas";
import { studyLevels } from "@/lib/validation/assessment";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
import { ProgrammeResultsHeading } from "./programme-results-heading";
type Promotion = {
  id: string;
  title: string;
  destination: string;
  study_level: string;
  field: string;
  funding_type: string;
  eligibility: string;
  image: string;
};
export async function StudyPaths({
  query,
}: {
  query: { level?: string; field?: string; destination?: string; page?: string };
}) {
  const level = programmeAreas.some((p) => p.level === query.level) ? query.level || "" : "";
  const field = programmeAreas.some((p) => p.field === query.field) ? query.field || "" : "";
  const destination = (typeof query.destination === "string" ? query.destination : "").slice(0, 100);
  let promotions: Promotion[] = [];
  if (authConfigured()) {
    const db = await createClient();
    let request = db
      .from("study_promotions")
      .select("id,title,destination,study_level,field,funding_type,eligibility,image")
      .eq("published", true)
      .order("updated_at", { ascending: false });
    if (level) request = request.eq("study_level", level);
    if (field) request = request.eq("field", field);
    if (destination) request = request.ilike("destination", destination.replace(/[%_]/g, ""));
    const { data, error } = await request;
    if (error) throw Error("Study paths unavailable");
    promotions = data || [];
  }
  const guides = programmeAreas.filter((p) => (!level || p.level === level) && (!field || p.field === field));
  const pages = Math.max(1, Math.ceil(guides.length / programmesPerPage));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const visibleGuides = guides.slice((page - 1) * programmesPerPage, page * programmesPerPage);
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
        <div>
          <span className="eyebrow">Start with your interests</span>
          <h2>Find a direction worth exploring.</h2>
        </div>
      </div>
      <form
        key={`${level}|${field}|${destination}`}
        id="programme-filters"
        className="study-path-filters"
        action="/pathways#programme-results"
        method="get"
      >
        <label>
          Study level
          <select name="level" defaultValue={level}>
            <option value="">All study levels</option>
            {studyLevels.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Academic field
          <select name="field" defaultValue={field}>
            <option value="">All fields</option>
            {programmeFields.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Destination interest
          <input
            name="destination"
            defaultValue={destination}
            maxLength={100}
            placeholder="Any destination"
          />
        </label>
        <button type="submit" className="button button-primary">
          Explore paths
        </button>
        <Link className="text-link" href="/pathways#programme-results">
          Reset
        </Link>
      </form>
      <ProgrammeResultsHeading key={`${level}|${field}|${destination}|${page}`} />
      <p className="programme-result-count">
        {guides.length} programme guides{level ? ` · ${level}` : ""}
        {field ? ` · ${programmeFields.find((f) => f.value === field)?.label || field}` : ""}. The same guide
        range is available for every destination.
      </p>
      {destination && (
        <p className="notice">
          Exploring {destination}? These are general study interests, not confirmed offers. Your advisor will
          check which institutions, courses and requirements match your profile.
        </p>
      )}
      <p className="mobile-swipe-hint">Swipe to explore study paths →</p>
      <div className="study-path-grid" tabIndex={0} aria-label="Study paths">
        {visibleGuides.map((p) => (
          <article className="study-path-card" key={p.title}>
            <div className="study-path-photo">
              <Image
                src={p.image}
                alt="Students and campus environments illustrating international study"
                fill
                sizes="(max-width:767px) 100vw,(max-width:1023px) 50vw,33vw"
              />
            </div>
            <div>
              <span className="eyebrow">{p.level}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <Link href="/consultation" className="text-link">
                Discuss this study path →
              </Link>
            </div>
          </article>
        ))}
      </div>
      {pages > 1 && (
        <nav className="programme-pagination" aria-label="Programme pages">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-link">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {pages} · {Math.min((page - 1) * programmesPerPage + 1, guides.length)}–
            {Math.min(page * programmesPerPage, guides.length)} of {guides.length}
          </span>
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-link">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      {!guides.length && (
        <p>No programme guide matches these filters. Try another field or ask an advisor.</p>
      )}
      {!!promotions.length && (
        <>
          <h2 className="mt-10">Destinations and funding to explore</h2>
          <p className="mobile-swipe-hint">Swipe to explore study paths →</p>
          <div className="study-path-grid" tabIndex={0} aria-label="Study paths">
            {promotions.map((p) => (
              <article className="study-path-card" key={p.id}>
                <div className="study-path-photo">
                  <Image
                    src={p.image}
                    alt={`${p.destination} study pathway illustration`}
                    fill
                    sizes="(max-width:767px) 100vw,33vw"
                  />
                </div>
                <div>
                  <span className="eyebrow">
                    {p.destination} · {p.study_level}
                  </span>
                  <h3>{p.title}</h3>
                  <p>
                    {p.field} · {p.funding_type}
                  </p>
                  <p>{p.eligibility}</p>
                  <Link href="/consultation" className="text-link">
                    Start a private consultation →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
