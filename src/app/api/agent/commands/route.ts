import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/agent/commands - Agent polls for pending commands
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    // Find tenant by agent API key
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Update agent last seen
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { 
        agentConnected: true,
        agentLastSeen: new Date(),
      },
    });

    // Get pending commands for this tenant
    const commands = await prisma.agentCommand.findMany({
      where: { 
        tenantId: tenant.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
      take: 10, // Process up to 10 commands at a time
    });

    return NextResponse.json({ commands });
  } catch (error) {
    console.error("Agent commands error:", error);
    return NextResponse.json({ error: "Failed to get commands" }, { status: 500 });
  }
}

/**
 * POST /api/agent/commands - Create a new command (called by AI/server)
 * This is an internal endpoint, authenticated by session
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    
    const tenant = await prisma.tenant.findFirst({
      where: { agentApiKey: apiKey },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { type, payload } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "Command type required" }, { status: 400 });
    }

    const command = await prisma.agentCommand.create({
      data: {
        tenantId: tenant.id,
        type,
        payload: JSON.stringify(payload || {}),
        status: "PENDING",
      },
    });

    return NextResponse.json({ 
      success: true, 
      commandId: command.id,
    });
  } catch (error) {
    console.error("Create command error:", error);
    return NextResponse.json({ error: "Failed to create command" }, { status: 500 });
  }
}
