import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Get tenant info for usage limits
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        bytesTransferred: true,
        bytesLimit: true,
      },
    });

    // Count transfers by status
    const [totalTransfers, completedTransfers, failedTransfers] = await Promise.all([
      prisma.transfer.count({ where: { tenantId } }),
      prisma.transfer.count({ where: { tenantId, status: "COMPLETED" } }),
      prisma.transfer.count({ where: { tenantId, status: "FAILED" } }),
    ]);

    // Get recent transfers
    const recentTransfers = await prisma.transfer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      totalTransfers,
      completedTransfers,
      failedTransfers,
      bytesTransferred: Number(tenant?.bytesTransferred || 0),
      bytesLimit: Number(tenant?.bytesLimit || 5368709120),
      recentTransfers: recentTransfers.map((t) => ({
        ...t,
        fileSize: t.fileSize.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
