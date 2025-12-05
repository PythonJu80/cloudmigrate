import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TenantGraphClient, initializeTenantDatabase } from "@/lib/neo4j";
import { prisma } from "@/lib/db";

/**
 * GET /api/graph - Get graph stats and usage for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await TenantGraphClient.create(session.user.tenantId);
    
    const [stats, usage, config] = await Promise.all([
      client.getStats(),
      client.getUsage(),
      prisma.tenantNeo4jConfig.findUnique({
        where: { tenantId: session.user.tenantId },
      }),
    ]);

    return NextResponse.json({
      stats,
      usage: usage || {
        computeSeconds: 0,
        queriesExecuted: 0,
        nodesProcessed: 0,
        relationshipsProcessed: 0,
      },
      config: config ? {
        configType: config.configType,
        maxNodes: config.maxNodes,
        maxRelationships: config.maxRelationships,
        gdsEnabled: config.gdsEnabled,
        embeddingsEnabled: config.embeddingsEnabled,
      } : null,
      limits: {
        nodesUsed: stats.nodes,
        nodesLimit: config?.maxNodes || 100000,
        relsUsed: stats.relationships,
        relsLimit: config?.maxRelationships || 500000,
      },
    });
  } catch (error) {
    console.error("Graph stats error:", error);
    return NextResponse.json({ error: "Failed to get graph stats" }, { status: 500 });
  }
}

/**
 * POST /api/graph - Initialize graph database for tenant
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initializeTenantDatabase(session.user.tenantId);

    return NextResponse.json({ 
      success: true,
      message: "Graph database initialized",
    });
  } catch (error) {
    console.error("Graph init error:", error);
    return NextResponse.json({ error: "Failed to initialize graph" }, { status: 500 });
  }
}
