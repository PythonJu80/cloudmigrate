import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/chat/context - Get current chat context (local scan, agent status)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [agentScan, tenant] = await Promise.all([
      prisma.agentScan.findFirst({
        where: { tenantId: session.user.tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { agentConnected: true, agentLastSeen: true },
      }),
    ]);

    return NextResponse.json({
      localScan: agentScan ? {
        rootPath: agentScan.scanPath,
        fileCount: agentScan.fileCount,
        folderCount: agentScan.folderCount,
        totalSize: Number(agentScan.totalSize),
        scannedAt: agentScan.createdAt,
      } : null,
      agentConnected: tenant?.agentConnected || false,
      agentLastSeen: tenant?.agentLastSeen || null,
    });
  } catch (error) {
    console.error("Get context error:", error);
    return NextResponse.json({ error: "Failed to get context" }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/context - Clear local scan context (release directory)
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete all scan data for this tenant
    await prisma.agentScan.deleteMany({
      where: { tenantId: session.user.tenantId },
    });

    return NextResponse.json({
      success: true,
      message: "Local scan data cleared. The AI assistant will no longer reference your local files.",
    });
  } catch (error) {
    console.error("Clear context error:", error);
    return NextResponse.json({ error: "Failed to clear context" }, { status: 500 });
  }
}
