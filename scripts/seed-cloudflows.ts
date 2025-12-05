// Seed CloudFlow example workflows
// Run with: npx tsx scripts/seed-cloudflows.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CloudFlow example workflows...\n");

  // Get demo user
  const user = await prisma.user.findFirst({
    where: { email: "demo@cloudmigrate.io" },
    include: { tenant: true },
  });

  if (!user) {
    console.error("❌ Demo user not found. Run seed-demo.ts first.");
    process.exit(1);
  }

  console.log(`📦 Using tenant: ${user.tenant.name} (${user.tenantId})`);
  console.log(`👤 Using user: ${user.email} (${user.id})\n`);

  // Delete existing flows for clean slate
  await prisma.cloudFlow.deleteMany({
    where: { tenantId: user.tenantId },
  });

  // ============================================
  // Flow 1: Daily S3 Backup
  // ============================================
  const flow1Nodes = [
    {
      id: "trigger.cron-1",
      type: "trigger",
      position: { x: 100, y: 200 },
      data: {
        definitionId: "trigger.cron",
        label: "Daily at Midnight",
        icon: "Clock",
        color: "#22c55e",
        type: "trigger",
        config: {
          expression: "0 0 * * *",
          timezone: "UTC",
        },
      },
    },
    {
      id: "aws.s3.download-1",
      type: "cloudflow",
      position: { x: 350, y: 200 },
      data: {
        definitionId: "aws.s3.download",
        label: "Download from Source",
        icon: "Download",
        color: "#f97316",
        type: "action",
        config: {
          bucket: "production-data",
          key: "exports/daily-export.json",
        },
      },
    },
    {
      id: "aws.s3.upload-1",
      type: "cloudflow",
      position: { x: 600, y: 200 },
      data: {
        definitionId: "aws.s3.upload",
        label: "Upload to Backup",
        icon: "Upload",
        color: "#f97316",
        type: "action",
        config: {
          bucket: "backup-archive",
          key: "backups/${date}/daily-export.json",
          contentType: "application/json",
        },
      },
    },
    {
      id: "aws.sns.publish-1",
      type: "cloudflow",
      position: { x: 850, y: 200 },
      data: {
        definitionId: "aws.sns.publish",
        label: "Notify Team",
        icon: "Bell",
        color: "#f97316",
        type: "action",
        config: {
          topicArn: "arn:aws:sns:us-east-1:123456789:backup-notifications",
          subject: "Daily Backup Complete",
        },
      },
    },
  ];

  const flow1Edges = [
    { id: "e1-2", source: "trigger.cron-1", target: "aws.s3.download-1", animated: true },
    { id: "e2-3", source: "aws.s3.download-1", target: "aws.s3.upload-1", animated: true },
    { id: "e3-4", source: "aws.s3.upload-1", target: "aws.sns.publish-1", animated: true },
  ];

  await prisma.cloudFlow.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      name: "Daily S3 Backup",
      description: "Copies production data to backup bucket every night at midnight and sends notification",
      nodes: JSON.stringify(flow1Nodes),
      edges: JSON.stringify(flow1Edges),
      triggerType: "cron",
      triggerConfig: JSON.stringify({ expression: "0 0 * * *", timezone: "UTC" }),
      status: "active",
      isShared: true,
      runCount: 47,
      lastRunAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      lastRunStatus: "success",
    },
  });
  console.log("✅ Created: Daily S3 Backup");

  // ============================================
  // Flow 2: EC2 Auto-Scaling Alert
  // ============================================
  const flow2Nodes = [
    {
      id: "trigger.webhook-1",
      type: "trigger",
      position: { x: 100, y: 200 },
      data: {
        definitionId: "trigger.webhook",
        label: "CloudWatch Alarm",
        icon: "Webhook",
        color: "#22c55e",
        type: "trigger",
        config: {
          method: "POST",
        },
      },
    },
    {
      id: "aws.ec2.create-1",
      type: "cloudflow",
      position: { x: 350, y: 200 },
      data: {
        definitionId: "aws.ec2.create",
        label: "Launch New Instance",
        icon: "Server",
        color: "#f97316",
        type: "action",
        config: {
          instanceType: "t3.medium",
          ami: "ami-0c55b159cbfafe1f0",
          keyName: "production-key",
          securityGroupIds: "sg-0123456789abcdef0",
        },
      },
    },
    {
      id: "aws.sns.publish-2",
      type: "cloudflow",
      position: { x: 600, y: 200 },
      data: {
        definitionId: "aws.sns.publish",
        label: "Alert DevOps",
        icon: "Bell",
        color: "#f97316",
        type: "action",
        config: {
          topicArn: "arn:aws:sns:us-east-1:123456789:devops-alerts",
          subject: "Auto-Scale: New Instance Launched",
        },
      },
    },
  ];

  const flow2Edges = [
    { id: "e1-2", source: "trigger.webhook-1", target: "aws.ec2.create-1", animated: true },
    { id: "e2-3", source: "aws.ec2.create-1", target: "aws.sns.publish-2", animated: true },
  ];

  await prisma.cloudFlow.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      name: "EC2 Auto-Scaling Alert",
      description: "Triggered by CloudWatch alarm to spin up new EC2 instance and notify DevOps team",
      nodes: JSON.stringify(flow2Nodes),
      edges: JSON.stringify(flow2Edges),
      triggerType: "webhook",
      triggerConfig: JSON.stringify({ method: "POST" }),
      status: "active",
      isShared: true,
      runCount: 12,
      lastRunAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      lastRunStatus: "success",
    },
  });
  console.log("✅ Created: EC2 Auto-Scaling Alert");

  // ============================================
  // Flow 3: Lambda Data Pipeline
  // ============================================
  const flow3Nodes = [
    {
      id: "trigger.manual-1",
      type: "trigger",
      position: { x: 100, y: 200 },
      data: {
        definitionId: "trigger.manual",
        label: "Manual Trigger",
        icon: "Play",
        color: "#22c55e",
        type: "trigger",
        config: {},
      },
    },
    {
      id: "aws.s3.download-2",
      type: "cloudflow",
      position: { x: 350, y: 200 },
      data: {
        definitionId: "aws.s3.download",
        label: "Fetch Raw Data",
        icon: "Download",
        color: "#f97316",
        type: "action",
        config: {
          bucket: "raw-data-lake",
          key: "incoming/latest.csv",
        },
      },
    },
    {
      id: "aws.lambda.invoke-1",
      type: "cloudflow",
      position: { x: 600, y: 200 },
      data: {
        definitionId: "aws.lambda.invoke",
        label: "Transform Data",
        icon: "Zap",
        color: "#f97316",
        type: "action",
        config: {
          functionName: "data-transformer-prod",
          invocationType: "RequestResponse",
        },
      },
    },
    {
      id: "aws.s3.upload-2",
      type: "cloudflow",
      position: { x: 850, y: 200 },
      data: {
        definitionId: "aws.s3.upload",
        label: "Store Processed",
        icon: "Upload",
        color: "#f97316",
        type: "action",
        config: {
          bucket: "processed-data",
          key: "output/${timestamp}.json",
          contentType: "application/json",
        },
      },
    },
    {
      id: "aws.sqs.send-1",
      type: "cloudflow",
      position: { x: 1100, y: 200 },
      data: {
        definitionId: "aws.sqs.send",
        label: "Queue for Analytics",
        icon: "MessageSquare",
        color: "#f97316",
        type: "action",
        config: {
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789/analytics-queue",
          delaySeconds: 0,
        },
      },
    },
  ];

  const flow3Edges = [
    { id: "e1-2", source: "trigger.manual-1", target: "aws.s3.download-2", animated: true },
    { id: "e2-3", source: "aws.s3.download-2", target: "aws.lambda.invoke-1", animated: true },
    { id: "e3-4", source: "aws.lambda.invoke-1", target: "aws.s3.upload-2", animated: true },
    { id: "e4-5", source: "aws.s3.upload-2", target: "aws.sqs.send-1", animated: true },
  ];

  await prisma.cloudFlow.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      name: "Lambda Data Pipeline",
      description: "ETL pipeline: fetches raw CSV, transforms via Lambda, stores JSON, queues for analytics",
      nodes: JSON.stringify(flow3Nodes),
      edges: JSON.stringify(flow3Edges),
      triggerType: "manual",
      status: "active",
      isShared: false,
      runCount: 156,
      lastRunAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      lastRunStatus: "success",
    },
  });
  console.log("✅ Created: Lambda Data Pipeline");

  // ============================================
  // Flow 4: Secret Rotation
  // ============================================
  const flow4Nodes = [
    {
      id: "trigger.cron-2",
      type: "trigger",
      position: { x: 100, y: 200 },
      data: {
        definitionId: "trigger.cron",
        label: "Weekly Sunday 2AM",
        icon: "Clock",
        color: "#22c55e",
        type: "trigger",
        config: {
          expression: "0 2 * * 0",
          timezone: "America/New_York",
        },
      },
    },
    {
      id: "aws.secretsmanager.getSecret-1",
      type: "cloudflow",
      position: { x: 350, y: 200 },
      data: {
        definitionId: "aws.secretsmanager.getSecret",
        label: "Get Current Secret",
        icon: "Key",
        color: "#f97316",
        type: "action",
        config: {
          secretId: "prod/database/credentials",
          versionStage: "AWSCURRENT",
        },
      },
    },
    {
      id: "aws.lambda.invoke-2",
      type: "cloudflow",
      position: { x: 600, y: 200 },
      data: {
        definitionId: "aws.lambda.invoke",
        label: "Rotate Credentials",
        icon: "Zap",
        color: "#f97316",
        type: "action",
        config: {
          functionName: "secret-rotator",
          invocationType: "RequestResponse",
        },
      },
    },
    {
      id: "aws.sns.publish-3",
      type: "cloudflow",
      position: { x: 850, y: 200 },
      data: {
        definitionId: "aws.sns.publish",
        label: "Notify Security Team",
        icon: "Bell",
        color: "#f97316",
        type: "action",
        config: {
          topicArn: "arn:aws:sns:us-east-1:123456789:security-alerts",
          subject: "Secret Rotation Complete",
        },
      },
    },
  ];

  const flow4Edges = [
    { id: "e1-2", source: "trigger.cron-2", target: "aws.secretsmanager.getSecret-1", animated: true },
    { id: "e2-3", source: "aws.secretsmanager.getSecret-1", target: "aws.lambda.invoke-2", animated: true },
    { id: "e3-4", source: "aws.lambda.invoke-2", target: "aws.sns.publish-3", animated: true },
  ];

  await prisma.cloudFlow.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      name: "Weekly Secret Rotation",
      description: "Rotates database credentials every Sunday at 2 AM and notifies security team",
      nodes: JSON.stringify(flow4Nodes),
      edges: JSON.stringify(flow4Edges),
      triggerType: "cron",
      triggerConfig: JSON.stringify({ expression: "0 2 * * 0", timezone: "America/New_York" }),
      status: "active",
      isShared: true,
      runCount: 8,
      lastRunAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      lastRunStatus: "success",
    },
  });
  console.log("✅ Created: Weekly Secret Rotation");

  // ============================================
  // Flow 5: SQS Message Processor (Draft)
  // ============================================
  const flow5Nodes = [
    {
      id: "trigger.manual-2",
      type: "trigger",
      position: { x: 100, y: 200 },
      data: {
        definitionId: "trigger.manual",
        label: "Manual Trigger",
        icon: "Play",
        color: "#22c55e",
        type: "trigger",
        config: {},
      },
    },
    {
      id: "aws.sqs.receive-1",
      type: "cloudflow",
      position: { x: 350, y: 200 },
      data: {
        definitionId: "aws.sqs.receive",
        label: "Receive Messages",
        icon: "MessageSquare",
        color: "#f97316",
        type: "action",
        config: {
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789/order-queue",
          maxMessages: 10,
          waitTimeSeconds: 20,
        },
      },
    },
    {
      id: "aws.lambda.invoke-3",
      type: "cloudflow",
      position: { x: 600, y: 200 },
      data: {
        definitionId: "aws.lambda.invoke",
        label: "Process Orders",
        icon: "Zap",
        color: "#f97316",
        type: "action",
        config: {
          functionName: "order-processor",
          invocationType: "RequestResponse",
        },
      },
    },
  ];

  const flow5Edges = [
    { id: "e1-2", source: "trigger.manual-2", target: "aws.sqs.receive-1", animated: true },
    { id: "e2-3", source: "aws.sqs.receive-1", target: "aws.lambda.invoke-3", animated: true },
  ];

  await prisma.cloudFlow.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      name: "SQS Order Processor",
      description: "Polls SQS queue for new orders and processes them via Lambda (work in progress)",
      nodes: JSON.stringify(flow5Nodes),
      edges: JSON.stringify(flow5Edges),
      triggerType: "manual",
      status: "draft",
      isShared: false,
      runCount: 3,
      lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      lastRunStatus: "error",
    },
  });
  console.log("✅ Created: SQS Order Processor (Draft)");

  console.log("\n═══════════════════════════════════════════");
  console.log("✅ CloudFlow examples seeded successfully!");
  console.log("═══════════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
