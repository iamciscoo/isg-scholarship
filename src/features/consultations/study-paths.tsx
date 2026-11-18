import Image from "next/image";
import Link from "next/link";
import { programmeAreas } from "@/config/programme-areas";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
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
  query: { level?: string; field?: string; destination?: string };
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
  return (
    <section className="section container" id="programmes">
      <div className="study-path-heading">
        <div>
          <span className="eyebrow">Start with your interests</span>
          <h2>Find a direction worth exploring.</h2>
          <p>
            Browse programme areas, then get personal guidance on destinations, requirements and funding.
            These guides introduce study options; they are not offers of admission or confirmed scholarship
            listings.
          </p>
        </div>
      </div>
      <form className="study-path-filters">
        <label>
          Study level
          <select name="level" defaultValue={level}>
            <option value="">All study levels</option>
            {["Undergraduate", "Master's", "PhD / Research"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Academic field
          <select name="field" defaultValue={field}>
            <option value="">All fields</option>
            {["Engineering", "Business", "Health", "Research"].map((v) => (
              <option key={v}>{v}</option>
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
        <Link className="text-link" href="/pathways">
          Reset
        </Link>
      </form>
      {destination && (
        <p className="notice">
          Interested in {destination}? Your advisor will confirm suitable institutions and current
          requirements. Programme-area guides below are general; destination-specific promotions appear only
          when reviewed and published by ISG.
        </p>
      )}
      <div className="study-path-grid">
        {guides.map((p) => (
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
      {!guides.length && (
        <p>No programme guide matches these filters. Try another field or ask an advisor.</p>
      )}
      {!!promotions.length && (
        <>
          <h2 className="mt-10">Destinations and funding to explore</h2>
          <div className="study-path-grid">
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
