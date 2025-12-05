import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Helper to check flow access (owner or shared in tenant)
async function getFlowWithAccess(flowId: string, userId: string, tenantId: string) {
  return prisma.cloudFlow.findFirst({
    where: {
      id: flowId,
      OR: [
        { userId }, // Owner
        { tenantId, isShared: true }, // Shared in tenant
      ],
    },
  });
}

// GET - Get single flow with full data
export async function GET(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const flow = await prisma.cloudFlow.findFirst({
      where: {
        id: params.flowId,
        OR: [
          { userId: session.user.id },
          { tenantId: session.user.tenantId, isShared: true },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        secrets: {
          select: {
            id: true,
            secretKey: true,
            nodeId: true,
            configField: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // Parse JSON fields for client
    const parsedFlow = {
      ...flow,
      nodes: JSON.parse(flow.nodes),
      edges: JSON.parse(flow.edges),
      viewport: flow.viewport ? JSON.parse(flow.viewport) : null,
      triggerConfig: flow.triggerConfig ? JSON.parse(flow.triggerConfig) : null,
      isOwner: flow.userId === session.user.id,
    };

    return NextResponse.json({ flow: parsedFlow });
  } catch (error) {
    console.error("Failed to fetch flow:", error);
    return NextResponse.json({ error: "Failed to fetch flow" }, { status: 500 });
  }
}

// PUT - Update flow (full update)
export async function PUT(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owner can update
    const existingFlow = await prisma.cloudFlow.findFirst({
      where: {
        id: params.flowId,
        userId: session.user.id,
      },
    });

    if (!existingFlow) {
      return NextResponse.json(
        { error: "Flow not found or not authorized" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      nodes,
      edges,
      viewport,
      triggerType,
      triggerConfig,
      status,
      isShared,
    } = body;

    // Build update data (only include provided fields)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (nodes !== undefined) {
      updateData.nodes = typeof nodes === "string" ? nodes : JSON.stringify(nodes);
    }
    if (edges !== undefined) {
      updateData.edges = typeof edges === "string" ? edges : JSON.stringify(edges);
    }
    if (viewport !== undefined) {
      updateData.viewport = typeof viewport === "string" ? viewport : JSON.stringify(viewport);
    }
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerConfig !== undefined) {
      updateData.triggerConfig =
        typeof triggerConfig === "string" ? triggerConfig : JSON.stringify(triggerConfig);
    }
    if (status !== undefined) updateData.status = status;
    if (isShared !== undefined) updateData.isShared = isShared;

    // Increment version on significant changes
    if (nodes !== undefined || edges !== undefined) {
      updateData.version = existingFlow.version + 1;
    }

    const flow = await prisma.cloudFlow.update({
      where: { id: params.flowId },
      data: updateData,
    });

    return NextResponse.json({ flow });
  } catch (error) {
    console.error("Failed to update flow:", error);
    return NextResponse.json({ error: "Failed to update flow" }, { status: 500 });
  }
}

// PATCH - Partial update (for quick saves like name, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  // Same as PUT for now
  return PUT(request, { params });
}

// DELETE - Delete flow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owner can delete
    const deleted = await prisma.cloudFlow.deleteMany({
      where: {
        id: params.flowId,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Flow not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete flow:", error);
    return NextResponse.json({ error: "Failed to delete flow" }, { status: 500 });
  }
}
