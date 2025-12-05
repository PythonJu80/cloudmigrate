import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List all flows for user (+ shared flows in tenant)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // draft, active, paused
    const includeShared = searchParams.get("shared") !== "false";

    // Build where clause: user's own flows OR shared flows in tenant
    const whereClause: any = {
      OR: [
        { userId: session.user.id },
        ...(includeShared
          ? [{ tenantId: session.user.tenantId, isShared: true }]
          : []),
      ],
    };

    if (status) {
      whereClause.status = status;
    }

    const flows = await prisma.cloudFlow.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        isShared: true,
        version: true,
        triggerType: true,
        lastRunAt: true,
        lastRunStatus: true,
        runCount: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { executions: true },
        },
      },
    });

    // Add isOwner flag and use real execution count from DB
    const flowsWithOwnership = flows.map((flow) => ({
      ...flow,
      isOwner: flow.userId === session.user.id,
      // Override runCount with actual execution count from DB
      runCount: flow._count.executions,
    }));

    return NextResponse.json({ flows: flowsWithOwnership });
  } catch (error) {
    console.error("Failed to fetch flows:", error);
    return NextResponse.json(
      { error: "Failed to fetch flows" },
      { status: 500 }
    );
  }
}

// POST - Create new flow
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name = "Untitled Flow",
      description,
      nodes = "[]",
      edges = "[]",
      viewport,
      triggerType = "manual",
      triggerConfig,
      status = "draft",
      isShared = false,
    } = body;

    const flow = await prisma.cloudFlow.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        name,
        description,
        nodes: typeof nodes === "string" ? nodes : JSON.stringify(nodes),
        edges: typeof edges === "string" ? edges : JSON.stringify(edges),
        viewport:
          typeof viewport === "string" ? viewport : JSON.stringify(viewport),
        triggerType,
        triggerConfig:
          typeof triggerConfig === "string"
            ? triggerConfig
            : JSON.stringify(triggerConfig),
        status,
        isShared,
      },
    });

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error) {
    console.error("Failed to create flow:", error);
    return NextResponse.json(
      { error: "Failed to create flow" },
      { status: 500 }
    );
  }
}
