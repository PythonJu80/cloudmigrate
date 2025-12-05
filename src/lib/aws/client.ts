/**
 * CloudFabric™ - Unified AWS Client
 * 
 * Central AWS SDK wrapper that normalizes all AWS operations.
 * Provides consistent error handling, retry logic, and multi-region support.
 */

import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { S3Client } from "@aws-sdk/client-s3";
import { EC2Client } from "@aws-sdk/client-ec2";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { RDSClient } from "@aws-sdk/client-rds";
import { IAMClient } from "@aws-sdk/client-iam";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

// Supported AWS services
export type AWSService = "s3" | "ec2" | "lambda" | "rds" | "iam" | "cloudwatch" | "costexplorer";

// Credentials interface
export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

// Tenant AWS configuration
export interface TenantAWSConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
  externalId?: string;
  region: string;
}

// Client cache to avoid recreating clients
const clientCache = new Map<string, { client: unknown; expiresAt: number }>();
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes (STS tokens last 60 min)

/**
 * Get AWS credentials for a tenant
 * Supports both direct credentials and role assumption
 */
export async function getTenantCredentials(tenantId: string): Promise<AWSCredentials | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { secrets: true },
  });

  if (!tenant) return null;

  // Check for BYOK credentials in secrets
  const accessKeySecret = tenant.secrets.find((s) => s.key === "AWS_ACCESS_KEY_ID");
  const secretKeySecret = tenant.secrets.find((s) => s.key === "AWS_SECRET_ACCESS_KEY");

  if (accessKeySecret && secretKeySecret) {
    return {
      accessKeyId: decrypt(accessKeySecret.value),
      secretAccessKey: decrypt(secretKeySecret.value),
      region: tenant.awsRegion,
    };
  }

  // Check for role assumption
  if (tenant.awsRoleArn && tenant.awsExternalId) {
    return assumeRole(tenant.awsRoleArn, tenant.awsExternalId, tenant.awsRegion);
  }

  // Fall back to default credentials
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: tenant.awsRegion || process.env.AWS_REGION || "us-east-1",
    };
  }

  return null;
}

/**
 * Assume an IAM role and return temporary credentials
 */
export async function assumeRole(
  roleArn: string,
  externalId: string,
  region: string
): Promise<AWSCredentials> {
  const stsClient = new STSClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  const command = new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: `cloudfabric-${Date.now()}`,
    ExternalId: externalId,
    DurationSeconds: 3600,
  });

  const { Credentials } = await stsClient.send(command);

  if (!Credentials?.AccessKeyId || !Credentials?.SecretAccessKey) {
    throw new Error("Failed to assume role: No credentials returned");
  }

  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken,
    region,
  };
}

/**
 * Get a cached or new AWS client for a specific service
 */
export async function getAWSClient<T>(
  tenantId: string,
  service: AWSService,
  region?: string
): Promise<T> {
  const cacheKey = `${tenantId}:${service}:${region || "default"}`;
  const cached = clientCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.client as T;
  }

  const credentials = await getTenantCredentials(tenantId);
  if (!credentials) {
    throw new Error("No AWS credentials available for tenant");
  }

  const clientRegion = region || credentials.region;
  const clientConfig = {
    region: clientRegion,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
    maxAttempts: 3,
  };

  let client: unknown;

  switch (service) {
    case "s3":
      client = new S3Client(clientConfig);
      break;
    case "ec2":
      client = new EC2Client(clientConfig);
      break;
    case "lambda":
      client = new LambdaClient(clientConfig);
      break;
    case "rds":
      client = new RDSClient(clientConfig);
      break;
    case "iam":
      client = new IAMClient({ ...clientConfig, region: "us-east-1" }); // IAM is global
      break;
    case "cloudwatch":
      client = new CloudWatchClient(clientConfig);
      break;
    case "costexplorer":
      client = new CostExplorerClient({ ...clientConfig, region: "us-east-1" }); // Cost Explorer is global
      break;
    default:
      throw new Error(`Unsupported AWS service: ${service}`);
  }

  clientCache.set(cacheKey, {
    client,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return client as T;
}

/**
 * Convenience methods for getting typed clients
 */
export async function getS3Client(tenantId: string, region?: string): Promise<S3Client> {
  return getAWSClient<S3Client>(tenantId, "s3", region);
}

export async function getEC2Client(tenantId: string, region?: string): Promise<EC2Client> {
  return getAWSClient<EC2Client>(tenantId, "ec2", region);
}

export async function getLambdaClient(tenantId: string, region?: string): Promise<LambdaClient> {
  return getAWSClient<LambdaClient>(tenantId, "lambda", region);
}

export async function getRDSClient(tenantId: string, region?: string): Promise<RDSClient> {
  return getAWSClient<RDSClient>(tenantId, "rds", region);
}

export async function getIAMClient(tenantId: string): Promise<IAMClient> {
  return getAWSClient<IAMClient>(tenantId, "iam");
}

export async function getCloudWatchClient(tenantId: string, region?: string): Promise<CloudWatchClient> {
  return getAWSClient<CloudWatchClient>(tenantId, "cloudwatch", region);
}

export async function getCostExplorerClient(tenantId: string): Promise<CostExplorerClient> {
  return getAWSClient<CostExplorerClient>(tenantId, "costexplorer");
}

/**
 * Verify AWS credentials are valid
 */
export async function verifyCredentials(tenantId: string): Promise<{ valid: boolean; accountId?: string; error?: string }> {
  try {
    const credentials = await getTenantCredentials(tenantId);
    if (!credentials) {
      return { valid: false, error: "No credentials configured" };
    }

    const stsClient = new STSClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const { Account } = await stsClient.send(new GetCallerIdentityCommand({}));
    return { valid: true, accountId: Account };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Clear cached clients for a tenant (call when credentials change)
 */
export function clearClientCache(tenantId: string): void {
  for (const key of clientCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) {
      clientCache.delete(key);
    }
  }
}

/**
 * AWS Regions list
 */
export const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-west-3", label: "Europe (Paris)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-north-1", label: "Europe (Stockholm)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
  { value: "ca-central-1", label: "Canada (Central)" },
];

/**
 * Resource type to AWS service mapping
 */
export const RESOURCE_SERVICE_MAP: Record<string, AWSService> = {
  EC2: "ec2",
  S3: "s3",
  LAMBDA: "lambda",
  RDS: "rds",
  VPC: "ec2",
  SUBNET: "ec2",
  SECURITY_GROUP: "ec2",
  IAM_ROLE: "iam",
  IAM_POLICY: "iam",
};
