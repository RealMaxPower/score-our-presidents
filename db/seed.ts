// Score Our Presidents — Database Seed Script
// Loads Phase 1 scoring data into Postgres via Prisma
//
// Usage:
//   npm install -D ts-node @types/node yaml
//   npx prisma db seed
//
// Or directly:
//   npx ts-node db/seed.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { LENS_PRESETS } from '../lib/lens-presets';

const prisma = new PrismaClient();

// ============================================================
// Reference data — categories and weights (v1.2 + Workstream C v1.3 revisions)
// ============================================================

const CATEGORIES = [
  { number: 1, name: 'Economic outcomes', defaultWeight: 9, source: 'published_methodology' },
  { number: 2, name: 'Foreign policy & war', defaultWeight: 11, source: 'published_methodology' },
  { number: 3, name: 'Civil rights & equality', defaultWeight: 9, source: 'published_methodology' },
  { number: 4, name: 'Civil liberties & rule of law', defaultWeight: 8, source: 'published_methodology' },
  { number: 5, name: 'Domestic welfare & health', defaultWeight: 9, source: 'published_methodology' },
  { number: 6, name: 'Environmental stewardship', defaultWeight: 6, source: 'published_methodology' },
  { number: 7, name: 'Crisis management', defaultWeight: 9, source: 'published_methodology' },
  { number: 8, name: 'Institutional integrity', defaultWeight: 8, source: 'published_methodology', revisionNote: 'v1.3: 7% → 8% per Workstream C' },
  { number: 9, name: 'Democratic health', defaultWeight: 8, source: 'published_methodology' },
  { number: 10, name: 'Long-tail consequences', defaultWeight: 7, source: 'published_methodology' },
  { number: 11, name: 'Decorum & conduct', defaultWeight: 4, source: 'published_methodology' },
  { number: 12, name: 'Effect on populace', defaultWeight: 6, source: 'published_methodology' },
  { number: 13, name: 'Immigration & demographics', defaultWeight: 6, source: 'cowork_derived', revisionNote: 'v1.3: 7% → 6% per Workstream C' },
];

// Verify default sums to 100
const defaultSum = CATEGORIES.reduce((s, c) => s + c.defaultWeight, 0);
if (defaultSum !== 100) throw new Error(`Default weights sum to ${defaultSum}, not 100`);

const SUB_CRITERIA = [
  // Cat 1
  { number: '1.1', categoryNumber: 1, name: 'Growth & employment' },
  { number: '1.2', categoryNumber: 1, name: 'Inequality & mobility' },
  { number: '1.3', categoryNumber: 1, name: 'Fiscal trajectory' },
  { number: '1.4', categoryNumber: 1, name: 'Worker conditions & wages' },
  // Cat 2
  { number: '2.1', categoryNumber: 2, name: 'War & peace decisions' },
  { number: '2.2', categoryNumber: 2, name: 'Alliance management' },
  { number: '2.3', categoryNumber: 2, name: 'Diplomacy & soft power' },
  { number: '2.4', categoryNumber: 2, name: 'Civilian impact' },
  // Cat 3 (v1.2 added 3.5)
  { number: '3.1', categoryNumber: 3, name: 'Racial equity' },
  { number: '3.2', categoryNumber: 3, name: 'Gender equity' },
  { number: '3.3', categoryNumber: 3, name: 'LGBTQ+ rights' },
  { number: '3.4', categoryNumber: 3, name: 'Disability & other protected classes' },
  { number: '3.5', categoryNumber: 3, name: 'Tribal & indigenous policy' },
  // Cat 4
  { number: '4.1', categoryNumber: 4, name: 'Speech & press posture' },
  { number: '4.2', categoryNumber: 4, name: 'Search, seizure, and surveillance' },
  { number: '4.3', categoryNumber: 4, name: 'Executive restraint' },
  { number: '4.4', categoryNumber: 4, name: 'Transparency & FOIA' },
  // Cat 5
  { number: '5.1', categoryNumber: 5, name: 'Healthcare access & outcomes' },
  { number: '5.2', categoryNumber: 5, name: 'Education' },
  { number: '5.3', categoryNumber: 5, name: 'Safety net' },
  { number: '5.4', categoryNumber: 5, name: 'Housing & cost of living' },
  // Cat 6
  { number: '6.1', categoryNumber: 6, name: 'Climate posture' },
  { number: '6.2', categoryNumber: 6, name: 'Air & water regulation' },
  { number: '6.3', categoryNumber: 6, name: 'Public lands & conservation' },
  { number: '6.4', categoryNumber: 6, name: 'Biodiversity & wildlife' },
  // Cat 7
  { number: '7.1', categoryNumber: 7, name: 'Speed of response' },
  { number: '7.2', categoryNumber: 7, name: 'Effectiveness of action' },
  { number: '7.3', categoryNumber: 7, name: 'Honesty with the public during crisis' },
  { number: '7.4', categoryNumber: 7, name: 'Long-term resolution of the crisis' },
  // Cat 8 (v1.2 split 8.4 into 8.4-8.7)
  { number: '8.1', categoryNumber: 8, name: 'Personal ethics & conduct in office' },
  { number: '8.2', categoryNumber: 8, name: 'Administration ethics' },
  { number: '8.3', categoryNumber: 8, name: 'Norm adherence' },
  { number: '8.4', categoryNumber: 8, name: 'Judicial appointment quality' },
  { number: '8.5', categoryNumber: 8, name: 'Judicial appointment selection ethics' },
  { number: '8.6', categoryNumber: 8, name: 'Judicial activism vs. restraint posture' },
  { number: '8.7', categoryNumber: 8, name: 'Confirmation-process conduct' },
  // Cat 9
  { number: '9.1', categoryNumber: 9, name: 'Voting access' },
  { number: '9.2', categoryNumber: 9, name: 'Press relationship' },
  { number: '9.3', categoryNumber: 9, name: 'Political violence' },
  { number: '9.4', categoryNumber: 9, name: 'Polarization contribution' },
  // Cat 10
  { number: '10.1', categoryNumber: 10, name: 'Policy durability' },
  { number: '10.2', categoryNumber: 10, name: 'Institutional damage that persisted' },
  { number: '10.3', categoryNumber: 10, name: 'Generational & demographic impact' },
  { number: '10.4', categoryNumber: 10, name: 'Geopolitical aftermath' },
  // Cat 11
  { number: '11.1', categoryNumber: 11, name: 'Dignity of office' },
  { number: '11.2', categoryNumber: 11, name: 'Rhetoric & tone' },
  { number: '11.3', categoryNumber: 11, name: 'Respect for tradition & ceremony' },
  { number: '11.4', categoryNumber: 11, name: 'Model behavior' },
  // Cat 12
  { number: '12.1', categoryNumber: 12, name: 'Domestic morale & national mood' },
  { number: '12.2', categoryNumber: 12, name: 'Social cohesion vs. division' },
  { number: '12.3', categoryNumber: 12, name: 'International standing' },
  { number: '12.4', categoryNumber: 12, name: 'Foreign public sentiment' },
  // Cat 13 (new in v1.2)
  { number: '13.1', categoryNumber: 13, name: 'Legal immigration policy' },
  { number: '13.2', categoryNumber: 13, name: 'Enforcement & treatment of unauthorized migrants' },
  { number: '13.3', categoryNumber: 13, name: 'Refugee & asylum policy' },
  { number: '13.4', categoryNumber: 13, name: 'Demographic and labor-market impact' },
];

// 9 lens preset weight vectors are imported from lib/lens-presets.ts (v1.3 weights).
// Sum-to-100 validation runs at import time inside that module.

const PRESIDENT_SLUGS = [
  'franklin_d_roosevelt', 'harry_s_truman', 'dwight_d_eisenhower', 'john_f_kennedy',
  'lyndon_b_johnson', 'richard_nixon', 'gerald_ford', 'jimmy_carter',
  'ronald_reagan', 'george_h_w_bush', 'bill_clinton', 'george_w_bush',
  'barack_obama', 'donald_trump_t1', 'joe_biden', 'donald_trump_t2',
];

// ============================================================
// Seed runner
// ============================================================

async function main() {
  console.log('🌱 Starting Score Our Presidents seed...');

  // 1. Load categories
  console.log('📚 Loading 13 categories...');
  const categoryRecords: Record<number, string> = {}; // number → id
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { number: cat.number },
      update: {
        defaultWeight: cat.defaultWeight,
        weightRevisionNote: cat.revisionNote ?? null,
        weightSourceTag: cat.source,
      },
      create: {
        number: cat.number,
        name: cat.name,
        defaultWeight: cat.defaultWeight,
        weightRevisionNote: cat.revisionNote ?? null,
        weightSourceTag: cat.source,
      },
    });
    categoryRecords[cat.number] = record.id;
  }

  // 2. Load sub-criteria
  console.log('🔢 Loading 56 sub-criteria...');
  const subCriterionRecords: Record<string, string> = {}; // number → id
  for (const sub of SUB_CRITERIA) {
    const record = await prisma.subCriterion.upsert({
      where: { number: sub.number },
      update: { name: sub.name },
      create: {
        number: sub.number,
        categoryId: categoryRecords[sub.categoryNumber],
        name: sub.name,
      },
    });
    subCriterionRecords[sub.number] = record.id;
  }

  // 3. Load lens presets + weights
  console.log('🎭 Loading 9 lens presets with 117 weight values...');
  for (const lens of LENS_PRESETS) {
    const lensRecord = await prisma.lensPreset.upsert({
      where: { slug: lens.slug },
      update: { displayName: lens.displayName, description: lens.description },
      create: {
        slug: lens.slug,
        displayName: lens.displayName,
        description: lens.description,
        orderIndex: lens.orderIndex,
      },
    });

    for (const [catNum, weight] of Object.entries(lens.weights)) {
      const categoryId = categoryRecords[parseInt(catNum)];
      await prisma.lensWeight.upsert({
        where: { lensPresetId_categoryId: { lensPresetId: lensRecord.id, categoryId } },
        update: { weight },
        create: { lensPresetId: lensRecord.id, categoryId, weight },
      });
    }
  }

  // 4. Load presidents + expert scores + evidence from YAML files
  console.log('👤 Loading 16 presidents from YAML files...');
  const scoresDir = path.resolve(__dirname, '..', 'scores');

  let totalScores = 0;
  let totalEvidence = 0;
  let totalDroppedScores = 0;

  for (let i = 0; i < PRESIDENT_SLUGS.length; i++) {
    const slug = PRESIDENT_SLUGS[i];
    const yamlPath = path.join(scoresDir, `${slug}.yaml`);
    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const data = yaml.parse(yamlContent);

    // Upsert president
    const president = await prisma.president.upsert({
      where: { slug },
      update: {
        displayName: data.display_name,
        anchorStatus: data.anchor_status ?? null,
        calibrationAnchor: data.calibration_anchor ?? false,
        inOffice: data.in_office ?? false,
      },
      create: {
        slug,
        displayName: data.display_name,
        termStart: new Date(data.term_start),
        termEnd: data.term_end ? new Date(data.term_end) : null,
        party: data.party,
        termsServed: String(data.terms_served),
        calibrationAnchor: data.calibration_anchor ?? false,
        anchorStatus: data.anchor_status ?? null,
        inOffice: data.in_office ?? false,
        catTenStatus: deriveCatTenStatus(data),
        partialTermNote: data.partial_term_note ?? null,
        orderIndex: i + 1,
      },
    });

    // Insert expert scores + evidence
    for (const cat of data.categories) {
      for (const sub of cat.sub_criteria) {
        const subCriterionId = subCriterionRecords[sub.id];
        if (!subCriterionId) {
          console.warn(`⚠️  Sub-criterion ${sub.id} not found in reference data; skipping`);
          continue;
        }

        const insufficient = sub.insufficient_time_elapsed ?? false;
        if (insufficient && sub.good_score === null) totalDroppedScores++;

        const expertScore = await prisma.expertScore.upsert({
          where: {
            presidentId_subCriterionId: { presidentId: president.id, subCriterionId },
          },
          update: {
            goodScore: sub.good_score,
            harmScore: sub.harm_score,
            lowConfidence: sub.low_confidence ?? false,
            insufficientTimeElapsed: insufficient,
            tentativeLongTail: sub.tentative_long_tail ?? false,
            partialTermLongTail: sub.partial_term_long_tail ?? false,
            eraContext: sub.era_context ?? null,
            scoreStatus: sub.score_status ?? null,
            notes: sub.notes ?? '',
          },
          create: {
            presidentId: president.id,
            subCriterionId,
            goodScore: sub.good_score,
            harmScore: sub.harm_score,
            lowConfidence: sub.low_confidence ?? false,
            insufficientTimeElapsed: insufficient,
            tentativeLongTail: sub.tentative_long_tail ?? false,
            partialTermLongTail: sub.partial_term_long_tail ?? false,
            eraContext: sub.era_context ?? null,
            scoreStatus: sub.score_status ?? null,
            notes: sub.notes ?? '',
          },
        });
        totalScores++;

        // Insert evidence
        if (sub.evidence && Array.isArray(sub.evidence)) {
          // Clear existing evidence for idempotent reseeding
          await prisma.evidence.deleteMany({ where: { expertScoreId: expertScore.id } });

          for (const ev of sub.evidence) {
            await prisma.evidence.create({
              data: {
                expertScoreId: expertScore.id,
                sourceUrl: ev.source_url ?? null,
                citation: ev.citation ?? null,
                sourceType: ev.source_type ?? 'historical_record',
                tier: ev.tier ?? 2,
                claim: ev.claim ?? '',
                verbatimQuote: ev.verbatim_quote ?? null,
                direction: ev.direction ?? 'good',
                verificationStatus: ev.verification_status ?? 'pending',
              },
            });
            totalEvidence++;
          }
        }
      }
    }
  }

  // 5. Insert spec version record
  await prisma.specVersion.upsert({
    where: { version: 'v1.2' },
    update: { isActive: true },
    create: {
      version: 'v1.2',
      releasedAt: new Date('2026-05-11'),
      description: 'Workstream A structural changes: 13 categories, 56 sub-criteria, 8 lens presets, 5 calibration anchors.',
      isActive: true,
    },
  });

  console.log('✅ Seed complete.');
  console.log(`   - 13 categories`);
  console.log(`   - 56 sub-criteria`);
  console.log(`   - 9 lens presets with 117 weight values`);
  console.log(`   - 16 presidents`);
  console.log(`   - ${totalScores} expert scores (${totalDroppedScores} Cat 10 dropped for Biden/Trump T2)`);
  console.log(`   - ${totalEvidence} evidence items`);
}

function deriveCatTenStatus(data: any): string {
  // Per v1.2 §9.4
  if (data.in_office) return 'insufficient_time_elapsed';
  // Check if Cat 10 has null scores
  const cat10 = data.categories?.find((c: any) => c.category === 10);
  if (cat10?.sub_criteria?.[0]?.insufficient_time_elapsed) return 'insufficient_time_elapsed';
  if (cat10?.sub_criteria?.[0]?.low_confidence) return 'tentative_long_tail';
  return 'normal';
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
