import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS as GRAPH_LIMITS } from "@/lib/graph-usage";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";

/**
 * GET /api/billing - Get billing info and usage
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      include: {
        users: { select: { id: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const plan = (tenant.plan as PlanId) || "FREE";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

    // Get graph usage
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const graphUsage = await prisma.graphUsage.findFirst({
      where: {
        tenantId: tenant.id,
        periodStart: { gte: periodStart },
      },
    });

    // Get graph config for node count
    const graphConfig = await prisma.tenantNeo4jConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    return NextResponse.json({
      plan: tenant.plan,
      stripeCustomerId: tenant.stripeCustomerId,
      stripeSubId: tenant.stripeSubId,
      usage: {
        storage: {
          used: Number(tenant.bytesTransferred),
          limit: limits.storage,
        },
        transfers: {
          count: 0, // Could count from transfers table
          bytes: Number(tenant.bytesTransferred),
        },
        users: {
          count: tenant.users.length,
          limit: limits.users,
        },
        graph: {
          nodes: graphUsage?.nodesProcessed || 0,
          limit: limits.nodes,
          queries: graphUsage?.queriesExecuted || 0,
          queriesLimit: GRAPH_LIMITS[plan]?.queriesPerMonth || 100,
          computeSeconds: graphUsage?.computeSeconds || 0,
          computeLimit: GRAPH_LIMITS[plan]?.computeSecondsPerMonth || 60,
        },
      },
      limits,
    });
  } catch (error) {
    console.error("Billing error:", error);
    return NextResponse.json({ error: "Failed to get billing info" }, { status: 500 });
  }
}
