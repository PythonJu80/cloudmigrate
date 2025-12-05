/**
 * Migrate data from SQLite to PostgreSQL
 * Run: DATABASE_URL="postgresql://cloudmigrate:cloudmigrate2025@localhost:6070/cloudmigrate" npx tsx scripts/migrate-sqlite-to-postgres.ts
 */

import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

async function migrate() {
  // Connect to SQLite
  const sqlite = new Database("prisma/dev.db");
  
  // Connect to PostgreSQL
  const pg = new PrismaClient();

  try {
    // Migrate Tenants (only essential fields)
    const tenants = sqlite.prepare("SELECT * FROM Tenant").all() as any[];
    console.log(`Migrating ${tenants.length} tenants...`);
    for (const t of tenants) {
      await pg.tenant.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan || "FREE",
          awsRegion: t.awsRegion || "us-east-1",
          bytesTransferred: BigInt(t.bytesTransferred || 0),
          bytesLimit: BigInt(t.bytesLimit || 5368709120),
        },
      });
    }

    // Migrate Users
    const users = sqlite.prepare("SELECT * FROM User").all() as any[];
    console.log(`Migrating ${users.length} users...`);
    for (const u of users) {
      await pg.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          password: u.password,
          role: u.role || "USER",
          tenantId: u.tenantId,
        },
      });
    }

    // Migrate Secrets (AWS credentials etc) - MOST IMPORTANT
    const secrets = sqlite.prepare("SELECT * FROM Secret").all() as any[];
    console.log(`Migrating ${secrets.length} secrets...`);
    for (const s of secrets) {
      await pg.secret.upsert({
        where: { tenantId_key: { tenantId: s.tenantId, key: s.key } },
        update: { value: s.value },
        create: {
          tenantId: s.tenantId,
          key: s.key,
          value: s.value,
        },
      });
    }

    console.log("✅ Migration complete!");
    
    // Verify
    const pgSecrets = await pg.secret.findMany({ where: { key: { startsWith: "AWS" } } });
    console.log(`Verified: ${pgSecrets.length} AWS secrets in PostgreSQL`);

  } finally {
    await pg.$disconnect();
    sqlite.close();
  }
}

migrate().catch(console.error);
