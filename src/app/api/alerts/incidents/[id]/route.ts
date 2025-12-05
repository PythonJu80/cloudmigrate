import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/alerts/incidents/[id] - Update incident (acknowledge/resolve)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // "acknowledge" or "resolve"

    // Verify ownership via alertRule
    const incident = await prisma.alertIncident.findFirst({
      where: { id: params.id },
      include: {
        alertRule: {
          select: { tenantId: true },
        },
      },
    });

    if (!incident || incident.alertRule.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (action === "acknowledge") {
      updateData.status = "ACKNOWLEDGED";
      updateData.acknowledgedBy = session.user.id;
      updateData.acknowledgedAt = new Date();
    } else if (action === "resolve") {
      updateData.status = "RESOLVED";
      updateData.resolvedAt = new Date();
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.alertIncident.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ incident: updated });
  } catch (error) {
    console.error("Update incident error:", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
