import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { executeWorkflowAgent } from "@/lib/cloudflow/executors/workflow-agent";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatHistory, model, agentMode } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Add user message to history
    const updatedHistory = [
      ...(chatHistory || []),
      { role: "user", content: message },
    ];

    const result = await executeWorkflowAgent(
      {
        model: model || "gpt-4.1",
        agentMode: agentMode || "builder",
      },
      {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        inputs: {},
      },
      updatedHistory
    );

    // Add assistant response to history
    const finalHistory = [
      ...updatedHistory,
      { role: "assistant", content: result.response },
    ];

    return NextResponse.json({
      response: result.response,
      workflow: result.workflow,
      chatHistory: finalHistory,
    });
  } catch (error: any) {
    console.error("Workflow agent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
