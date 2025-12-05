import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding mock transfer data (max 5GB)...\n");

  // Get first available tenant, user, and bucket
  const tenant = await prisma.tenant.findFirst();
  const user = await prisma.user.findFirst();
  let bucket = await prisma.bucket.findFirst();

  if (!tenant) {
    console.error("❌ No tenant found. Please create a tenant first.");
    process.exit(1);
  }

  if (!user) {
    console.error("❌ No user found. Please create a user first.");
    process.exit(1);
  }

  // Create a bucket if none exists
  if (!bucket) {
    console.log("Creating default bucket...");
    bucket = await prisma.bucket.create({
      data: {
        name: "mock-bucket",
        region: "us-east-1",
        isDefault: true,
        tenantId: tenant.id,
      },
    });
  }

  console.log(`📦 Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`👤 User: ${user.email} (${user.id})`);
  console.log(`🪣 Bucket: ${bucket.name} (${bucket.id})\n`);

  // File types for realistic mock data
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
  const errorMessages = ["Network timeout", "Access denied", "Bucket not found", "File too large"];

  const MAX_BYTES = BigInt(5 * 1024 * 1024 * 1024); // 5GB
  let totalBytes = BigInt(0);
  const transfers: any[] = [];
  const now = Date.now();

  console.log("Generating transfers...");

  while (totalBytes < MAX_BYTES) {
    const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // Random date in past 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(now - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

    // Random file size (1MB to 100MB)
    const fileSize = BigInt(Math.floor(Math.random() * 100 * 1024 * 1024) + 1024 * 1024);

    // Check if adding this would exceed 5GB
    if (totalBytes + fileSize > MAX_BYTES) {
      break;
    }

    totalBytes += fileSize;

    const fullFileName = `${fileName}-${Math.floor(Math.random() * 10000)}${fileType.ext}`;
    const id = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    transfers.push({
      id,
      fileName: fullFileName,
      filePath: `/home/user/uploads/${fullFileName}`,
      fileSize,
      mimeType: fileType.mime,
      s3Key: `${fileType.prefix}${fullFileName}`,
      bucketId: bucket.id,
      status,
      progress: status === "COMPLETED" ? 100 : status === "UPLOADING" ? Math.floor(Math.random() * 90) + 10 : 0,
      error: status === "FAILED" ? errorMessages[Math.floor(Math.random() * errorMessages.length)] : null,
      localChecksum: `sha256-${Math.random().toString(36).substring(2, 18)}`,
      s3Checksum: status === "COMPLETED" ? `sha256-${Math.random().toString(36).substring(2, 18)}` : null,
      startedAt: status !== "PENDING" ? createdAt : null,
      completedAt: status === "COMPLETED" ? new Date(createdAt.getTime() + Math.random() * 60000) : null,
      tenantId: tenant.id,
      userId: user.id,
      createdAt,
      updatedAt: createdAt,
    });

    // Progress indicator every 100 transfers
    if (transfers.length % 100 === 0) {
      const gb = Number(totalBytes) / 1024 / 1024 / 1024;
      console.log(`  Generated ${transfers.length} transfers (${gb.toFixed(2)} GB)...`);
    }
  }

  console.log(`\n📝 Inserting ${transfers.length} transfers...`);

  // Insert in batches of 500 to avoid memory issues
  const BATCH_SIZE = 500;
  for (let i = 0; i < transfers.length; i += BATCH_SIZE) {
    const batch = transfers.slice(i, i + BATCH_SIZE);
    await prisma.transfer.createMany({ data: batch });
    console.log(`  Inserted ${Math.min(i + BATCH_SIZE, transfers.length)}/${transfers.length}`);
  }

  // Summary
  const stats = await prisma.transfer.groupBy({
    by: ["status"],
    where: { tenantId: tenant.id },
    _count: true,
    _sum: { fileSize: true },
  });

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ Mock transfer data seeded successfully!\n");
  console.log("📊 Transfer Summary:");
  stats.forEach((s) => {
    const size = Number(s._sum.fileSize || 0) / 1024 / 1024;
    console.log(`   ${s.status}: ${s._count} transfers (${size.toFixed(2)} MB)`);
  });
  console.log(`\n💾 Total mock data: ${(Number(totalBytes) / 1024 / 1024 / 1024).toFixed(2)} GB`);
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
