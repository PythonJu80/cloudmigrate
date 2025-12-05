import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/agent/status - Get agent status
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
      include: {
        _count: { select: { transfers: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Get latest scan
    const scan = await prisma.agentScan.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, fileCount: true },
    });

    return NextResponse.json({
      tenantName: tenant.name,
      plan: tenant.plan,
      connected: tenant.agentConnected || false,
      lastScan: scan?.createdAt?.toISOString() || null,
      fileCount: scan?.fileCount || 0,
      transferCount: tenant._count.transfers,
    });
  } catch (error) {
    console.error("Agent status error:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}
