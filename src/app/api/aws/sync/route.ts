import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncAwsResources, getSyncedServices, getServiceCounts } from "@/lib/aws-sync";

// POST - Trigger AWS sync
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const region = body.region || "us-east-1";

    const results = await syncAwsResources(session.user.tenantId, region);

    // Filter to only services with resources
    const activeServices = results.filter((r) => r.count > 0);

    return NextResponse.json({
      success: true,
      services: activeServices,
      total: activeServices.length,
      scannedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("AWS sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync AWS resources" },
      { status: 500 }
    );
  }
}

// GET - Get current synced services
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const services = await getSyncedServices(session.user.tenantId);
    const counts = await getServiceCounts(session.user.tenantId);

    return NextResponse.json({
      services,
      counts,
    });
  } catch (error: any) {
    console.error("Get synced services error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get synced services" },
      { status: 500 }
    );
  }
}
