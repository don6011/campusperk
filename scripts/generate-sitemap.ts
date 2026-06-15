// Runs before vite dev and vite build; writes public/sitemap.xml
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://campusperk.com";
const GENERATE_DYNAMIC_SITEMAP = process.env.GENERATE_DYNAMIC_SITEMAP === "true";

const SUPABASE_URL = "https://jttcpewdibbczdnutmme.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dGNwZXdkaWJiY3pkbnV0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI3MTgsImV4cCI6MjA4NjkyODcxOH0.AEMRbIWP4pR86Ov24R1k_Bx3JYa7WCrwX0OUBrU40xw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/partners", changefreq: "monthly", priority: "0.6" },
  { path: "/partners/apply", changefreq: "monthly", priority: "0.6" },
  { path: "/partners/request", changefreq: "monthly", priority: "0.6" },
  { path: "/waitlist", changefreq: "monthly", priority: "0.8" },
  { path: "/privacy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms", changefreq: "monthly", priority: "0.4" },
  { path: "/sign-in", changefreq: "monthly", priority: "0.5" },
  { path: "/sign-up", changefreq: "monthly", priority: "0.5" },
  { path: "/join", changefreq: "monthly", priority: "0.5" },
  { path: "/forgot-password", changefreq: "monthly", priority: "0.3" },
  { path: "/reset-password", changefreq: "monthly", priority: "0.3" },
];

async function fetchDynamicEntries(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  // Active deals → /deals/:id and /go/:id
  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, updated_at")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (dealsError) {
    console.warn("Failed to fetch deals for sitemap:", dealsError.message);
  } else if (deals) {
    for (const deal of deals) {
      const lastmod = deal.updated_at ? deal.updated_at.split("T")[0] : undefined;
      entries.push({
        path: `/deals/${deal.id}`,
        changefreq: "weekly",
        priority: "0.6",
        lastmod,
      });
      entries.push({
        path: `/go/${deal.id}`,
        changefreq: "weekly",
        priority: "0.4",
        lastmod,
      });
    }
  }

  // Categories → /categories/:slug
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("slug, updated_at")
    .order("display_order", { ascending: true });

  if (catError) {
    console.warn("Failed to fetch categories for sitemap:", catError.message);
  } else if (categories) {
    for (const cat of categories) {
      const lastmod = cat.updated_at ? cat.updated_at.split("T")[0] : undefined;
      entries.push({
        path: `/categories/${cat.slug}`,
        changefreq: "weekly",
        priority: "0.5",
        lastmod,
      });
    }
  }

  return entries;
}

function generateSitemap(entries: SitemapEntry[]) {
  const today = new Date().toISOString().split("T")[0];

  const urls = entries.map((e) => {
    const lines = [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : `    <lastmod>${today}</lastmod>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ];
    return lines.filter((l) => l !== null).join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const dynamicEntries = GENERATE_DYNAMIC_SITEMAP ? await fetchDynamicEntries() : [];
  const allEntries = [...staticEntries, ...dynamicEntries];
  const xml = generateSitemap(allEntries);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(
    `sitemap.xml written with ${allEntries.length} entries (${staticEntries.length} static, ${dynamicEntries.length} dynamic${
      GENERATE_DYNAMIC_SITEMAP ? "" : "; set GENERATE_DYNAMIC_SITEMAP=true to fetch live entries"
    })`,
  );
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(1);
});
