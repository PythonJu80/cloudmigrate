// CloudFlow Cloud Provider Clients
// Initialize SDK clients with tenant credentials

import { 
  getAwsCredentials, 
  getGcpCredentials, 
  getAzureCredentials 
} from "@/lib/secrets";

// AWS SDK imports (dynamic to avoid client-side issues)
let EC2Client: any, 
    LambdaClient: any, 
    S3Client: any, 
    SNSClient: any, 
    SQSClient: any,
    DynamoDBClient: any,
    SecretsManagerClient: any,
    STSClient: any,
    IAMClient: any;

// Lazy load AWS SDK
async function loadAwsSdk() {
  if (!EC2Client) {
    const ec2 = await import("@aws-sdk/client-ec2");
    const lambda = await import("@aws-sdk/client-lambda");
    const s3 = await import("@aws-sdk/client-s3");
    const sns = await import("@aws-sdk/client-sns");
    const sqs = await import("@aws-sdk/client-sqs");
    const dynamodb = await import("@aws-sdk/client-dynamodb");
    const secretsmanager = await import("@aws-sdk/client-secrets-manager");
    const sts = await import("@aws-sdk/client-sts");
    const iam = await import("@aws-sdk/client-iam");
    
    EC2Client = ec2.EC2Client;
    LambdaClient = lambda.LambdaClient;
    S3Client = s3.S3Client;
    SNSClient = sns.SNSClient;
    SQSClient = sqs.SQSClient;
    DynamoDBClient = dynamodb.DynamoDBClient;
    SecretsManagerClient = secretsmanager.SecretsManagerClient;
    STSClient = sts.STSClient;
    IAMClient = iam.IAMClient;
  }
}

export interface AwsClients {
  ec2: any;
  lambda: any;
  s3: any;
  sns: any;
  sqs: any;
  dynamodb: any;
  secretsmanager: any;
  sts: any;
  iam: any;
  region: string;
}

export interface GcpClients {
  projectId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

export interface AzureClients {
  tenantId: string;
  subscriptionId: string;
  clientId: string;
  clientSecret: string;
}

export interface CloudClients {
  aws?: AwsClients;
  gcp?: GcpClients;
  azure?: AzureClients;
}

/**
 * Initialize AWS clients for a tenant
 */
export async function initAwsClients(
  tenantId: string,
  region: string = "us-east-1"
): Promise<AwsClients | null> {
  const creds = await getAwsCredentials(tenantId);
  
  if (!creds.accessKeyId || !creds.secretAccessKey) {
    return null;
  }

  await loadAwsSdk();

  const credentials = {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
  };

  const config = { region, credentials };

  return {
    ec2: new EC2Client(config),
    lambda: new LambdaClient(config),
    s3: new S3Client(config),
    sns: new SNSClient(config),
    sqs: new SQSClient(config),
    dynamodb: new DynamoDBClient(config),
    secretsmanager: new SecretsManagerClient(config),
    sts: new STSClient(config),
    iam: new IAMClient(config),
    region,
  };
}

/**
 * Initialize GCP clients for a tenant
 */
export async function initGcpClients(
  tenantId: string
): Promise<GcpClients | null> {
  const creds = await getGcpCredentials(tenantId);
  
  if (!creds.projectId || !creds.privateKey) {
    return null;
  }

  // Parse the private key JSON if it's a full service account key
  let credentials: { client_email: string; private_key: string };
  
  try {
    const parsed = JSON.parse(creds.privateKey);
    credentials = {
      client_email: parsed.client_email || creds.serviceAccountEmail || "",
      private_key: parsed.private_key,
    };
  } catch {
    // Assume it's just the private key PEM
    credentials = {
      client_email: creds.serviceAccountEmail || "",
      private_key: creds.privateKey,
    };
  }

  return {
    projectId: creds.projectId,
    credentials,
  };
}

/**
 * Initialize Azure clients for a tenant
 */
export async function initAzureClients(
  tenantId: string
): Promise<AzureClients | null> {
  const creds = await getAzureCredentials(tenantId);
  
  if (!creds.clientId || !creds.clientSecret || !creds.tenantId) {
    return null;
  }

  return {
    tenantId: creds.tenantId,
    subscriptionId: creds.subscriptionId || "",
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
  };
}

/**
 * Initialize all cloud clients for a tenant based on provider
 */
export async function initCloudClients(
  tenantId: string,
  provider: "aws" | "gcp" | "azure",
  region?: string
): Promise<CloudClients> {
  const clients: CloudClients = {};

  switch (provider) {
    case "aws":
      clients.aws = await initAwsClients(tenantId, region) || undefined;
      break;
    case "gcp":
      clients.gcp = await initGcpClients(tenantId) || undefined;
      break;
    case "azure":
      clients.azure = await initAzureClients(tenantId) || undefined;
      break;
  }

  return clients;
}

/**
 * Test AWS credentials by calling STS GetCallerIdentity
 */
export async function testAwsCredentials(tenantId: string): Promise<{
  success: boolean;
  message: string;
  details?: { accountId: string; arn: string };
}> {
  try {
    const clients = await initAwsClients(tenantId);
    if (!clients) {
      return { success: false, message: "AWS credentials not configured" };
    }

    const { GetCallerIdentityCommand } = await import("@aws-sdk/client-sts");
    const response = await clients.sts.send(new GetCallerIdentityCommand({}));

    return {
      success: true,
      message: "AWS credentials valid",
      details: {
        accountId: response.Account || "",
        arn: response.Arn || "",
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to validate AWS credentials",
    };
  }
}

/**
 * Test GCP credentials
 */
export async function testGcpCredentials(tenantId: string): Promise<{
  success: boolean;
  message: string;
  details?: { projectId: string };
}> {
  try {
    const clients = await initGcpClients(tenantId);
    if (!clients) {
      return { success: false, message: "GCP credentials not configured" };
    }

    // For now, just verify we have the credentials
    // Full validation would require calling GCP APIs
    return {
      success: true,
      message: "GCP credentials configured",
      details: {
        projectId: clients.projectId,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to validate GCP credentials",
    };
  }
}

/**
 * Test Azure credentials
 */
export async function testAzureCredentials(tenantId: string): Promise<{
  success: boolean;
  message: string;
  details?: { subscriptionId: string };
}> {
  try {
    const clients = await initAzureClients(tenantId);
    if (!clients) {
      return { success: false, message: "Azure credentials not configured" };
    }

    // For now, just verify we have the credentials
    // Full validation would require calling Azure APIs
    return {
      success: true,
      message: "Azure credentials configured",
      details: {
        subscriptionId: clients.subscriptionId,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to validate Azure credentials",
    };
  }
}
