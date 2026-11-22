import type { MetadataRoute } from "next";

// Block all search-engine crawling while product catalogue is in draft/prototype.
// Flip ALLOW_INDEXING=true in Vercel env when ready to open to search engines.
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING === "true") {
    return {
      rules: { userAgent: "*", allow: "/" },
    };
  }
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
