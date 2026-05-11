import type { MetadataRoute } from 'next';

// Secondary site — closed from indexing. Sitemap intentionally empty.
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
