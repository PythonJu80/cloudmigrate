/**
 * Neo4j Graph Usage Tracking & Billing
 * 
 * This module handles:
 * 1. Tracking graph query usage per tenant
 * 2. Enforcing plan limits
 * 3. Reporting usage to Stripe for metered billing
 */

import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Plan limits configuration
export const PLAN_LIMITS = {
  FREE: {
    queriesPerMonth: 100,
    nodesPerMonth: 10000,
    embeddingsPerMonth: 50,
    computeSecondsPerMonth: 60, // 1 minute
  },
  PRO: {
    queriesPerMonth: 10000,
    nodesPerMonth: 1000000,
    embeddingsPerMonth: 5000,
    computeSecondsPerMonth: 3600, // 1 hour
  },
  ENTERPRISE: {
    queriesPerMonth: -1, // unlimited
    nodesPerMonth: -1,
    embeddingsPerMonth: -1,
    computeSecondsPerMonth: -1,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// Get current billing period (monthly)
export function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Get or create usage record for current period
export async function getOrCreateUsageRecord(tenantId: string) {
  const { start, end } = getCurrentBillingPeriod();
  
  return prisma.graphUsage.upsert({
    where: {
      tenantId_periodStart_periodEnd: {
        tenantId,
        periodStart: start,
        periodEnd: end,
      },
    },
    create: {
      tenantId,
      periodStart: start,
      periodEnd: end,
    },
    update: {},
  });
}

// Track a graph query execution
export async function trackGraphQuery(
  tenantId: string,
  metrics: {
    nodesProcessed?: number;
    relationshipsProcessed?: number;
    computeSeconds?: number;
    embeddingsGenerated?: number;
  }
) {
  const { start, end } = getCurrentBillingPeriod();
  
  return prisma.graphUsage.upsert({
    where: {
      tenantId_periodStart_periodEnd: {
        tenantId,
        periodStart: start,
        periodEnd: end,
      },
    },
    create: {
      tenantId,
      periodStart: start,
      periodEnd: end,
      queriesExecuted: 1,
      nodesProcessed: metrics.nodesProcessed || 0,
      relationshipsProcessed: metrics.relationshipsProcessed || 0,
      computeSeconds: metrics.computeSeconds || 0,
      embeddingsGenerated: metrics.embeddingsGenerated || 0,
    },
    update: {
      queriesExecuted: { increment: 1 },
      nodesProcessed: { increment: metrics.nodesProcessed || 0 },
      relationshipsProcessed: { increment: metrics.relationshipsProcessed || 0 },
      computeSeconds: { increment: metrics.computeSeconds || 0 },
      embeddingsGenerated: { increment: metrics.embeddingsGenerated || 0 },
    },
  });
}

// Check if tenant has exceeded their plan limits
export async function checkPlanLimits(
  tenantId: string
): Promise<{ allowed: boolean; reason?: string; usage?: Record<string, number> }> {
  // Get tenant's plan
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  
  if (!tenant) {
    return { allowed: false, reason: "Tenant not found" };
  }
  
  const plan = (tenant.plan || "FREE") as PlanType;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  
  // Enterprise has unlimited
  if (plan === "ENTERPRISE") {
    return { allowed: true };
  }
  
  // Get current usage
  const usage = await getOrCreateUsageRecord(tenantId);
  
  const usageData = {
    queries: usage.queriesExecuted,
    nodes: usage.nodesProcessed,
    embeddings: usage.embeddingsGenerated,
    computeSeconds: usage.computeSeconds,
  };
  
  // Check each limit
  if (limits.queriesPerMonth > 0 && usage.queriesExecuted >= limits.queriesPerMonth) {
    return {
      allowed: false,
      reason: `Query limit reached (${usage.queriesExecuted}/${limits.queriesPerMonth})`,
      usage: usageData,
    };
  }
  
  if (limits.nodesPerMonth > 0 && usage.nodesProcessed >= limits.nodesPerMonth) {
    return {
      allowed: false,
      reason: `Node processing limit reached (${usage.nodesProcessed}/${limits.nodesPerMonth})`,
      usage: usageData,
    };
  }
  
  if (limits.embeddingsPerMonth > 0 && usage.embeddingsGenerated >= limits.embeddingsPerMonth) {
    return {
      allowed: false,
      reason: `Embedding limit reached (${usage.embeddingsGenerated}/${limits.embeddingsPerMonth})`,
      usage: usageData,
    };
  }
  
  if (limits.computeSecondsPerMonth > 0 && usage.computeSeconds >= limits.computeSecondsPerMonth) {
    return {
      allowed: false,
      reason: `Compute time limit reached (${usage.computeSeconds}s/${limits.computeSecondsPerMonth}s)`,
      usage: usageData,
    };
  }
  
  return { allowed: true, usage: usageData };
}

// Get usage summary for a tenant
export async function getUsageSummary(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  
  const plan = (tenant?.plan || "FREE") as PlanType;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  const usage = await getOrCreateUsageRecord(tenantId);
  
  return {
    plan,
    period: {
      start: usage.periodStart,
      end: usage.periodEnd,
    },
    usage: {
      queries: {
        used: usage.queriesExecuted,
        limit: limits.queriesPerMonth,
        percent: limits.queriesPerMonth > 0 
          ? Math.round((usage.queriesExecuted / limits.queriesPerMonth) * 100) 
          : 0,
      },
      nodes: {
        used: usage.nodesProcessed,
        limit: limits.nodesPerMonth,
        percent: limits.nodesPerMonth > 0 
          ? Math.round((usage.nodesProcessed / limits.nodesPerMonth) * 100) 
          : 0,
      },
      embeddings: {
        used: usage.embeddingsGenerated,
        limit: limits.embeddingsPerMonth,
        percent: limits.embeddingsPerMonth > 0 
          ? Math.round((usage.embeddingsGenerated / limits.embeddingsPerMonth) * 100) 
          : 0,
      },
      computeSeconds: {
        used: usage.computeSeconds,
        limit: limits.computeSecondsPerMonth,
        percent: limits.computeSecondsPerMonth > 0 
          ? Math.round((usage.computeSeconds / limits.computeSecondsPerMonth) * 100) 
          : 0,
      },
    },
  };
}

// Report usage to Stripe for metered billing (call this periodically or on period end)
export async function reportUsageToStripe(tenantId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("[Stripe] No API key configured, skipping usage report");
    return null;
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  // Get tenant with Stripe subscription
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeSubId: true, plan: true },
  });
  
  if (!tenant?.stripeSubId || tenant.plan === "FREE") {
    return null; // No subscription to report to
  }
  
  // Get current usage
  const { start, end } = getCurrentBillingPeriod();
  const usage = await prisma.graphUsage.findUnique({
    where: {
      tenantId_periodStart_periodEnd: {
        tenantId,
        periodStart: start,
        periodEnd: end,
      },
    },
  });
  
  if (!usage || usage.stripeReported) {
    return null; // Already reported or no usage
  }
  
  try {
    // Get subscription items (metered price)
    const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubId);
    const meteredItem = subscription.items.data.find(
      (item) => item.price.recurring?.usage_type === "metered"
    );
    
    if (!meteredItem) {
      console.log("[Stripe] No metered subscription item found");
      return null;
    }
    
    // Report usage (using queries as the billable unit)
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      meteredItem.id,
      {
        quantity: usage.queriesExecuted,
        timestamp: Math.floor(Date.now() / 1000),
        action: "set",
      }
    );
    
    // Mark as reported
    await prisma.graphUsage.update({
      where: { id: usage.id },
      data: {
        stripeReported: true,
        stripeUsageRecordId: usageRecord.id,
      },
    });
    
    console.log(`[Stripe] Reported ${usage.queriesExecuted} queries for tenant ${tenantId}`);
    return usageRecord;
  } catch (error) {
    console.error("[Stripe] Failed to report usage:", error);
    throw error;
  }
}

// Wrapper to execute a graph query with usage tracking and limit enforcement
export async function withGraphUsageTracking<T>(
  tenantId: string,
  queryFn: () => Promise<{ result: T; metrics: { nodesProcessed?: number; relationshipsProcessed?: number } }>,
  options?: { skipLimitCheck?: boolean }
): Promise<T> {
  // Check limits first (unless skipped)
  if (!options?.skipLimitCheck) {
    const limitCheck = await checkPlanLimits(tenantId);
    if (!limitCheck.allowed) {
      throw new Error(`Plan limit exceeded: ${limitCheck.reason}`);
    }
  }
  
  const startTime = Date.now();
  
  try {
    const { result, metrics } = await queryFn();
    
    // Track usage
    const computeSeconds = Math.ceil((Date.now() - startTime) / 1000);
    await trackGraphQuery(tenantId, {
      ...metrics,
      computeSeconds,
    });
    
    return result;
  } catch (error) {
    // Still track the query attempt even if it failed
    const computeSeconds = Math.ceil((Date.now() - startTime) / 1000);
    await trackGraphQuery(tenantId, { computeSeconds });
    throw error;
  }
}
