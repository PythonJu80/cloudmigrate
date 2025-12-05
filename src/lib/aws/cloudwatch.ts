import {
  CloudWatchClient,
  GetMetricDataCommand,
  ListMetricsCommand,
  Dimension,
} from "@aws-sdk/client-cloudwatch";
import {
  HealthClient,
  DescribeEventsCommand,
  DescribeEventDetailsCommand,
} from "@aws-sdk/client-health";
import {
  CloudTrailClient,
  LookupEventsCommand,
} from "@aws-sdk/client-cloudtrail";
import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostForecastCommand,
} from "@aws-sdk/client-cost-explorer";
import {
  ServiceQuotasClient,
  ListServiceQuotasCommand,
} from "@aws-sdk/client-service-quotas";
import {
  EC2Client,
  DescribeInstanceStatusCommand,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";
import { getAwsCredentials } from "../secrets";
import { prisma } from "../db";
import { cacheOrFetch, CacheKeys, CacheTTL } from "../cache";

/**
 * Get tenant's configured AWS region
 */
async function getTenantRegion(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { awsRegion: true },
  });
  return tenant?.awsRegion || "us-east-1";
}

interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface MetricResult {
  id: string;
  label: string;
  values: MetricDataPoint[];
  average?: number;
  max?: number;
  min?: number;
}

interface HealthEvent {
  arn: string;
  service: string;
  eventTypeCode: string;
  eventTypeCategory: string;
  region: string;
  startTime?: Date;
  endTime?: Date;
  lastUpdatedTime?: Date;
  statusCode: string;
  description?: string;
}

/**
 * Create CloudWatch client with tenant credentials and region
 */
export async function createCloudWatchClient(tenantId: string): Promise<CloudWatchClient | null> {
  const [creds, region] = await Promise.all([
    getAwsCredentials(tenantId),
    getTenantRegion(tenantId),
  ]);
  
  if (!creds.accessKeyId || !creds.secretAccessKey) {
    return null;
  }

  return new CloudWatchClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

/**
 * Create Health client with tenant credentials
 * Note: Health API only works in us-east-1
 */
export async function createHealthClient(tenantId: string): Promise<HealthClient | null> {
  const creds = await getAwsCredentials(tenantId);
  
  if (!creds.accessKeyId || !creds.secretAccessKey) {
    return null;
  }

  return new HealthClient({
    region: "us-east-1", // Health API is only available in us-east-1
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

/**
 * Get EC2 CPU utilization metrics
 */
export async function getEC2CpuMetrics(
  tenantId: string,
  instanceIds?: string[],
  periodMinutes: number = 60
): Promise<MetricResult[]> {
  const client = await createCloudWatchClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - periodMinutes * 60 * 1000);

  const queries = instanceIds?.length
    ? instanceIds.map((id, i) => ({
        Id: `cpu_${i}`,
        MetricStat: {
          Metric: {
            Namespace: "AWS/EC2",
            MetricName: "CPUUtilization",
            Dimensions: [{ Name: "InstanceId", Value: id }],
          },
          Period: 300, // 5 minutes
          Stat: "Average",
        },
      }))
    : [
        {
          Id: "cpu_all",
          MetricStat: {
            Metric: {
              Namespace: "AWS/EC2",
              MetricName: "CPUUtilization",
            },
            Period: 300,
            Stat: "Average",
          },
        },
      ];

  const command = new GetMetricDataCommand({
    MetricDataQueries: queries,
    StartTime: startTime,
    EndTime: endTime,
  });

  const response = await client.send(command);
  
  return (response.MetricDataResults || []).map((result) => ({
    id: result.Id || "",
    label: result.Label || "",
    values: (result.Timestamps || []).map((ts, i) => ({
      timestamp: ts,
      value: result.Values?.[i] || 0,
    })),
    average: result.Values?.length
      ? result.Values.reduce((a, b) => a + b, 0) / result.Values.length
      : undefined,
    max: result.Values?.length ? Math.max(...result.Values) : undefined,
    min: result.Values?.length ? Math.min(...result.Values) : undefined,
  }));
}

/**
 * Get aggregated metrics for dashboard
 */
export async function getDashboardMetrics(tenantId: string): Promise<{
  cpu: { current: number; trend: number };
  memory: { current: number; trend: number };
  network: { inbound: number; outbound: number };
  storage: { used: number; total: number };
  errors: { count: number; rate: number };
}> {
  const client = await createCloudWatchClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour
  const prevStartTime = new Date(startTime.getTime() - 60 * 60 * 1000); // Hour before

  const command = new GetMetricDataCommand({
    MetricDataQueries: [
      // Current CPU
      {
        Id: "cpu_current",
        MetricStat: {
          Metric: { Namespace: "AWS/EC2", MetricName: "CPUUtilization" },
          Period: 3600,
          Stat: "Average",
        },
      },
      // Previous CPU (for trend)
      {
        Id: "cpu_prev",
        MetricStat: {
          Metric: { Namespace: "AWS/EC2", MetricName: "CPUUtilization" },
          Period: 3600,
          Stat: "Average",
        },
      },
      // Network In
      {
        Id: "network_in",
        MetricStat: {
          Metric: { Namespace: "AWS/EC2", MetricName: "NetworkIn" },
          Period: 3600,
          Stat: "Sum",
        },
      },
      // Network Out
      {
        Id: "network_out",
        MetricStat: {
          Metric: { Namespace: "AWS/EC2", MetricName: "NetworkOut" },
          Period: 3600,
          Stat: "Sum",
        },
      },
      // Lambda errors
      {
        Id: "lambda_errors",
        MetricStat: {
          Metric: { Namespace: "AWS/Lambda", MetricName: "Errors" },
          Period: 3600,
          Stat: "Sum",
        },
      },
      // Lambda invocations (for error rate)
      {
        Id: "lambda_invocations",
        MetricStat: {
          Metric: { Namespace: "AWS/Lambda", MetricName: "Invocations" },
          Period: 3600,
          Stat: "Sum",
        },
      },
    ],
    StartTime: prevStartTime,
    EndTime: endTime,
  });

  const response = await client.send(command);
  const results = response.MetricDataResults || [];

  const getValue = (id: string, index: number = 0): number => {
    const result = results.find((r) => r.Id === id);
    return result?.Values?.[index] || 0;
  };

  const cpuCurrent = getValue("cpu_current", 0);
  const cpuPrev = getValue("cpu_prev", 1) || cpuCurrent;
  const cpuTrend = cpuPrev > 0 ? ((cpuCurrent - cpuPrev) / cpuPrev) * 100 : 0;

  const networkIn = getValue("network_in") / (1024 * 1024); // Convert to MB
  const networkOut = getValue("network_out") / (1024 * 1024);

  const errors = getValue("lambda_errors");
  const invocations = getValue("lambda_invocations");
  const errorRate = invocations > 0 ? (errors / invocations) * 100 : 0;

  return {
    cpu: { current: Math.round(cpuCurrent * 10) / 10, trend: Math.round(cpuTrend) },
    memory: { current: 0, trend: 0 }, // EC2 doesn't have native memory metrics
    network: { inbound: Math.round(networkIn), outbound: Math.round(networkOut) },
    storage: { used: 0, total: 0 }, // Would need EBS metrics
    errors: { count: errors, rate: Math.round(errorRate * 10) / 10 },
  };
}

/**
 * Get AWS Health events for the account
 */
export async function getHealthEvents(tenantId: string): Promise<HealthEvent[]> {
  const client = await createHealthClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  try {
    const command = new DescribeEventsCommand({
      filter: {
        eventStatusCodes: ["open", "upcoming"],
      },
      maxResults: 20,
    });

    const response = await client.send(command);
    
    return (response.events || []).map((event: any) => ({
      arn: event.arn || "",
      service: event.service || "",
      eventTypeCode: event.eventTypeCode || "",
      eventTypeCategory: event.eventTypeCategory || "",
      region: event.region || "",
      startTime: event.startTime,
      endTime: event.endTime,
      lastUpdatedTime: event.lastUpdatedTime,
      statusCode: event.statusCode || "",
    }));
  } catch (error: any) {
    // Health API requires Business/Enterprise support
    if (error.name === "SubscriptionRequiredException") {
      console.log("AWS Health API requires Business or Enterprise support plan");
      return [];
    }
    throw error;
  }
}

/**
 * List available metrics for the account
 */
export async function listAvailableMetrics(
  tenantId: string,
  namespace?: string
): Promise<{ namespace: string; metricName: string; dimensions: Dimension[] }[]> {
  const client = await createCloudWatchClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const command = new ListMetricsCommand({
    Namespace: namespace,
  });

  const response = await client.send(command);
  
  return (response.Metrics || []).map((m) => ({
    namespace: m.Namespace || "",
    metricName: m.MetricName || "",
    dimensions: m.Dimensions || [],
  }));
}

/**
 * Get specific metric value (for alert checking)
 */
export async function getMetricValue(
  tenantId: string,
  namespace: string,
  metricName: string,
  dimensions?: { name: string; value: string }[],
  periodSeconds: number = 300
): Promise<number | null> {
  const client = await createCloudWatchClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - periodSeconds * 1000);

  const command = new GetMetricDataCommand({
    MetricDataQueries: [
      {
        Id: "m1",
        MetricStat: {
          Metric: {
            Namespace: namespace,
            MetricName: metricName,
            Dimensions: dimensions?.map((d) => ({ Name: d.name, Value: d.value })),
          },
          Period: periodSeconds,
          Stat: "Average",
        },
      },
    ],
    StartTime: startTime,
    EndTime: endTime,
  });

  const response = await client.send(command);
  const values = response.MetricDataResults?.[0]?.Values;
  
  return values?.length ? values[0] : null;
}

// ============================================
// CloudTrail - Audit Logs
// ============================================

/**
 * Create CloudTrail client with tenant's region
 */
async function createCloudTrailClient(tenantId: string): Promise<CloudTrailClient | null> {
  const [creds, region] = await Promise.all([
    getAwsCredentials(tenantId),
    getTenantRegion(tenantId),
  ]);
  if (!creds.accessKeyId || !creds.secretAccessKey) return null;

  return new CloudTrailClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

export interface AuditEvent {
  eventId: string;
  eventName: string;
  eventSource: string;
  eventTime: Date;
  username: string;
  sourceIp: string;
  awsRegion: string;
  errorCode?: string;
  errorMessage?: string;
  resources: { type: string; name: string }[];
}

/**
 * Get recent CloudTrail events (audit log)
 */
export async function getAuditEvents(
  tenantId: string,
  options?: {
    startTime?: Date;
    endTime?: Date;
    eventName?: string;
    maxResults?: number;
  }
): Promise<AuditEvent[]> {
  const client = await createCloudTrailClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endTime = options?.endTime || new Date();
  const startTime = options?.startTime || new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24h

  const command = new LookupEventsCommand({
    StartTime: startTime,
    EndTime: endTime,
    MaxResults: options?.maxResults || 50,
    LookupAttributes: options?.eventName
      ? [{ AttributeKey: "EventName", AttributeValue: options.eventName }]
      : undefined,
  });

  const response = await client.send(command);

  return (response.Events || []).map((event: any) => {
    const cloudTrailEvent = event.CloudTrailEvent ? JSON.parse(event.CloudTrailEvent) : {};
    return {
      eventId: event.EventId || "",
      eventName: event.EventName || "",
      eventSource: event.EventSource || "",
      eventTime: event.EventTime || new Date(),
      username: event.Username || cloudTrailEvent.userIdentity?.userName || "Unknown",
      sourceIp: cloudTrailEvent.sourceIPAddress || "",
      awsRegion: cloudTrailEvent.awsRegion || "",
      errorCode: cloudTrailEvent.errorCode,
      errorMessage: cloudTrailEvent.errorMessage,
      resources: (event.Resources || []).map((r: any) => ({
        type: r.ResourceType || "",
        name: r.ResourceName || "",
      })),
    };
  });
}

/**
 * Get security-relevant events (failed logins, IAM changes, etc.)
 */
export async function getSecurityEvents(tenantId: string): Promise<AuditEvent[]> {
  const client = await createCloudTrailClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  // Security-relevant event names
  const securityEvents = [
    "ConsoleLogin",
    "CreateUser",
    "DeleteUser",
    "CreateAccessKey",
    "DeleteAccessKey",
    "AttachUserPolicy",
    "DetachUserPolicy",
    "CreateRole",
    "DeleteRole",
    "PutBucketPolicy",
    "DeleteBucketPolicy",
    "AuthorizeSecurityGroupIngress",
    "RevokeSecurityGroupIngress",
  ];

  const allEvents: AuditEvent[] = [];

  for (const eventName of securityEvents.slice(0, 5)) { // Limit API calls
    try {
      const events = await getAuditEvents(tenantId, { startTime, endTime, eventName, maxResults: 10 });
      allEvents.push(...events);
    } catch (e) {
      // Some events may not exist
    }
  }

  return allEvents.sort((a, b) => b.eventTime.getTime() - a.eventTime.getTime());
}

// ============================================
// Cost Explorer - Billing & Costs
// ============================================

/**
 * Create Cost Explorer client
 */
async function createCostExplorerClient(tenantId: string): Promise<CostExplorerClient | null> {
  const creds = await getAwsCredentials(tenantId);
  if (!creds.accessKeyId || !creds.secretAccessKey) return null;

  return new CostExplorerClient({
    region: "us-east-1", // Cost Explorer only works in us-east-1
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

export interface CostData {
  daily: { date: string; amount: number }[];
  byService: { service: string; amount: number }[];
  total: number;
  forecast: number;
}

/**
 * Get cost and usage data
 */
export async function getCostData(tenantId: string, days: number = 30): Promise<CostData> {
  const client = await createCostExplorerClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // Get daily costs
  const costCommand = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: formatDate(startDate),
      End: formatDate(endDate),
    },
    Granularity: "DAILY",
    Metrics: ["UnblendedCost"],
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
  });

  const costResponse = await client.send(costCommand);

  const daily: { date: string; amount: number }[] = [];
  const serviceMap: Record<string, number> = {};

  for (const result of costResponse.ResultsByTime || []) {
    let dayTotal = 0;
    for (const group of result.Groups || []) {
      const service = group.Keys?.[0] || "Other";
      const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || "0");
      dayTotal += amount;
      serviceMap[service] = (serviceMap[service] || 0) + amount;
    }
    daily.push({ date: result.TimePeriod?.Start || "", amount: Math.round(dayTotal * 100) / 100 });
  }

  const byService = Object.entries(serviceMap)
    .map(([service, amount]) => ({ service, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  const total = daily.reduce((sum, d) => sum + d.amount, 0);

  // Get forecast
  let forecast = 0;
  try {
    const forecastCommand = new GetCostForecastCommand({
      TimePeriod: {
        Start: formatDate(endDate),
        End: formatDate(new Date(endDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
      },
      Metric: "UNBLENDED_COST",
      Granularity: "MONTHLY",
    });
    const forecastResponse = await client.send(forecastCommand);
    forecast = parseFloat(forecastResponse.Total?.Amount || "0");
  } catch (e) {
    // Forecast may fail if not enough data
    forecast = total; // Estimate based on current period
  }

  return {
    daily,
    byService,
    total: Math.round(total * 100) / 100,
    forecast: Math.round(forecast * 100) / 100,
  };
}

// ============================================
// Service Quotas - Limits Tracking
// ============================================

/**
 * Create Service Quotas client with tenant's region
 */
async function createServiceQuotasClient(tenantId: string): Promise<ServiceQuotasClient | null> {
  const [creds, region] = await Promise.all([
    getAwsCredentials(tenantId),
    getTenantRegion(tenantId),
  ]);
  if (!creds.accessKeyId || !creds.secretAccessKey) return null;

  return new ServiceQuotasClient({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

export interface ServiceQuota {
  serviceName: string;
  quotaName: string;
  quotaCode: string;
  value: number;
  unit: string;
  adjustable: boolean;
}

/**
 * Get service quotas for key services
 */
export async function getServiceQuotas(tenantId: string): Promise<ServiceQuota[]> {
  const client = await createServiceQuotasClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const services = ["ec2", "lambda", "s3", "rds", "iam"];
  const quotas: ServiceQuota[] = [];

  for (const serviceCode of services) {
    try {
      const command = new ListServiceQuotasCommand({
        ServiceCode: serviceCode,
        MaxResults: 10,
      });
      const response = await client.send(command);

      for (const quota of response.Quotas || []) {
        quotas.push({
          serviceName: quota.ServiceName || serviceCode,
          quotaName: quota.QuotaName || "",
          quotaCode: quota.QuotaCode || "",
          value: quota.Value || 0,
          unit: quota.Unit || "",
          adjustable: quota.Adjustable || false,
        });
      }
    } catch (e) {
      // Some services may not have quotas accessible
    }
  }

  return quotas;
}

// ============================================
// EC2 Instance Health
// ============================================

/**
 * Create EC2 client with tenant's region
 */
async function createEC2Client(tenantId: string): Promise<EC2Client | null> {
  const [creds, region] = await Promise.all([
    getAwsCredentials(tenantId),
    getTenantRegion(tenantId),
  ]);
  if (!creds.accessKeyId || !creds.secretAccessKey) return null;

  return new EC2Client({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

export interface InstanceHealth {
  instanceId: string;
  instanceType: string;
  state: string;
  availabilityZone: string;
  systemStatus: string;
  instanceStatus: string;
  systemStatusDetails: string[];
  instanceStatusDetails: string[];
}

/**
 * Get EC2 instance health status
 */
export async function getInstanceHealth(tenantId: string): Promise<InstanceHealth[]> {
  const client = await createEC2Client(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  // First get instances
  const instancesCommand = new DescribeInstancesCommand({});
  const instancesResponse = await client.send(instancesCommand);

  const instanceMap: Record<string, { type: string; az: string; state: string }> = {};
  for (const reservation of instancesResponse.Reservations || []) {
    for (const instance of reservation.Instances || []) {
      if (instance.InstanceId) {
        instanceMap[instance.InstanceId] = {
          type: instance.InstanceType || "",
          az: instance.Placement?.AvailabilityZone || "",
          state: instance.State?.Name || "",
        };
      }
    }
  }

  // Then get status
  const statusCommand = new DescribeInstanceStatusCommand({
    IncludeAllInstances: true,
  });
  const statusResponse = await client.send(statusCommand);

  return (statusResponse.InstanceStatuses || []).map((status: any) => {
    const instanceId = status.InstanceId || "";
    const info = instanceMap[instanceId] || { type: "", az: "", state: "" };

    return {
      instanceId,
      instanceType: info.type,
      state: info.state,
      availabilityZone: info.az,
      systemStatus: status.SystemStatus?.Status || "unknown",
      instanceStatus: status.InstanceStatus?.Status || "unknown",
      systemStatusDetails: (status.SystemStatus?.Details || []).map((d: any) => d.Name),
      instanceStatusDetails: (status.InstanceStatus?.Details || []).map((d: any) => d.Name),
    };
  });
}

// ============================================
// Expanded Dashboard Metrics (with caching)
// ============================================

/**
 * Fetch CloudWatch metrics (internal, no cache)
 */
async function fetchCloudWatchMetrics(tenantId: string) {
  const client = await createCloudWatchClient(tenantId);
  if (!client) throw new Error("AWS credentials not configured");

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

  const command = new GetMetricDataCommand({
    MetricDataQueries: [
      // EC2
      { Id: "cpu", MetricStat: { Metric: { Namespace: "AWS/EC2", MetricName: "CPUUtilization" }, Period: 300, Stat: "Average" } },
      { Id: "status_check", MetricStat: { Metric: { Namespace: "AWS/EC2", MetricName: "StatusCheckFailed" }, Period: 300, Stat: "Sum" } },
      { Id: "cpu_credits", MetricStat: { Metric: { Namespace: "AWS/EC2", MetricName: "CPUCreditBalance" }, Period: 300, Stat: "Average" } },
      { Id: "network_in", MetricStat: { Metric: { Namespace: "AWS/EC2", MetricName: "NetworkIn" }, Period: 300, Stat: "Sum" } },
      { Id: "network_out", MetricStat: { Metric: { Namespace: "AWS/EC2", MetricName: "NetworkOut" }, Period: 300, Stat: "Sum" } },
      // RDS
      { Id: "rds_connections", MetricStat: { Metric: { Namespace: "AWS/RDS", MetricName: "DatabaseConnections" }, Period: 300, Stat: "Average" } },
      { Id: "rds_storage", MetricStat: { Metric: { Namespace: "AWS/RDS", MetricName: "FreeStorageSpace" }, Period: 300, Stat: "Average" } },
      // Lambda
      { Id: "lambda_invocations", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Invocations" }, Period: 300, Stat: "Sum" } },
      { Id: "lambda_duration", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Duration" }, Period: 300, Stat: "Average" } },
      { Id: "lambda_errors", MetricStat: { Metric: { Namespace: "AWS/Lambda", MetricName: "Errors" }, Period: 300, Stat: "Sum" } },
      // ALB
      { Id: "alb_requests", MetricStat: { Metric: { Namespace: "AWS/ApplicationELB", MetricName: "RequestCount" }, Period: 300, Stat: "Sum" } },
      { Id: "alb_latency", MetricStat: { Metric: { Namespace: "AWS/ApplicationELB", MetricName: "TargetResponseTime" }, Period: 300, Stat: "Average" } },
      { Id: "alb_5xx", MetricStat: { Metric: { Namespace: "AWS/ApplicationELB", MetricName: "HTTPCode_ELB_5XX_Count" }, Period: 300, Stat: "Sum" } },
    ],
    StartTime: startTime,
    EndTime: endTime,
  });

  const response = await client.send(command);
  const results = response.MetricDataResults || [];

  const getValue = (id: string): number => {
    const result = results.find((r) => r.Id === id);
    return result?.Values?.[0] || 0;
  };

  return {
    cpu: { current: Math.round(getValue("cpu") * 10) / 10, trend: 0 },
    memory: { current: 0, trend: 0 }, // Requires CloudWatch Agent
    network: {
      inbound: Math.round(getValue("network_in") / (1024 * 1024)),
      outbound: Math.round(getValue("network_out") / (1024 * 1024)),
    },
    errors: {
      count: getValue("lambda_errors"),
      rate: getValue("lambda_invocations") > 0
        ? Math.round((getValue("lambda_errors") / getValue("lambda_invocations")) * 100 * 10) / 10
        : 0,
    },
    ec2: {
      statusCheckFailed: getValue("status_check"),
      cpuCredits: Math.round(getValue("cpu_credits")),
    },
    rds: {
      connections: Math.round(getValue("rds_connections")),
      freeStorage: Math.round(getValue("rds_storage") / (1024 * 1024 * 1024)),
    },
    lambda: {
      invocations: getValue("lambda_invocations"),
      duration: Math.round(getValue("lambda_duration")),
      errors: getValue("lambda_errors"),
    },
    alb: {
      requestCount: getValue("alb_requests"),
      latency: Math.round(getValue("alb_latency") * 1000),
      http5xx: getValue("alb_5xx"),
    },
  };
}

/**
 * Get comprehensive dashboard metrics from all sources (with Redis caching)
 */
export async function getFullDashboardMetrics(tenantId: string): Promise<{
  cloudwatch: {
    cpu: { current: number; trend: number };
    memory: { current: number; trend: number };
    network: { inbound: number; outbound: number };
    errors: { count: number; rate: number };
    ec2: { statusCheckFailed: number; cpuCredits: number };
    rds: { connections: number; freeStorage: number };
    lambda: { invocations: number; duration: number; errors: number };
    alb: { requestCount: number; latency: number; http5xx: number };
  };
  instances: InstanceHealth[];
  costs: CostData | null;
  quotas: ServiceQuota[];
  auditEvents: AuditEvent[];
}> {
  // Fetch all data with caching (parallel)
  const [cloudwatch, instances, costs, quotas, auditEvents] = await Promise.all([
    // CloudWatch metrics - cache 1 minute
    cacheOrFetch(
      CacheKeys.metrics(tenantId),
      () => fetchCloudWatchMetrics(tenantId),
      CacheTTL.METRICS
    ),
    // EC2 instances - cache 2 minutes
    cacheOrFetch(
      CacheKeys.instances(tenantId),
      () => getInstanceHealth(tenantId).catch(() => []),
      CacheTTL.INSTANCES
    ),
    // Costs - cache 15 minutes
    cacheOrFetch(
      CacheKeys.costs(tenantId),
      () => getCostData(tenantId, 7).catch(() => null),
      CacheTTL.COSTS
    ),
    // Quotas - cache 1 hour
    cacheOrFetch(
      CacheKeys.quotas(tenantId),
      () => getServiceQuotas(tenantId).catch(() => []),
      CacheTTL.QUOTAS
    ),
    // Audit events - cache 30 seconds
    cacheOrFetch(
      CacheKeys.auditEvents(tenantId),
      () => getAuditEvents(tenantId, { maxResults: 20 }).catch(() => []),
      CacheTTL.AUDIT_EVENTS
    ),
  ]);

  return {
    cloudwatch,
    instances,
    costs,
    quotas,
    auditEvents,
  };
}
