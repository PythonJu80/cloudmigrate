import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/alerts/rules/[id] - Get single alert rule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rule = await prisma.alertRule.findFirst({
      where: { 
        id: params.id,
        tenantId: session.user.tenantId,
      },
      include: {
        incidents: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Get alert rule error:", error);
    return NextResponse.json({ error: "Failed to get alert rule" }, { status: 500 });
  }
}

// PATCH /api/alerts/rules/[id] - Update alert rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Verify ownership
    const existing = await prisma.alertRule.findFirst({
      where: { 
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.metric !== undefined) updateData.metric = body.metric;
    if (body.resourceType !== undefined) updateData.resourceType = body.resourceType;
    if (body.resourceId !== undefined) updateData.resourceId = body.resourceId;
    if (body.operator !== undefined) updateData.operator = body.operator;
    if (body.threshold !== undefined) updateData.threshold = parseFloat(body.threshold);
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.channels !== undefined) updateData.channels = JSON.stringify(body.channels);
    if (body.channelConfig !== undefined) updateData.channelConfig = JSON.stringify(body.channelConfig);
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const rule = await prisma.alertRule.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Update alert rule error:", error);
    return NextResponse.json({ error: "Failed to update alert rule" }, { status: 500 });
  }
}

// DELETE /api/alerts/rules/[id] - Delete alert rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.alertRule.findFirst({
      where: { 
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await prisma.alertRule.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete alert rule error:", error);
    return NextResponse.json({ error: "Failed to delete alert rule" }, { status: 500 });
  }
}
