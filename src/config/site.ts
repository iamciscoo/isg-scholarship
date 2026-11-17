export const site = {
  name: "International Scholarship Gateway",
  shortName: "ISG",
  email: "hello@isgscholarship.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};
export const navigation = [
  { href: "/about", label: "About ISG" },
  { href: "/services", label: "Our services" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pathways", label: "Study pathways" },
];
