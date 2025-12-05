import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/alerts/incidents - List all incidents for tenant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // OPEN, ACKNOWLEDGED, RESOLVED
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      alertRule: {
        tenantId: session.user.tenantId,
      },
    };

    if (status) {
      where.status = status;
    }

    const incidents = await prisma.alertIncident.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        alertRule: {
          select: {
            id: true,
            name: true,
            metric: true,
            threshold: true,
            operator: true,
          },
        },
      },
    });

    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Get incidents error:", error);
    return NextResponse.json({ error: "Failed to get incidents" }, { status: 500 });
  }
}
