export const site = {
  name: "International Scholarship Gateway",
  shortName: "ISG",
  email: "support@isgscholarship.org",
  whatsapp: "https://wa.me/79282120121",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
// Links in outbound messages must point at the public site, never at a tunnel or preview host the request arrived on.
export const publicUrl = process.env.PUBLIC_APP_URL || site.url;
export const navigation = [
  { href: "/about", label: "About ISG" },
  { href: "/services", label: "Our services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pathways", label: "Study pathways" },
];
