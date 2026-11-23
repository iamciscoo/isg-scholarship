import Link from "next/link";
import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { leadStages, stageLabel } from "@/lib/validation/leads";
import { studyLevels } from "@/lib/validation/assessment";
import type { Advisor } from "./types";
export type LeadQuery = {
  stage?: string;
  level?: string;
  page?: string;
  advisor?: string;
  from?: string;
  to?: string;
};

export async function LeadFilters({
  query,
  path,
  advisors,
  admin,
}: {
  query: LeadQuery;
  path: string;
  advisors: Advisor[];
  admin: boolean;
}) {
  const t = await getWorkspaceText();
  const advanced = [query.advisor, query.from, query.to].filter(Boolean).length;
  return (
    <form className="case-filters" action={path}>
      <div className="filter-primary">
        <div className="field">
          <label htmlFor="filter-stage">
            <Text>Stage</Text>
          </label>
          <select name="stage" id="filter-stage" defaultValue={query.stage || ""}>
            <option value="">{t("All stages")}</option>
            {leadStages.map((stage) => (
              <option key={stage} value={stage}>
                {t(stageLabel(stage))}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-level">
            <Text>Study level</Text>
          </label>
          <select name="level" id="filter-level" defaultValue={query.level || ""}>
            <option value="">{t("All levels")}</option>
            {studyLevels.map((level) => (
              <option key={level} value={level}>
                {t(level)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <details className="filter-extra" open={advanced > 0}>
        <summary>
          <Text>More filters</Text>
          {advanced ? ` (${advanced})` : ""}
        </summary>
        <div className="filter-secondary">
          {admin && (
            <div className="field filter-advisor">
              <label htmlFor="filter-advisor">
                <Text>Advisor</Text>
              </label>
              <select name="advisor" id="filter-advisor" defaultValue={query.advisor || ""}>
                <option value="">{t("All advisors")}</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.first_name} ${a.last_name}`.trim() || a.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="from">
              <Text>Received from</Text> (UTC)
            </label>
            <input type="date" name="from" id="from" defaultValue={query.from} />
          </div>
          <div className="field">
            <label htmlFor="to">
              <Text>To</Text> (UTC)
            </label>
            <input type="date" name="to" id="to" defaultValue={query.to} />
          </div>
        </div>
      </details>
      <div className="filter-actions">
        <Link className="text-link" href={path}>
          <Text>Reset</Text>
        </Link>
        <Button size="sm">
          <Text>Apply filters</Text>
        </Button>
      </div>
    </form>
  );
}
