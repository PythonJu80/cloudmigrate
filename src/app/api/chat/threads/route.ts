import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List all threads for user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threads = await prisma.chatThread.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Failed to fetch threads:", error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

// POST - Create new thread
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await request.json().catch(() => ({}));

    const thread = await prisma.chatThread.create({
      data: {
        userId: session.user.id,
        title: title || "New Chat",
      },
    });

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Failed to create thread:", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}

// DELETE - Delete all threads for user
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.chatThread.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete threads:", error);
    return NextResponse.json({ error: "Failed to delete threads" }, { status: 500 });
  }
}
