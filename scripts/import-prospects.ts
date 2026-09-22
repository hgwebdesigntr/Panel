import "dotenv/config";
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";

interface BusinessRow {
  googlePlaceId: string;
  name: string;
  province: string;
  district: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  photoCount: number;
  hasOpeningHours: boolean;
  primaryType: string | null;
}

interface AuditRow {
  name: string;
  url?: string;
  siteHealthScore: number;
  sslOk?: boolean;
  lighthouseScores?: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
    lcp: string | null;
    cls: string | null;
    tbt: string | null;
  };
  seoBasics?: {
    hasTitle?: boolean;
    hasMetaDescription?: boolean;
    h1Count?: number;
    hasSchema?: boolean;
    isWordPress?: boolean;
    hasRobotsTxt?: boolean;
    hasSitemap?: boolean;
  };
  error?: string;
}

async function main() {
  const [businessesPath, auditsPath] = process.argv.slice(2);
  if (!businessesPath) {
    console.error("Kullanım: npx tsx scripts/import-prospects.ts <businesses.json> [audits.json]");
    process.exit(1);
  }

  const businesses: BusinessRow[] = JSON.parse(await readFile(businessesPath, "utf-8"));
  const prospectIdByWebsite = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const b of businesses) {
    if (!b.googlePlaceId) continue;

    const existing = await prisma.prospect.findUnique({ where: { googlePlaceId: b.googlePlaceId } });

    const data = {
      name: b.name,
      category: b.primaryType,
      province: b.province,
      district: b.district,
      address: b.address,
      phone: b.phone,
      website: b.website,
      googleMapsUrl: b.googleMapsUrl,
      rating: b.rating,
      reviewCount: b.reviewCount,
      photoCount: b.photoCount,
      hasOpeningHours: b.hasOpeningHours,
    };

    const prospect = await prisma.prospect.upsert({
      where: { googlePlaceId: b.googlePlaceId },
      create: { googlePlaceId: b.googlePlaceId, ...data },
      update: data,
    });

    existing ? updated++ : created++;
    if (b.website) prospectIdByWebsite.set(b.website, prospect.id);
  }

  console.log(`İşletmeler: ${created} yeni, ${updated} güncellendi.`);

  if (auditsPath) {
    const audits: AuditRow[] = JSON.parse(await readFile(auditsPath, "utf-8"));
    let auditCount = 0;
    let skipped = 0;

    for (const a of audits) {
      const prospectId = a.url ? prospectIdByWebsite.get(a.url) : undefined;
      if (!prospectId) {
        skipped++;
        continue;
      }

      await prisma.prospectAudit.create({
        data: {
          prospectId,
          siteHealthScore: a.siteHealthScore,
          sslOk: a.sslOk ?? false,
          performanceScore: a.lighthouseScores?.performance ?? null,
          accessibilityScore: a.lighthouseScores?.accessibility ?? null,
          bestPracticesScore: a.lighthouseScores?.bestPractices ?? null,
          seoScore: a.lighthouseScores?.seo ?? null,
          lcp: a.lighthouseScores?.lcp ?? null,
          cls: a.lighthouseScores?.cls ?? null,
          tbt: a.lighthouseScores?.tbt ?? null,
          hasTitle: a.seoBasics?.hasTitle ?? false,
          hasMetaDescription: a.seoBasics?.hasMetaDescription ?? false,
          h1Count: a.seoBasics?.h1Count ?? null,
          hasSchema: a.seoBasics?.hasSchema ?? false,
          isWordPress: a.seoBasics?.isWordPress ?? false,
          hasRobotsTxt: a.seoBasics?.hasRobotsTxt ?? false,
          hasSitemap: a.seoBasics?.hasSitemap ?? false,
          error: a.error ?? null,
        },
      });
      auditCount++;
    }

    console.log(`Denetimler: ${auditCount} kaydedildi, ${skipped} eşleşmeyen (website bulunamadı) atlandı.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
