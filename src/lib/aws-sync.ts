// AWS Resource Sync - Discovers which AWS services a tenant uses
import { 
  EC2Client, 
  DescribeInstancesCommand 
} from "@aws-sdk/client-ec2";
import { 
  S3Client, 
  ListBucketsCommand 
} from "@aws-sdk/client-s3";
import { 
  LambdaClient, 
  ListFunctionsCommand 
} from "@aws-sdk/client-lambda";
import { 
  DynamoDBClient, 
  ListTablesCommand 
} from "@aws-sdk/client-dynamodb";
import { 
  RDSClient, 
  DescribeDBInstancesCommand 
} from "@aws-sdk/client-rds";
import { 
  SNSClient, 
  ListTopicsCommand 
} from "@aws-sdk/client-sns";
import { 
  SQSClient, 
  ListQueuesCommand 
} from "@aws-sdk/client-sqs";
import {
  CloudWatchClient,
  DescribeAlarmsCommand
} from "@aws-sdk/client-cloudwatch";
import {
  APIGatewayClient,
  GetRestApisCommand
} from "@aws-sdk/client-api-gateway";
import {
  EventBridgeClient,
  ListRulesCommand
} from "@aws-sdk/client-eventbridge";
import {
  SecretsManagerClient,
  ListSecretsCommand
} from "@aws-sdk/client-secrets-manager";
import {
  Route53Client,
  ListHostedZonesCommand
} from "@aws-sdk/client-route-53";
import {
  CloudFrontClient,
  ListDistributionsCommand
} from "@aws-sdk/client-cloudfront";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
  KinesisClient,
  ListStreamsCommand
} from "@aws-sdk/client-kinesis";
import {
  SFNClient,
  ListStateMachinesCommand
} from "@aws-sdk/client-sfn";
import {
  SESClient,
  ListIdentitiesCommand
} from "@aws-sdk/client-ses";

import { prisma } from "./db";
import { getAwsCredentials } from "./secrets";

// Map of AWS service to check function
interface ServiceCheck {
  service: string;
  label: string;
  check: (credentials: AwsCredentials, region: string) => Promise<number>;
}

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

interface SyncResult {
  service: string;
  label: string;
  count: number;
  synced: boolean;
}

// Service checks - each returns count of resources
const serviceChecks: ServiceCheck[] = [
  {
    service: "ec2",
    label: "EC2 Instances",
    check: async (creds, region) => {
      const client = new EC2Client({ credentials: creds, region });
      const result = await client.send(new DescribeInstancesCommand({}));
      return result.Reservations?.reduce((acc, r) => acc + (r.Instances?.length || 0), 0) || 0;
    },
  },
  {
    service: "s3",
    label: "S3 Buckets",
    check: async (creds, region) => {
      const client = new S3Client({ credentials: creds, region });
      const result = await client.send(new ListBucketsCommand({}));
      return result.Buckets?.length || 0;
    },
  },
  {
    service: "lambda",
    label: "Lambda Functions",
    check: async (creds, region) => {
      const client = new LambdaClient({ credentials: creds, region });
      const result = await client.send(new ListFunctionsCommand({}));
      return result.Functions?.length || 0;
    },
  },
  {
    service: "dynamodb",
    label: "DynamoDB Tables",
    check: async (creds, region) => {
      const client = new DynamoDBClient({ credentials: creds, region });
      const result = await client.send(new ListTablesCommand({}));
      return result.TableNames?.length || 0;
    },
  },
  {
    service: "rds",
    label: "RDS Databases",
    check: async (creds, region) => {
      const client = new RDSClient({ credentials: creds, region });
      const result = await client.send(new DescribeDBInstancesCommand({}));
      return result.DBInstances?.length || 0;
    },
  },
  {
    service: "sns",
    label: "SNS Topics",
    check: async (creds, region) => {
      const client = new SNSClient({ credentials: creds, region });
      const result = await client.send(new ListTopicsCommand({}));
      return result.Topics?.length || 0;
    },
  },
  {
    service: "sqs",
    label: "SQS Queues",
    check: async (creds, region) => {
      const client = new SQSClient({ credentials: creds, region });
      const result = await client.send(new ListQueuesCommand({}));
      return result.QueueUrls?.length || 0;
    },
  },
  {
    service: "cloudwatch",
    label: "CloudWatch Alarms",
    check: async (creds, region) => {
      const client = new CloudWatchClient({ credentials: creds, region });
      const result = await client.send(new DescribeAlarmsCommand({}));
      return result.MetricAlarms?.length || 0;
    },
  },
  {
    service: "apigateway",
    label: "API Gateway APIs",
    check: async (creds, region) => {
      const client = new APIGatewayClient({ credentials: creds, region });
      const result = await client.send(new GetRestApisCommand({}));
      return result.items?.length || 0;
    },
  },
  {
    service: "eventbridge",
    label: "EventBridge Rules",
    check: async (creds, region) => {
      const client = new EventBridgeClient({ credentials: creds, region });
      const result = await client.send(new ListRulesCommand({}));
      return result.Rules?.length || 0;
    },
  },
  {
    service: "secretsmanager",
    label: "Secrets Manager",
    check: async (creds, region) => {
      const client = new SecretsManagerClient({ credentials: creds, region });
      const result = await client.send(new ListSecretsCommand({}));
      return result.SecretList?.length || 0;
    },
  },
  {
    service: "route53",
    label: "Route 53 Zones",
    check: async (creds, region) => {
      const client = new Route53Client({ credentials: creds, region });
      const result = await client.send(new ListHostedZonesCommand({}));
      return result.HostedZones?.length || 0;
    },
  },
  {
    service: "cloudfront",
    label: "CloudFront Distributions",
    check: async (creds, region) => {
      const client = new CloudFrontClient({ credentials: creds, region });
      const result = await client.send(new ListDistributionsCommand({}));
      return result.DistributionList?.Items?.length || 0;
    },
  },
  {
    service: "elb",
    label: "Load Balancers",
    check: async (creds, region) => {
      const client = new ElasticLoadBalancingV2Client({ credentials: creds, region });
      const result = await client.send(new DescribeLoadBalancersCommand({}));
      return result.LoadBalancers?.length || 0;
    },
  },
  {
    service: "kinesis",
    label: "Kinesis Streams",
    check: async (creds, region) => {
      const client = new KinesisClient({ credentials: creds, region });
      const result = await client.send(new ListStreamsCommand({}));
      return result.StreamNames?.length || 0;
    },
  },
  {
    service: "stepfunctions",
    label: "Step Functions",
    check: async (creds, region) => {
      const client = new SFNClient({ credentials: creds, region });
      const result = await client.send(new ListStateMachinesCommand({}));
      return result.stateMachines?.length || 0;
    },
  },
  {
    service: "ses",
    label: "SES Identities",
    check: async (creds, region) => {
      const client = new SESClient({ credentials: creds, region });
      const result = await client.send(new ListIdentitiesCommand({}));
      return result.Identities?.length || 0;
    },
  },
];

/**
 * Sync AWS resources for a tenant
 * Returns list of services with resource counts
 */
export async function syncAwsResources(
  tenantId: string,
  region: string = "us-east-1"
): Promise<SyncResult[]> {
  // Get credentials
  const awsCreds = await getAwsCredentials(tenantId);
  
  if (!awsCreds.accessKeyId || !awsCreds.secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  const credentials = {
    accessKeyId: awsCreds.accessKeyId,
    secretAccessKey: awsCreds.secretAccessKey,
  };

  const results: SyncResult[] = [];

  // Check each service in parallel (with concurrency limit)
  const checkPromises = serviceChecks.map(async (check) => {
    try {
      const count = await check.check(credentials, region);
      return {
        service: check.service,
        label: check.label,
        count,
        synced: true,
      };
    } catch (error: any) {
      // Service might not be accessible or no permissions
      console.log(`[AWS Sync] ${check.service}: ${error.message}`);
      return {
        service: check.service,
        label: check.label,
        count: 0,
        synced: false,
      };
    }
  });

  const checkResults = await Promise.all(checkPromises);
  
  // Save to CloudResource table
  for (const result of checkResults) {
    if (result.count > 0) {
      // Upsert a summary record for this service
      await prisma.cloudResource.upsert({
        where: {
          tenantId_arn: {
            tenantId,
            arn: `arn:aws:${result.service}:${region}:summary`,
          },
        },
        update: {
          name: result.label,
          config: JSON.stringify({ count: result.count }),
          status: "ACTIVE",
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          type: result.service.toUpperCase(),
          arn: `arn:aws:${result.service}:${region}:summary`,
          name: result.label,
          region,
          status: "ACTIVE",
          config: JSON.stringify({ count: result.count }),
        },
      });
    }
    results.push(result);
  }

  return results;
}

/**
 * Get synced services for a tenant (from CloudResource table)
 */
export async function getSyncedServices(tenantId: string): Promise<string[]> {
  const resources = await prisma.cloudResource.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    select: {
      type: true,
    },
    distinct: ["type"],
  });

  return resources.map((r) => r.type.toLowerCase());
}

/**
 * Get service counts for a tenant
 */
export async function getServiceCounts(tenantId: string): Promise<Record<string, number>> {
  const resources = await prisma.cloudResource.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    select: {
      type: true,
      config: true,
    },
  });

  const counts: Record<string, number> = {};
  for (const r of resources) {
    try {
      const config = JSON.parse(r.config);
      counts[r.type.toLowerCase()] = config.count || 0;
    } catch {
      counts[r.type.toLowerCase()] = 0;
    }
  }

  return counts;
}
