export const meetingSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
] as const;
export const meetingZones = [
  "Africa/Dar_es_Salaam",
  "Africa/Nairobi",
  "Africa/Kampala",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "America/New_York",
] as const;
export const meetingTopics = [
  "Scholarship options",
  "Application review",
  "Package and payment",
  "Visa and travel",
  "Other",
] as const;
export function meetingRequestNote(
  date: string,
  time: string,
  zone: string,
  topic: string,
  details?: string,
) {
  return `Preferred ${date} at ${time} (${zone}) · ${topic}${details ? ` · ${details}` : ""}`;
}