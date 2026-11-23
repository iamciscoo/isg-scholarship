import type { AccountNotification } from "./types";

const statuses = new Set([
  "Starting",
  "Submitted",
  "Pending verification",
  "Verified",
  "Rejected",
  "Approved",
  "Declined",
  "Pending review",
  "Package assigned",
  "In review",
  "Information requested",
  "Applying",
  "Waiting",
  "Accepted",
  "Completed",
  "Cancelled",
  "Under Review",
  "Payment needed",
]);

export function notificationCopy(item: AccountNotification, translate: (source: string) => string) {
  if (!item.is_system) return { title: item.title, body: item.body };
  const parts = item.body.split(" · ");
  // Staff alerts start with an applicant's name and reference. Never translate names or filenames.
  const statusIndex = item.link.startsWith("/admin/") && /^ISG-[A-F0-9]+$/i.test(parts[1] || "") ? 2 : 0;
  if (statuses.has(parts[statusIndex])) parts[statusIndex] = translate(parts[statusIndex]);
  return { title: translate(item.title), body: parts.length > 1 ? parts.join(" · ") : translate(item.body) };
}
