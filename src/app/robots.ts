import type { MetadataRoute } from "next";
import { site } from "@/config/site";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/advisor", "/api/", "/auth/", "/login", "/register", "/forgot-password", "/reset-password", "/mfa"] }, sitemap: `${site.url}/sitemap.xml` }; }
