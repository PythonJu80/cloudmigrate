import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get execution history for a flow
export async function GET(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Verify access to flow
    const flow = await prisma.cloudFlow.findFirst({
      where: {
        id: params.flowId,
        OR: [
          { userId: session.user.id },
          { tenantId: session.user.tenantId, isShared: true },
        ],
      },
      select: { id: true },
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    // Get executions
    const [executions, total] = await Promise.all([
      prisma.flowExecution.findMany({
        where: { flowId: params.flowId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          status: true,
          triggeredBy: true,
          error: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.flowExecution.count({
        where: { flowId: params.flowId },
      }),
    ]);

    // Calculate duration for each execution
    const executionsWithDuration = executions.map((exec) => ({
      ...exec,
      duration:
        exec.startedAt && exec.completedAt
          ? exec.completedAt.getTime() - exec.startedAt.getTime()
          : null,
    }));

    return NextResponse.json({
      executions: executionsWithDuration,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch executions:", error);
    return NextResponse.json(
      { error: "Failed to fetch executions" },
      { status: 500 }
    );
  }
}
