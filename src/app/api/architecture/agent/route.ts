import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSecret } from "@/lib/secrets";
import { SYSTEM_PROMPTS } from "@/lib/architecture/agents/architecture-agent";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, model = "gpt-4.1", mode = "designer" } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Get API key from tenant secrets
    const apiKey = await getSecret(session.user.tenantId, "OPENAI_API_KEY");
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured. Add it in Settings > Secrets." },
        { status: 400 }
      );
    }

    // Get system prompt based on mode
    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.designer;

    // Build messages for OpenAI
    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    return NextResponse.json({
      response: content,
      usage: data.usage,
    });
  } catch (error: any) {
    console.error("Architecture agent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
