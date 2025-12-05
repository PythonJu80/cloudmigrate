import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFullDashboardMetrics, getHealthEvents } from "@/lib/aws/cloudwatch";
import { prisma } from "@/lib/db";

// GET /api/monitoring/metrics - Get real-time metrics from AWS
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Check if AWS is configured
    const hasAws = await prisma.secret.findFirst({
      where: { tenantId, key: "AWS_ACCESS_KEY_ID" },
    });

    if (!hasAws) {
      return NextResponse.json({
        configured: false,
        error: "AWS credentials not configured. Go to Settings to add your AWS keys.",
        data: null,
      });
    }

    // Fetch comprehensive metrics from all AWS APIs
    let data = null;
    let healthEvents: any[] = [];
    let error = null;

    try {
      data = await getFullDashboardMetrics(tenantId);
    } catch (e: any) {
      console.error("AWS metrics error:", e);
      error = e.message;
    }

    try {
      healthEvents = await getHealthEvents(tenantId);
    } catch (e: any) {
      // Health API requires Business/Enterprise support - OK to fail
      console.log("Health API:", e.message);
    }

    // Fetch AlertIncidents from database
    const alertIncidents = await prisma.alertIncident.findMany({
      where: {
        alertRule: { tenantId },
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        alertRule: {
          select: { name: true, metric: true },
        },
      },
    });

    return NextResponse.json({
      configured: true,
      data,
      healthEvents,
      alertIncidents,
      error,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Monitoring API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics", details: error.message },
      { status: 500 }
    );
  }
}
