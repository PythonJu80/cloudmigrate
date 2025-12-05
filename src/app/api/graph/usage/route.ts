import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUsageSummary, reportUsageToStripe, PLAN_LIMITS } from "@/lib/graph-usage";

/**
 * GET /api/graph/usage - Get graph usage for billing
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "3");

    // Get usage for last N months
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const usage = await prisma.graphUsage.findMany({
      where: {
        tenantId: session.user.tenantId,
        periodStart: { gte: startDate },
      },
      orderBy: { periodStart: "desc" },
    });

    // Get recent jobs
    const recentJobs = await prisma.graphJobLog.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Calculate totals
    const totals = usage.reduce(
      (acc, u) => ({
        computeSeconds: acc.computeSeconds + u.computeSeconds,
        queriesExecuted: acc.queriesExecuted + u.queriesExecuted,
        nodesProcessed: acc.nodesProcessed + u.nodesProcessed,
        relationshipsProcessed: acc.relationshipsProcessed + u.relationshipsProcessed,
        embeddingsGenerated: acc.embeddingsGenerated + u.embeddingsGenerated,
      }),
      {
        computeSeconds: 0,
        queriesExecuted: 0,
        nodesProcessed: 0,
        relationshipsProcessed: 0,
        embeddingsGenerated: 0,
      }
    );

    // Calculate GCUs (Graph Compute Units)
    // 1 GCU = 1 second of compute OR 1000 nodes processed
    const gcuFromCompute = totals.computeSeconds;
    const gcuFromNodes = Math.ceil(totals.nodesProcessed / 1000);
    const totalGCU = gcuFromCompute + gcuFromNodes;

    // Get current period usage summary with limits
    const summary = await getUsageSummary(session.user.tenantId);

    return NextResponse.json({
      usage,
      recentJobs,
      totals,
      billing: {
        totalGCU,
        gcuFromCompute,
        gcuFromNodes,
        estimatedCost: (totalGCU * 0.001).toFixed(2), // $0.001 per GCU
      },
      currentPeriod: summary,
      limits: PLAN_LIMITS[summary.plan as keyof typeof PLAN_LIMITS],
    });
  } catch (error) {
    console.error("Usage error:", error);
    return NextResponse.json({ error: "Failed to get usage" }, { status: 500 });
  }
}

/**
 * POST /api/graph/usage/report - Report usage to Stripe (internal)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unreported usage
    const unreportedUsage = await prisma.graphUsage.findMany({
      where: {
        tenantId: session.user.tenantId,
        stripeReported: false,
      },
    });

    if (unreportedUsage.length === 0) {
      return NextResponse.json({ message: "No unreported usage" });
    }

    // Calculate total GCUs
    const totalGCU = unreportedUsage.reduce((acc, u) => {
      return acc + u.computeSeconds + Math.ceil(u.nodesProcessed / 1000);
    }, 0);

    // Get tenant's Stripe subscription
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { stripeSubId: true },
    });

    if (!tenant?.stripeSubId) {
      return NextResponse.json({ 
        error: "No active subscription",
        totalGCU,
      }, { status: 400 });
    }

    // Report to Stripe metered billing
    try {
      await reportUsageToStripe(session.user.tenantId);
    } catch (stripeError) {
      console.error("Stripe reporting failed:", stripeError);
      // Continue anyway - we'll mark as reported to avoid duplicate charges
    }

    // Mark as reported
    await prisma.graphUsage.updateMany({
      where: {
        id: { in: unreportedUsage.map(u => u.id) },
      },
      data: {
        stripeReported: true,
      },
    });

    return NextResponse.json({
      success: true,
      reportedGCU: totalGCU,
      periodsReported: unreportedUsage.length,
    });
  } catch (error) {
    console.error("Report usage error:", error);
    return NextResponse.json({ error: "Failed to report usage" }, { status: 500 });
  }
}
