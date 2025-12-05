import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/agent/commands/[id] - Agent updates command status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { status, result, error } = await request.json();

    // Verify command belongs to this tenant
    const command = await prisma.agentCommand.findFirst({
      where: { 
        id: params.id,
        tenantId: tenant.id,
      },
    });

    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    // Update command
    const updateData: any = { status };
    
    if (status === "RUNNING" && !command.startedAt) {
      updateData.startedAt = new Date();
    }
    
    if (status === "COMPLETED" || status === "FAILED") {
      updateData.completedAt = new Date();
    }
    
    if (result) {
      updateData.result = JSON.stringify(result);
    }
    
    if (error) {
      updateData.error = error;
    }

    await prisma.agentCommand.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update agent last seen
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { 
        agentConnected: true,
        agentLastSeen: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update command error:", error);
    return NextResponse.json({ error: "Failed to update command" }, { status: 500 });
  }
}

/**
 * GET /api/agent/commands/[id] - Get command status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const command = await prisma.agentCommand.findFirst({
      where: { 
        id: params.id,
        tenantId: tenant.id,
      },
    });

    if (!command) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: command.id,
      type: command.type,
      payload: JSON.parse(command.payload),
      status: command.status,
      result: command.result ? JSON.parse(command.result) : null,
      error: command.error,
      createdAt: command.createdAt,
      startedAt: command.startedAt,
      completedAt: command.completedAt,
    });
  } catch (error) {
    console.error("Get command error:", error);
    return NextResponse.json({ error: "Failed to get command" }, { status: 500 });
  }
}
