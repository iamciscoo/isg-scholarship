export type Programme = {
  id: string;
  title: string;
  destination: string;
  destinations: string[];
  study_level: string;
  field: string;
  funding_type: string;
  eligibility: string;
  image: string;
  published: boolean;
};
export const programmeDestinations = (rows: Pick<Programme, "destinations">[]) =>
  [...new Set(rows.flatMap((row) => row.destinations))].sort((a, b) => a.localeCompare(b));

export function filterProgrammes(
  rows: Programme[],
  query: { level?: string; field?: string; destination?: string },
) {
  return rows.filter(
    (p) =>
      (!query.level || p.study_level === query.level) &&
      (!query.field || p.field === query.field) &&
      (!query.destination || p.destinations.includes(query.destination)),
  );
}
