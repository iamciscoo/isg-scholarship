import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/about", "/services", "/how-it-works", "/pathways", "/pricing", "/contact", "/faqs", "/privacy", "/terms", "/cookies", "/eligibility"].map(path => ({ url: `${site.url}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : .6 })); }
