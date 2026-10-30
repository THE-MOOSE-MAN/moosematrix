import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: "https://moosematrix.com",         lastModified: now, changeFrequency: "weekly",  priority: 1   },
    { url: "https://moosematrix.com/research", lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: "https://moosematrix.com/builds",  lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: "https://moosematrix.com/library", lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: "https://moosematrix.com/lab",     lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: "https://moosematrix.com/search",  lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: "https://moosematrix.com/about",   lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: "https://moosematrix.com/contact", lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
