import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get migration statistics for the current tenant
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Get discovered hosts stats
    const discoveredStats = await prisma.discoveredHost.groupBy({
      by: ["category", "status", "migrationStatus"],
      where: { tenantId },
      _count: { id: true },
    });

    // Calculate summary
    let totalDiscovered = 0;
    let onlineHosts = 0;
    const byCategory: Record<string, number> = {};
    const byMigrationStatus: Record<string, number> = {};

    for (const stat of discoveredStats) {
      totalDiscovered += stat._count.id;
      
      if (stat.status === "online") {
        onlineHosts += stat._count.id;
      }
      
      byCategory[stat.category] = (byCategory[stat.category] || 0) + stat._count.id;
      byMigrationStatus[stat.migrationStatus] = (byMigrationStatus[stat.migrationStatus] || 0) + stat._count.id;
    }

    // Get workload stats
    const workloadStats = await prisma.migrationWorkload.groupBy({
      by: ["status", "category"],
      where: { tenantId },
      _count: { id: true },
    });

    let totalWorkloads = 0;
    let completedWorkloads = 0;
    let inProgressWorkloads = 0;
    let failedWorkloads = 0;

    for (const stat of workloadStats) {
      totalWorkloads += stat._count.id;
      if (stat.status === "completed") completedWorkloads += stat._count.id;
      if (stat.status === "migrating") inProgressWorkloads += stat._count.id;
      if (stat.status === "failed") failedWorkloads += stat._count.id;
    }

    // Get latest scan
    const latestScan = await prisma.discoveryScan.findFirst({
      where: { tenantId },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        completedAt: true,
        hostsFound: true,
        networkCidr: true,
      },
    });

    return NextResponse.json({
      discovered: {
        total: totalDiscovered,
        online: onlineHosts,
        byCategory,
        byMigrationStatus,
      },
      workloads: {
        total: totalWorkloads,
        completed: completedWorkloads,
        inProgress: inProgressWorkloads,
        failed: failedWorkloads,
        pending: totalWorkloads - completedWorkloads - inProgressWorkloads - failedWorkloads,
      },
      latestScan: latestScan
        ? {
            id: latestScan.id,
            completedAt: latestScan.completedAt,
            hostsFound: latestScan.hostsFound,
            networkCidr: latestScan.networkCidr,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching migration stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch migration stats" },
      { status: 500 }
    );
  }
}
