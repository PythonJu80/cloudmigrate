-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "awsRoleArn" TEXT,
    "awsExternalId" TEXT,
    "awsRegion" TEXT NOT NULL DEFAULT 'us-east-1',
    "defaultBucket" TEXT,
    "bytesTransferred" BIGINT NOT NULL DEFAULT 0,
    "bytesLimit" BIGINT NOT NULL DEFAULT 5368709120,
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "openaiApiKey" TEXT,
    "companyWebsite" TEXT,
    "companyContext" TEXT,
    "knowledgeUpdatedAt" DATETIME,
    "localPath" TEXT,
    "agentApiKey" TEXT,
    "agentConnected" BOOLEAN NOT NULL DEFAULT false,
    "agentLastSeen" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isSuperuser" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bucket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT,
    "s3Key" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "localChecksum" TEXT,
    "s3Checksum" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transfer_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "Bucket" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT,
    "data" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Secret_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TenantNeo4jConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "boltUri" TEXT NOT NULL DEFAULT 'bolt://neo4j:7687',
    "username" TEXT NOT NULL DEFAULT 'neo4j',
    "password" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "configType" TEXT NOT NULL DEFAULT 'SHARED',
    "maxNodes" INTEGER NOT NULL DEFAULT 100000,
    "maxRelationships" INTEGER NOT NULL DEFAULT 500000,
    "gdsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "embeddingsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GraphUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "computeSeconds" INTEGER NOT NULL DEFAULT 0,
    "queriesExecuted" INTEGER NOT NULL DEFAULT 0,
    "nodesProcessed" INTEGER NOT NULL DEFAULT 0,
    "relationshipsProcessed" INTEGER NOT NULL DEFAULT 0,
    "embeddingsGenerated" INTEGER NOT NULL DEFAULT 0,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "stripeReported" BOOLEAN NOT NULL DEFAULT false,
    "stripeUsageRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GraphJobLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "algorithm" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "nodesProcessed" INTEGER NOT NULL DEFAULT 0,
    "relsProcessed" INTEGER NOT NULL DEFAULT 0,
    "executionMs" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "rootPath" TEXT NOT NULL,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "folderCount" INTEGER NOT NULL DEFAULT 0,
    "totalSize" BIGINT NOT NULL DEFAULT 0,
    "fileTypes" TEXT,
    "largeFiles" TEXT,
    "files" TEXT,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CloudResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "arn" TEXT,
    "awsId" TEXT,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "config" TEXT NOT NULL,
    "monthlyCost" REAL NOT NULL DEFAULT 0,
    "lastCostSync" DATETIME,
    "tags" TEXT,
    "architectureId" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudResource_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Architecture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "canvas" TEXT NOT NULL,
    "resources" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deployedAt" DATETIME,
    "deployError" TEXT,
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "terraformCode" TEXT,
    "iamPolicies" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArchitectureDeployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "architectureId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resourcesCreated" INTEGER NOT NULL DEFAULT 0,
    "resourcesUpdated" INTEGER NOT NULL DEFAULT 0,
    "resourcesDeleted" INTEGER NOT NULL DEFAULT 0,
    "logs" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchitectureDeployment_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "Architecture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "lastRunStatus" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT NOT NULL,
    "stepResults" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "output" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "operator" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 300,
    "channels" TEXT NOT NULL,
    "channelConfig" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CloudFlow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nodes" TEXT NOT NULL,
    "edges" TEXT NOT NULL,
    "viewport" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "triggerConfig" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastRunAt" DATETIME,
    "lastRunStatus" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudFlow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlowSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "nodeId" TEXT,
    "configField" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlowSecret_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "CloudFlow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlowExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggeredBy" TEXT NOT NULL,
    "results" TEXT,
    "logs" TEXT,
    "error" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlowExecution_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "CloudFlow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertIncident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertRuleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "value" REAL NOT NULL,
    "message" TEXT NOT NULL,
    "resourceArn" TEXT,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertIncident_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "AlertRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_agentApiKey_key" ON "Tenant"("agentApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Bucket_tenantId_idx" ON "Bucket"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Bucket_tenantId_name_key" ON "Bucket"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Transfer_tenantId_idx" ON "Transfer"("tenantId");

-- CreateIndex
CREATE INDEX "Transfer_userId_idx" ON "Transfer"("userId");

-- CreateIndex
CREATE INDEX "Transfer_status_idx" ON "Transfer"("status");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_source_idx" ON "KnowledgeChunk"("source");

-- CreateIndex
CREATE INDEX "ChatThread_userId_idx" ON "ChatThread"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_idx" ON "ChatMessage"("threadId");

-- CreateIndex
CREATE INDEX "Secret_tenantId_idx" ON "Secret"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Secret_tenantId_key_key" ON "Secret"("tenantId", "key");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantNeo4jConfig_tenantId_key" ON "TenantNeo4jConfig"("tenantId");

-- CreateIndex
CREATE INDEX "TenantNeo4jConfig_tenantId_idx" ON "TenantNeo4jConfig"("tenantId");

-- CreateIndex
CREATE INDEX "GraphUsage_tenantId_idx" ON "GraphUsage"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphUsage_tenantId_periodStart_periodEnd_key" ON "GraphUsage"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "GraphJobLog_tenantId_idx" ON "GraphJobLog"("tenantId");

-- CreateIndex
CREATE INDEX "GraphJobLog_status_idx" ON "GraphJobLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentScan_tenantId_key" ON "AgentScan"("tenantId");

-- CreateIndex
CREATE INDEX "CloudResource_tenantId_idx" ON "CloudResource"("tenantId");

-- CreateIndex
CREATE INDEX "CloudResource_type_idx" ON "CloudResource"("type");

-- CreateIndex
CREATE INDEX "CloudResource_status_idx" ON "CloudResource"("status");

-- CreateIndex
CREATE INDEX "CloudResource_architectureId_idx" ON "CloudResource"("architectureId");

-- CreateIndex
CREATE UNIQUE INDEX "CloudResource_tenantId_arn_key" ON "CloudResource"("tenantId", "arn");

-- CreateIndex
CREATE INDEX "Architecture_tenantId_idx" ON "Architecture"("tenantId");

-- CreateIndex
CREATE INDEX "Architecture_status_idx" ON "Architecture"("status");

-- CreateIndex
CREATE INDEX "ArchitectureDeployment_architectureId_idx" ON "ArchitectureDeployment"("architectureId");

-- CreateIndex
CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");

-- CreateIndex
CREATE INDEX "Workflow_enabled_idx" ON "Workflow"("enabled");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "AlertRule_tenantId_idx" ON "AlertRule"("tenantId");

-- CreateIndex
CREATE INDEX "AlertRule_enabled_idx" ON "AlertRule"("enabled");

-- CreateIndex
CREATE INDEX "CloudFlow_tenantId_idx" ON "CloudFlow"("tenantId");

-- CreateIndex
CREATE INDEX "CloudFlow_userId_idx" ON "CloudFlow"("userId");

-- CreateIndex
CREATE INDEX "CloudFlow_status_idx" ON "CloudFlow"("status");

-- CreateIndex
CREATE INDEX "FlowSecret_flowId_idx" ON "FlowSecret"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowSecret_flowId_secretKey_nodeId_key" ON "FlowSecret"("flowId", "secretKey", "nodeId");

-- CreateIndex
CREATE INDEX "FlowExecution_flowId_idx" ON "FlowExecution"("flowId");

-- CreateIndex
CREATE INDEX "FlowExecution_tenantId_idx" ON "FlowExecution"("tenantId");

-- CreateIndex
CREATE INDEX "FlowExecution_status_idx" ON "FlowExecution"("status");

-- CreateIndex
CREATE INDEX "AlertIncident_alertRuleId_idx" ON "AlertIncident"("alertRuleId");

-- CreateIndex
CREATE INDEX "AlertIncident_status_idx" ON "AlertIncident"("status");
