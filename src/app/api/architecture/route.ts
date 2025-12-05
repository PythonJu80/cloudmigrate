import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List all architectures for user (+ shared in tenant)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const includeShared = searchParams.get("shared") !== "false";

    // Build where clause: user's own architectures OR shared in tenant
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

    const architectures = await prisma.architecture.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        isShared: true,
        version: true,
        estimatedCost: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    // Add isOwner flag
    const architecturesWithOwnership = architectures.map((arch) => ({
      ...arch,
      isOwner: arch.userId === session.user.id,
    }));

    return NextResponse.json({ architectures: architecturesWithOwnership });
  } catch (error) {
    console.error("Failed to fetch architectures:", error);
    return NextResponse.json(
      { error: "Failed to fetch architectures" },
      { status: 500 }
    );
  }
}

// POST - Create new architecture
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name = "Untitled Architecture",
      description,
      nodes = "[]",
      edges = "[]",
      viewport,
      resources,
      estimatedCost = 0,
      status = "draft",
      isShared = false,
    } = body;

    const architecture = await prisma.architecture.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        name,
        description,
        nodes: typeof nodes === "string" ? nodes : JSON.stringify(nodes),
        edges: typeof edges === "string" ? edges : JSON.stringify(edges),
        viewport: viewport ? (typeof viewport === "string" ? viewport : JSON.stringify(viewport)) : null,
        resources: resources ? (typeof resources === "string" ? resources : JSON.stringify(resources)) : null,
        estimatedCost,
        status,
        isShared,
      },
    });

    return NextResponse.json({ architecture }, { status: 201 });
  } catch (error) {
    console.error("Failed to create architecture:", error);
    return NextResponse.json(
      { error: "Failed to create architecture" },
      { status: 500 }
    );
  }
}
