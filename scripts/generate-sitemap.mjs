// Dynamic Sitemap Generator for atozproperties.co.in
// Automatically creates/refreshes public/sitemap.xml with all static pages, 
// 16 landing pages, and live Firestore properties.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.atozproperties.co.in";
const TODAY = new Date().toISOString().split("T")[0];

const STATIC_ROUTES = [
  { path: "", changefreq: "daily", priority: "1.0" },
  { path: "/properties", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/inquiry", changefreq: "monthly", priority: "0.8" },
];

const LANDING_PAGES = [
  "/flats-for-rent-rajkot",
  "/2-bhk-flat-for-rent-rajkot",
  "/3-bhk-flat-for-rent-rajkot",
  "/furnished-flat-for-rent-rajkot",
  "/office-for-rent-rajkot",
  "/shop-for-rent-rajkot",
  "/bungalow-for-rent-rajkot",
  "/rent-mavdi",
  "/rent-150-feet-ring-road",
  "/rent-goverdhan-chowk",
  "/rent-nana-mava",
  "/rent-race-course",
  "/rent-kalawad-road",
  "/rent-university-road",
  "/rent-raiya-road",
  "/rent-amin-marg",
];

async function fetchFirestoreProperties() {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/atozproperties-5ab23/databases/(default)/documents/properties");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.documents && Array.isArray(data.documents)) {
      return data.documents.map((doc) => {
        const id = doc.name.split("/").pop();
        const updateTime = doc.updateTime ? doc.updateTime.split("T")[0] : TODAY;
        return { id, lastmod: updateTime };
      });
    }
  } catch (err) {
    console.warn("Could not query Firestore REST API (network or offline), keeping existing property list:", err.message);
  }
  return [];
}

async function generate() {
  const properties = await fetchFirestoreProperties();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static routes
  for (const r of STATIC_ROUTES) {
    xml += `  <url>\n    <loc>${BASE_URL}${r.path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>\n`;
  }

  // 16 Landing pages
  for (const p of LANDING_PAGES) {
    xml += `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  }

  // Properties
  for (const prop of properties) {
    xml += `  <url>\n    <loc>${BASE_URL}/property/${prop.id}</loc>\n    <lastmod>${prop.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  xml += `</urlset>\n`;

  const outPath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  console.log(`Generated sitemap with ${STATIC_ROUTES.length + LANDING_PAGES.length + properties.length} URLs at ${outPath}`);
}

generate();
