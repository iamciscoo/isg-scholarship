import { programmeGroups } from "./programme-groups";
const levels = [
  {
    key: "undergraduate",
    level: "Undergraduate",
    guidance: "Your advisor will check entry subjects, language requirements and suitable course structures.",
  },
  {
    key: "masters",
    level: "Master's",
    guidance: "Your advisor will review your first degree, relevant experience and specialisation interests.",
  },
  {
    key: "research",
    level: "PhD / Research",
    guidance: "Discuss research preparation, a potential topic and supervisor fit with your advisor.",
  },
] as const;
// One shared editorial catalogue for all countries. Provider availability is confirmed privately.
export const programmeAreas = levels.flatMap((level) =>
  [0, 1].flatMap((index) =>
    programmeGroups.map((group) => ({
      title: group[level.key][index],
      level: level.level,
      field: group.field,
      image: group.image,
      text: `${group.focus} ${level.guidance}`,
    })),
  ),
);
export const programmeFields = programmeGroups.map(({ field, label }) => ({ value: field, label }));
export const programmesPerPage = 12;
