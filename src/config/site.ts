export const site = {
  name: "International Scholarship Gateway",
  shortName: "ISG",
  email: "hello@isgscholarship.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
// Public origin the request arrived on. Local jobs reach the app directly, so they keep the configured URL.
export function requestOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (!host) return site.url;
  return `${headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"}://${host}`;
}
export const navigation = [
  { href: "/about", label: "About ISG" },
  { href: "/services", label: "Our services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pathways", label: "Study pathways" },
];
