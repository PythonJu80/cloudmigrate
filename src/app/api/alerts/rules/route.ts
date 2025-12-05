import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/alerts/rules - List all alert rules for tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await prisma.alertRule.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { incidents: true } },
      },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Get alert rules error:", error);
    return NextResponse.json({ error: "Failed to get alert rules" }, { status: 500 });
  }
}

// POST /api/alerts/rules - Create new alert rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, metric, resourceType, resourceId, operator, threshold, duration, channels, channelConfig } = body;

    if (!name || !metric || !operator || threshold === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const rule = await prisma.alertRule.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        description,
        metric,
        resourceType,
        resourceId,
        operator,
        threshold: parseFloat(threshold),
        duration: duration || 300,
        channels: JSON.stringify(channels || ["email"]),
        channelConfig: JSON.stringify(channelConfig || {}),
        enabled: true,
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Create alert rule error:", error);
    return NextResponse.json({ error: "Failed to create alert rule" }, { status: 500 });
  }
}
