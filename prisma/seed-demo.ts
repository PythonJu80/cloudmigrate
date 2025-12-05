import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...\n");

  // Find existing user and tenant (or create demo ones)
  let tenant = await prisma.tenant.findFirst();
  let user = await prisma.user.findFirst();

  if (!tenant) {
    console.log("Creating demo tenant...");
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Company",
        slug: "demo",
        plan: "PRO",
        awsRegion: "us-east-1",
        bytesTransferred: BigInt(0),
        bytesLimit: BigInt(10737418240), // 10GB
      },
    });
  }

  if (!user) {
    console.log("Creating demo user...");
    user = await prisma.user.create({
      data: {
        email: "demo@cloudmigrate.io",
        name: "Demo User",
        passwordHash: "$2b$10$demo", // placeholder
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });
  }

  console.log(`📦 Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`👤 User: ${user.email} (${user.id})\n`);

  // Create S3 Buckets
  console.log("Creating S3 buckets...");
  const buckets = await Promise.all([
    prisma.bucket.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "cloudmigrate-prod" } },
      update: {},
      create: {
        name: "cloudmigrate-prod",
        region: "us-east-1",
        isDefault: true,
        tenantId: tenant.id,
      },
    }),
    prisma.bucket.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "cloudmigrate-backups" } },
      update: {},
      create: {
        name: "cloudmigrate-backups",
        region: "us-west-2",
        isDefault: false,
        tenantId: tenant.id,
      },
    }),
    prisma.bucket.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "cloudmigrate-archive" } },
      update: {},
      create: {
        name: "cloudmigrate-archive",
        region: "eu-west-1",
        isDefault: false,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log(`  ✓ Created ${buckets.length} buckets\n`);

  // File types for realistic data
  const fileTypes = [
    { ext: ".pdf", mime: "application/pdf", prefix: "documents/" },
    { ext: ".xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", prefix: "spreadsheets/" },
    { ext: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", prefix: "documents/" },
    { ext: ".jpg", mime: "image/jpeg", prefix: "images/" },
    { ext: ".png", mime: "image/png", prefix: "images/" },
    { ext: ".mp4", mime: "video/mp4", prefix: "videos/" },
    { ext: ".zip", mime: "application/zip", prefix: "archives/" },
    { ext: ".sql", mime: "application/sql", prefix: "backups/" },
    { ext: ".json", mime: "application/json", prefix: "data/" },
    { ext: ".csv", mime: "text/csv", prefix: "exports/" },
  ];

  const fileNames = [
    "quarterly-report", "sales-data", "customer-list", "product-catalog",
    "marketing-assets", "employee-records", "financial-summary", "inventory",
    "analytics-export", "backup-2024", "project-files", "meeting-notes",
    "presentation", "contract", "invoice", "receipt", "logo", "banner",
    "database-dump", "config-backup", "user-data", "transaction-log",
  ];

  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "COMPLETED", "FAILED", "PENDING", "UPLOADING"];

  // Generate transfers over the past 30 days
  console.log("Creating transfer records...");
  const transfers = [];
  const now = new Date();

  for (let i = 0; i < 75; i++) {
    const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    const bucket = buckets[Math.floor(Math.random() * buckets.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Random date in past 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
    
    // Random file size (1KB to 500MB)
    const fileSize = BigInt(Math.floor(Math.random() * 500 * 1024 * 1024) + 1024);
    
    const fullFileName = `${fileName}-${Math.floor(Math.random() * 1000)}${fileType.ext}`;
    
    transfers.push({
      fileName: fullFileName,
      filePath: `/home/user/uploads/${fullFileName}`,
      fileSize,
      mimeType: fileType.mime,
      s3Key: `${fileType.prefix}${fullFileName}`,
      bucketId: bucket.id,
      status,
      progress: status === "COMPLETED" ? 100 : status === "UPLOADING" ? Math.floor(Math.random() * 90) + 10 : 0,
      error: status === "FAILED" ? ["Network timeout", "Access denied", "Bucket not found", "File too large"][Math.floor(Math.random() * 4)] : null,
      startedAt: status !== "PENDING" ? createdAt : null,
      completedAt: status === "COMPLETED" ? new Date(createdAt.getTime() + Math.random() * 60000) : null,
      tenantId: tenant.id,
      userId: user.id,
      createdAt,
      updatedAt: createdAt,
    });
  }

  // Clear existing transfers and insert new ones
  await prisma.transfer.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.transfer.createMany({ data: transfers });
  console.log(`  ✓ Created ${transfers.length} transfers\n`);

  // Create some audit logs
  console.log("Creating audit logs...");
  const auditActions = [
    { action: "TRANSFER_STARTED", resource: "transfer" },
    { action: "TRANSFER_COMPLETED", resource: "transfer" },
    { action: "BUCKET_CREATED", resource: "bucket" },
    { action: "USER_LOGIN", resource: "auth" },
    { action: "SETTINGS_UPDATED", resource: "settings" },
    { action: "API_KEY_GENERATED", resource: "security" },
  ];

  const auditLogs = [];
  for (let i = 0; i < 50; i++) {
    const action = auditActions[Math.floor(Math.random() * auditActions.length)];
    const daysAgo = Math.floor(Math.random() * 14);
    
    auditLogs.push({
      tenantId: tenant.id,
      userId: user.id,
      action: action.action,
      resource: action.resource,
      details: JSON.stringify({ ip: `192.168.1.${Math.floor(Math.random() * 255)}` }),
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    });
  }

  await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.auditLog.createMany({ data: auditLogs });
  console.log(`  ✓ Created ${auditLogs.length} audit logs\n`);

  // Create graph job logs
  console.log("Creating graph job logs...");
  const algorithms = ["pagerank", "node2vec", "similarity", "community-detection", "shortest-path"];
  const graphJobs = [];

  for (let i = 0; i < 20; i++) {
    const algo = algorithms[Math.floor(Math.random() * algorithms.length)];
    const status = ["COMPLETED", "COMPLETED", "COMPLETED", "FAILED", "RUNNING"][Math.floor(Math.random() * 5)];
    const daysAgo = Math.floor(Math.random() * 7);
    
    graphJobs.push({
      tenantId: tenant.id,
      userId: user.id,
      algorithm: algo,
      status,
      nodesProcessed: Math.floor(Math.random() * 10000),
      relsProcessed: Math.floor(Math.random() * 50000),
      executionMs: Math.floor(Math.random() * 30000),
      resultSummary: status === "COMPLETED" ? JSON.stringify({ score: Math.random().toFixed(4) }) : null,
      error: status === "FAILED" ? "Memory limit exceeded" : null,
      startedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      completedAt: status === "COMPLETED" ? new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 + 30000) : null,
      createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    });
  }

  await prisma.graphJobLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.graphJobLog.createMany({ data: graphJobs });
  console.log(`  ✓ Created ${graphJobs.length} graph job logs\n`);

  // Update tenant bytes transferred
  const totalBytes = transfers
    .filter(t => t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.fileSize, BigInt(0));
  
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { bytesTransferred: totalBytes },
  });

  // Summary
  console.log("═══════════════════════════════════════════");
  console.log("✅ Demo data seeded successfully!\n");
  
  const stats = await prisma.transfer.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: true,
  });
  
  console.log("📊 Transfer Summary:");
  stats.forEach(s => console.log(`   ${s.status}: ${s._count}`));
  
  console.log(`\n💾 Total data: ${(Number(totalBytes) / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log("═══════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
