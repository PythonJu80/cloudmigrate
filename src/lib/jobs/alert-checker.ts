/**
 * Alert Checker Background Job
 * 
 * Polls CloudWatch metrics and creates AlertIncidents when thresholds are breached.
 * Should be run on a schedule (e.g., every minute via cron or setInterval).
 */

import { prisma } from "../db";
import { getMetricValue } from "../aws/cloudwatch";
import { events } from "../events/bus";

// Metric namespace mapping
const METRIC_NAMESPACES: Record<string, string> = {
  CPU: "AWS/EC2",
  MEMORY: "AWS/EC2", // Requires CloudWatch Agent
  STORAGE: "AWS/EBS",
  NETWORK_IN: "AWS/EC2",
  NETWORK_OUT: "AWS/EC2",
  ERROR_RATE: "AWS/Lambda",
  LATENCY: "AWS/ApplicationELB",
  COST: "AWS/Billing",
  RDS_CONNECTIONS: "AWS/RDS",
  RDS_STORAGE: "AWS/RDS",
  LAMBDA_ERRORS: "AWS/Lambda",
  LAMBDA_DURATION: "AWS/Lambda",
};

const METRIC_NAMES: Record<string, string> = {
  CPU: "CPUUtilization",
  MEMORY: "MemoryUtilization",
  STORAGE: "VolumeReadOps",
  NETWORK_IN: "NetworkIn",
  NETWORK_OUT: "NetworkOut",
  ERROR_RATE: "Errors",
  LATENCY: "TargetResponseTime",
  RDS_CONNECTIONS: "DatabaseConnections",
  RDS_STORAGE: "FreeStorageSpace",
  LAMBDA_ERRORS: "Errors",
  LAMBDA_DURATION: "Duration",
};

// Operator functions
const OPERATORS: Record<string, (value: number, threshold: number) => boolean> = {
  GT: (v, t) => v > t,
  GTE: (v, t) => v >= t,
  LT: (v, t) => v < t,
  LTE: (v, t) => v <= t,
  EQ: (v, t) => v === t,
};

/**
 * Check all enabled alert rules and create incidents if thresholds are breached
 */
export async function checkAlertRules(): Promise<{
  checked: number;
  triggered: number;
  errors: number;
}> {
  const stats = { checked: 0, triggered: 0, errors: 0 };

  // Get all enabled alert rules grouped by tenant
  const rules = await prisma.alertRule.findMany({
    where: { enabled: true },
    include: {
      incidents: {
        where: { status: "OPEN" },
        take: 1,
      },
    },
  });

  console.log(`[AlertChecker] Checking ${rules.length} alert rules`);

  for (const rule of rules) {
    stats.checked++;

    try {
      // Get the metric namespace and name
      const namespace = METRIC_NAMESPACES[rule.metric];
      const metricName = METRIC_NAMES[rule.metric];

      if (!namespace || !metricName) {
        console.warn(`[AlertChecker] Unknown metric: ${rule.metric}`);
        continue;
      }

      // Build dimensions if resource-specific
      const dimensions = rule.resourceId
        ? [{ name: "InstanceId", value: rule.resourceId }]
        : undefined;

      // Fetch current metric value from CloudWatch
      const value = await getMetricValue(
        rule.tenantId,
        namespace,
        metricName,
        dimensions,
        rule.duration
      );

      if (value === null) {
        // No data available - skip
        continue;
      }

      // Check if threshold is breached
      const operator = OPERATORS[rule.operator];
      if (!operator) {
        console.warn(`[AlertChecker] Unknown operator: ${rule.operator}`);
        continue;
      }

      const isBreached = operator(value, rule.threshold);

      if (isBreached) {
        // Check if there's already an open incident for this rule
        if (rule.incidents.length > 0) {
          // Already has an open incident - skip
          continue;
        }

        // Create new incident
        const incident = await prisma.alertIncident.create({
          data: {
            alertRuleId: rule.id,
            status: "OPEN",
            severity: value >= rule.threshold * 1.5 ? "CRITICAL" : "WARNING",
            value,
            message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.operator} ${rule.threshold})`,
            resourceArn: rule.resourceId || undefined,
          },
        });

        // Update rule's lastTriggered
        await prisma.alertRule.update({
          where: { id: rule.id },
          data: { lastTriggered: new Date() },
        });

        // Emit event
        await events.alertTriggered(
          rule.tenantId,
          rule.id,
          value,
          rule.threshold,
          rule.resourceId || undefined
        );

        console.log(`[AlertChecker] Alert triggered: ${rule.name} (${value} ${rule.operator} ${rule.threshold})`);
        stats.triggered++;

        // TODO: Send notifications based on rule.channels
        // This would integrate with email, Slack, webhooks, etc.
      } else {
        // Threshold not breached - auto-resolve any open incidents
        if (rule.incidents.length > 0) {
          await prisma.alertIncident.updateMany({
            where: {
              alertRuleId: rule.id,
              status: "OPEN",
            },
            data: {
              status: "RESOLVED",
              resolvedAt: new Date(),
            },
          });

          await events.alertResolved(rule.tenantId, rule.incidents[0].id);
          console.log(`[AlertChecker] Alert auto-resolved: ${rule.name}`);
        }
      }
    } catch (error) {
      console.error(`[AlertChecker] Error checking rule ${rule.id}:`, error);
      stats.errors++;
    }
  }

  console.log(`[AlertChecker] Complete: ${stats.checked} checked, ${stats.triggered} triggered, ${stats.errors} errors`);
  return stats;
}

/**
 * Start the alert checker as a background interval
 * Call this once on server startup
 */
let intervalId: NodeJS.Timeout | null = null;

export function startAlertChecker(intervalMs: number = 60000): void {
  if (intervalId) {
    console.log("[AlertChecker] Already running");
    return;
  }

  console.log(`[AlertChecker] Starting with ${intervalMs}ms interval`);
  
  // Run immediately on start
  checkAlertRules().catch(console.error);

  // Then run on interval
  intervalId = setInterval(() => {
    checkAlertRules().catch(console.error);
  }, intervalMs);
}

export function stopAlertChecker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[AlertChecker] Stopped");
  }
}
