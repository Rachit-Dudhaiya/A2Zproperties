import React, { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

const DEFAULT_DESCRIPTION =
  "Verified flats, offices & bungalows for rent in Rajkot: Mavdi, 150 Ft Ring Road, Nana Mava, Race Course. ₹200 site visits. WhatsApp 63533 88626";
const DEFAULT_IMAGE = "https://www.atozproperties.co.in/og-image.jpg";
const BASE_URL = "https://www.atozproperties.co.in";

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_IMAGE,
  noindex = false,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Title
    document.title = title;

    // 2. Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // 3. Canonical
    const fullCanonical = canonical || `${BASE_URL}${window.location.pathname.replace(/\/+$/, "") || "/"}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", fullCanonical);

    // 4. Robots
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!metaRobots) {
        metaRobots = document.createElement("meta");
        metaRobots.setAttribute("name", "robots");
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute("content", "noindex, nofollow");
    } else if (metaRobots) {
      metaRobots.setAttribute("content", "index, follow");
    }

    // 5. OpenGraph & Twitter tags
    const resolvedOgTitle = ogTitle || title;
    const resolvedOgDesc = ogDescription || description;

    const setMeta = (attr: "name" | "property", val: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${val}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, val);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("property", "og:title", resolvedOgTitle);
    setMeta("property", "og:description", resolvedOgDesc);
    setMeta("property", "og:url", fullCanonical);
    setMeta("property", "og:image", ogImage);
    setMeta("name", "twitter:title", resolvedOgTitle);
    setMeta("name", "twitter:description", resolvedOgDesc);
    setMeta("name", "twitter:image", ogImage);

    // 6. JSON-LD structured data (if provided)
    const jsonLdId = "dynamic-seo-jsonld";
    let scriptTag = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = jsonLdId;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = JSON.stringify(jsonLd);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, canonical, ogTitle, ogDescription, ogImage, noindex, jsonLd]);

  return null;
};

export default SEO;
