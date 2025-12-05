import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch transfer history with pagination and filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const tenantId = session.user.tenantId;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { tenantId };
    
    if (status && status !== "all") {
      where.status = status;
    }
    
    if (search) {
      where.fileName = {
        contains: search,
      };
    }

    // Get total count
    const totalCount = await prisma.transfer.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get transfers with pagination
    const transfers = await prisma.transfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        s3Key: true,
        status: true,
        progress: true,
        error: true,
        createdAt: true,
        completedAt: true,
        bucket: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      transfers: transfers.map((t) => ({
        ...t,
        fileSize: t.fileSize.toString(),
      })),
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer history" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a transfer record
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Transfer ID required" }, { status: 400 });
    }

    // Verify the transfer belongs to the user's tenant
    const transfer = await prisma.transfer.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    // Delete the transfer record
    await prisma.transfer.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        action: "DELETE_TRANSFER_RECORD",
        resource: transfer.fileName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transfer:", error);
    return NextResponse.json(
      { error: "Failed to delete transfer" },
      { status: 500 }
    );
  }
}
