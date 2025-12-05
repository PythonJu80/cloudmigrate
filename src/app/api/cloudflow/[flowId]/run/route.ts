import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { executeFlow } from "@/lib/cloudflow/executor";

// POST - Execute a flow
export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get flow (owner or shared)
    const flow = await prisma.cloudFlow.findFirst({
      where: {
        id: params.flowId,
        OR: [
          { userId: session.user.id },
          { tenantId: session.user.tenantId, isShared: true },
        ],
      },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // Check flow has nodes
    const nodes = JSON.parse(flow.nodes);
    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: "Flow has no nodes to execute" },
        { status: 400 }
      );
    }

    // Build flow object for executor
    const flowData = {
      id: flow.id,
      name: flow.name,
      nodes: nodes,
      edges: JSON.parse(flow.edges),
      trigger: {
        type: flow.triggerType as "manual" | "cron" | "webhook" | "event",
        config: flow.triggerConfig ? JSON.parse(flow.triggerConfig) : {},
      },
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      status: flow.status as "draft" | "active" | "paused",
    };

    // Execute the flow
    const result = await executeFlow(
      flowData,
      session.user.tenantId,
      `manual:${session.user.id}`
    );

    // Update flow stats
    await prisma.cloudFlow.update({
      where: { id: flow.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: result.success ? "success" : "error",
        runCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: result.success,
      executionId: result.executionId,
      nodeResults: result.nodeResults,
      error: result.error,
      duration: result.completedAt.getTime() - result.startedAt.getTime(),
    });
  } catch (error: any) {
    console.error("Failed to execute flow:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute flow" },
      { status: 500 }
    );
  }
}
