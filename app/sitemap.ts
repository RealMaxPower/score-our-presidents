import type { MetadataRoute } from "next";
import { getPresidentSlugs, getSubCriterionNumbers } from "@/lib/queries";
import { SITE_URL } from "@/lib/site-config";

// Render the sitemap at request time, not at build time. It enumerates URLs
// from the database, and the build machine cannot always reach the DB (paused
// Supabase, direct-vs-pooled connection). Generating on demand means:
//   - the build never queries the DB, so a build-time outage can't fail it;
//   - the sitemap is always fully populated, since the runtime server can
//     reach the DB (unlike a build-time static export, which would bake in an
//     empty list during an outage).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Defensive: if the DB is briefly unreachable when a crawler hits this at
  // runtime, emit just the static routes rather than a 500. Mirrors the
  // generateStaticParams guards on /president/[slug] and /sub-criterion/[number].
  let slugs: string[] = [];
  let subNumbers: string[] = [];
  try {
    [slugs, subNumbers] = await Promise.all([
      getPresidentSlugs(),
      getSubCriterionNumbers(),
    ]);
  } catch (e) {
    console.warn(
      "[sitemap] DB unavailable; emitting static routes only.",
      e instanceof Error ? e.message : e
    );
  }

  const now = new Date();
  const url = (path: string) => `${SITE_URL}${path}`;

  return [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: url("/methodology"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...slugs.map((slug) => ({
      url: url(`/president/${slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...subNumbers.map((n) => ({
      url: url(`/sub-criterion/${n}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
