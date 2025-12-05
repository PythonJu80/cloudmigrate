import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/migrate/discover/trigger
 * Triggers a discovery scan by queuing a DISCOVER command for the agent
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { network, deep } = await req.json();

    // Check if agent is connected
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        id: true,
        agentConnected: true,
        agentLastSeen: true,
        agentApiKey: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check if agent was seen recently (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const agentOnline = tenant.agentConnected && 
      tenant.agentLastSeen && 
      tenant.agentLastSeen > fiveMinutesAgo;

    if (!agentOnline) {
      return NextResponse.json({ 
        error: "Agent not connected",
        message: "The CloudMigrate agent is not running. Start the agent with: cloudmigrate-agent daemon",
        agentLastSeen: tenant.agentLastSeen,
      }, { status: 503 });
    }

    // Queue the DISCOVER command
    const command = await prisma.agentCommand.create({
      data: {
        tenantId: tenant.id,
        type: "DISCOVER",
        payload: JSON.stringify({
          network: network || "", // Empty = auto-detect
          deep: deep || false,
        }),
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      commandId: command.id,
      message: "Discovery scan queued. The agent will execute it shortly.",
    });
  } catch (error) {
    console.error("Error triggering discovery:", error);
    return NextResponse.json(
      { error: "Failed to trigger discovery" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate/discover/trigger?commandId=xxx
 * Check the status of a queued discovery command
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commandId = searchParams.get("commandId");

    if (!commandId) {
      return NextResponse.json({ error: "commandId required" }, { status: 400 });
    }

    const command = await prisma.agentCommand.findFirst({
      where: {
        id: commandId,
        tenantId: session.user.tenantId,
      },
    });

    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: command.id,
      type: command.type,
      status: command.status,
      result: command.result ? JSON.parse(command.result) : null,
      error: command.error,
      createdAt: command.createdAt,
      startedAt: command.startedAt,
      completedAt: command.completedAt,
    });
  } catch (error) {
    console.error("Error checking command status:", error);
    return NextResponse.json(
      { error: "Failed to check command status" },
      { status: 500 }
    );
  }
}
