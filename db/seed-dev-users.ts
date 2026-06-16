// Dev-only: seed a handful of UserProfile records for testing votes / scores.
// Idempotent — safe to re-run. Not invoked by `pnpm db:seed`; run via:
//   pnpm tsx db/seed-dev-users.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEV_USERS = [
  {
    authId: "dev:max",
    email: "max@example.com",
    displayName: "Max",
    accountAgeDays: 30,
    emailVerified: true,
    reputationScore: 1.0,
    isAdmin: true,
  },
  {
    authId: "dev:alex",
    email: "alex@example.com",
    displayName: "Alex Casual",
    accountAgeDays: 14,
    emailVerified: true,
    reputationScore: 1.0,
    isAdmin: false,
  },
  {
    authId: "dev:newbie",
    email: "newbie@example.com",
    displayName: "Sam New-Account",
    accountAgeDays: 2,
    emailVerified: false,
    reputationScore: 1.0,
    isAdmin: false,
  },
];

async function main() {
  const now = Date.now();
  for (const u of DEV_USERS) {
    const accountCreatedAt = new Date(now - u.accountAgeDays * 86400000);
    await prisma.userProfile.upsert({
      where: { email: u.email },
      update: {
        displayName: u.displayName,
        emailVerified: u.emailVerified,
        emailVerifiedAt: u.emailVerified ? accountCreatedAt : null,
        accountCreatedAt,
        reputationScore: u.reputationScore,
        isAdmin: u.isAdmin,
      },
      create: {
        authId: u.authId,
        email: u.email,
        displayName: u.displayName,
        emailVerified: u.emailVerified,
        emailVerifiedAt: u.emailVerified ? accountCreatedAt : null,
        accountCreatedAt,
        reputationScore: u.reputationScore,
        isAdmin: u.isAdmin,
      },
    });
  }
  console.log(`✓ Dev users upserted (${DEV_USERS.length}):`);
  for (const u of DEV_USERS) {
    console.log(
      `  ${u.email.padEnd(24)} age=${u.accountAgeDays}d  verified=${u.emailVerified}  rep=${u.reputationScore}`
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
