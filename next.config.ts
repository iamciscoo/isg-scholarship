import type { NextConfig } from "next";
import { readdirSync } from "node:fs";

const legacy: Record<string, string> = {
  "index.html": "/",
  "about.html": "/about",
  "apply.html": "/eligibility",
  "matching.html": "/eligibility",
  "scholarships.html": "/pathways",
  "scholarship.html": "/pathways",
  "study-abroad.html": "/pathways",
  "universities.html": "/pathways#campus-life",
  "fellowships.html": "/pathways",
  "grants.html": "/pathways",
  "internships.html": "/pathways",
  "resources.html": "/how-it-works",
  "success-stories.html": "/about",
  "partners.html": "/contact",
  "contact.html": "/contact",
  "dashboard.html": "/dashboard",
  "privacy.html": "/privacy",
  "terms.html": "/terms",
  "disclaimer.html": "/terms",
};
const config: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.app", "*.ngrok.io"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
      allowedOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.app", "*.ngrok.io"],
    },
  },
  async redirects() {
    const photoRedirects = readdirSync("public/images")
      .filter((name) => name.endsWith(".webp"))
      .flatMap((name) =>
        ["jpg", "jpeg", "png"].map((extension) => ({
          source: `/images/${name.replace(/\.webp$/, `.${extension}`)}`,
          destination: `/images/${name}`,
          permanent: true,
        })),
      );
    return [
      ...photoRedirects,
      ...Object.entries(legacy).map(([source, destination]) => ({
        source: `/${source}`,
        destination,
        permanent: true,
      })),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
      {
        // The authenticated file route sets its own frame policy based on file kind.
        source: "/((?!api/case-files/[0-9a-f-]{36}$).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};
export default config;
