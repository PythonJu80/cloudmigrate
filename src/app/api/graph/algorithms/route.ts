import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TenantGraphClient } from "@/lib/neo4j";
import { prisma } from "@/lib/db";
import { checkPlanLimits, trackGraphQuery } from "@/lib/graph-usage";

/**
 * POST /api/graph/algorithms - Run a graph algorithm (billable)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if GDS is enabled for tenant
    const config = await prisma.tenantNeo4jConfig.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    if (!config?.gdsEnabled) {
      return NextResponse.json({ 
        error: "Graph algorithms not enabled. Upgrade to Pro plan.",
        upgradeRequired: true,
      }, { status: 403 });
    }

    const { algorithm, params } = await request.json();
    if (!algorithm) {
      return NextResponse.json({ error: "Algorithm required" }, { status: 400 });
    }

    // Check plan limits before executing
    const limitCheck = await checkPlanLimits(session.user.tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: limitCheck.reason,
        usage: limitCheck.usage,
        upgradeRequired: true,
      }, { status: 429 });
    }

    const startTime = Date.now();
    const client = await TenantGraphClient.create(session.user.tenantId);
    let result: any;

    switch (algorithm) {
      case "pagerank":
        result = await client.runPageRank(
          params?.nodeLabel || "Node",
          params?.relType || "CONNECTED_TO"
        );
        break;

      case "similarity":
        if (!params?.nodeId) {
          return NextResponse.json({ error: "nodeId required for similarity" }, { status: 400 });
        }
        result = await client.findSimilar(params.nodeId, params?.limit || 10);
        break;

      default:
        return NextResponse.json({ error: `Unknown algorithm: ${algorithm}` }, { status: 400 });
    }

    // Track usage after successful execution
    const computeSeconds = Math.ceil((Date.now() - startTime) / 1000);
    const nodesProcessed = Array.isArray(result) ? result.length : 1;
    
    await trackGraphQuery(session.user.tenantId, {
      nodesProcessed,
      computeSeconds,
    });

    return NextResponse.json({
      success: true,
      algorithm,
      result,
      usage: {
        computeSeconds,
        nodesProcessed,
      },
    });
  } catch (error) {
    console.error("Algorithm error:", error);
    return NextResponse.json({ error: "Algorithm execution failed" }, { status: 500 });
  }
}

/**
 * GET /api/graph/algorithms - List available algorithms
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.tenantNeo4jConfig.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    const algorithms = [
      {
        id: "pagerank",
        name: "PageRank",
        description: "Find the most important nodes in your graph",
        gdsRequired: true,
        enabled: config?.gdsEnabled || false,
      },
      {
        id: "similarity",
        name: "Similarity Search",
        description: "Find nodes similar to a given node",
        gdsRequired: false,
        enabled: true,
      },
      {
        id: "node2vec",
        name: "Node2Vec Embeddings",
        description: "Generate vector embeddings for nodes",
        gdsRequired: true,
        enabled: config?.gdsEnabled && config?.embeddingsEnabled,
      },
      {
        id: "community",
        name: "Community Detection",
        description: "Find clusters of related nodes",
        gdsRequired: true,
        enabled: config?.gdsEnabled || false,
      },
    ];

    return NextResponse.json({ algorithms });
  } catch (error) {
    console.error("List algorithms error:", error);
    return NextResponse.json({ error: "Failed to list algorithms" }, { status: 500 });
  }
}
