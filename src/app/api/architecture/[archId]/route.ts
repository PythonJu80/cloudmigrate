import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get single architecture with full data
export async function GET(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const architecture = await prisma.architecture.findFirst({
      where: {
        id: params.archId,
        OR: [
          { userId: session.user.id },
          { tenantId: session.user.tenantId, isShared: true },
        ],
      },
    });

    if (!architecture) {
      return NextResponse.json({ error: "Architecture not found" }, { status: 404 });
    }

    // Parse JSON fields for client
    const parsedArchitecture = {
      ...architecture,
      nodes: JSON.parse(architecture.nodes),
      edges: JSON.parse(architecture.edges),
      viewport: architecture.viewport ? JSON.parse(architecture.viewport) : null,
      resources: architecture.resources ? JSON.parse(architecture.resources) : null,
      isOwner: architecture.userId === session.user.id,
    };

    return NextResponse.json({ architecture: parsedArchitecture });
  } catch (error) {
    console.error("Failed to fetch architecture:", error);
    return NextResponse.json({ error: "Failed to fetch architecture" }, { status: 500 });
  }
}

// PUT - Update architecture (full update)
export async function PUT(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owner can update
    const existingArch = await prisma.architecture.findFirst({
      where: {
        id: params.archId,
        userId: session.user.id,
      },
    });

    if (!existingArch) {
      return NextResponse.json(
        { error: "Architecture not found or not authorized" },
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
      resources,
      estimatedCost,
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
    if (resources !== undefined) {
      updateData.resources = typeof resources === "string" ? resources : JSON.stringify(resources);
    }
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
    if (status !== undefined) updateData.status = status;
    if (isShared !== undefined) updateData.isShared = isShared;

    // Increment version on significant changes
    if (nodes !== undefined || edges !== undefined) {
      updateData.version = existingArch.version + 1;
    }

    const architecture = await prisma.architecture.update({
      where: { id: params.archId },
      data: updateData,
    });

    return NextResponse.json({ architecture });
  } catch (error) {
    console.error("Failed to update architecture:", error);
    return NextResponse.json({ error: "Failed to update architecture" }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  return PUT(request, { params });
}

// DELETE - Delete architecture
export async function DELETE(
  request: NextRequest,
  { params }: { params: { archId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owner can delete
    const deleted = await prisma.architecture.deleteMany({
      where: {
        id: params.archId,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Architecture not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete architecture:", error);
    return NextResponse.json({ error: "Failed to delete architecture" }, { status: 500 });
  }
}
