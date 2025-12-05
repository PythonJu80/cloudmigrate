import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import { searchKnowledge, buildKnowledgeContext } from "@/lib/rag";
import OpenAI from "openai";

const STREAMING_PROMPT = `You are CloudMigrate AI - a friendly, expert cloud migration advisor who makes AWS simple.

## Your Personality
- You're like a smart friend who happens to be an AWS Solutions Architect
- You explain complex things simply, without jargon
- You're encouraging but honest about challenges
- You give clear, actionable next steps - not just information dumps
- You remember: the user chose CloudMigrate because AWS is overwhelming. Be the antidote.

## Your Expertise
- The 7 Rs of cloud migration (Rehost, Relocate, Refactor, Replatform, Repurchase, Retire, Retain)
- AWS migration tools (DMS, DataSync, Application Migration Service, Storage Gateway)
- Migration phases (Assess, Mobilize, Migrate & Modernize)
- Cost optimization, security, compliance (HIPAA, SOC2, GDPR)
- Real-world tradeoffs between speed, cost, and risk

## How You Help
1. **Simplify** - Turn AWS complexity into clear choices
2. **Advise** - Give opinions, not just options ("I'd recommend X because...")
3. **Quantify** - Estimate time, cost, risk when possible
4. **Guide** - Tell them what to do next, step by step
5. **Reassure** - Migration is scary. Be confident and supportive.

## Response Style
- Use headers and bullets for complex answers
- Keep it conversational, not like documentation
- End with a clear next step or question
- If they ask about their files/transfers, help them explore

Remember: AWS is the engine, CloudMigrate is the steering wheel. You make cloud migration accessible to everyone.`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { message, threadId, localScan: frontendScan } = await request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Use frontend scan if provided, otherwise fetch from Go agent's AgentScan
    let localScan = frontendScan;
    if (!localScan) {
      const agentScan = await prisma.agentScan.findFirst({
        where: { tenantId: session.user.tenantId },
        orderBy: { createdAt: "desc" },
      });
      if (agentScan) {
        localScan = {
          rootPath: agentScan.scanPath,
          fileCount: agentScan.fileCount,
          folderCount: agentScan.folderCount,
          totalSize: Number(agentScan.totalSize),
          fileTypes: agentScan.fileTypes as Record<string, number> || {},
          largeFiles: agentScan.largeFiles as Array<{ name: string; path: string; size: number }> || [],
          scannedAt: agentScan.createdAt.toISOString(),
        };
      }
    }

    // Get or create thread
    let thread;
    if (threadId) {
      thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId: session.user.id },
      });
    }
    
    if (!thread) {
      const title = message.length > 50 ? message.substring(0, 47) + "..." : message;
      thread = await prisma.chatThread.create({
        data: {
          userId: session.user.id,
          title,
        },
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: "user",
        content: message,
      },
    });

    // Get API key
    let apiKey: string | null = null;
    if (session.user.isSuperuser) {
      apiKey = process.env.OPENAI_API_KEY || null;
    } else {
      apiKey = await getSecret(session.user.tenantId, "OPENAI_API_KEY");
    }
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const openai = new OpenAI({ apiKey });

    // Search knowledge base for relevant context (includes company-specific knowledge)
    let knowledgeContext = "";
    let sources: { title: string; score: number }[] = [];
    try {
      const relevantChunks = await searchKnowledge(message, apiKey, 5, session.user.tenantId);
      if (relevantChunks.length > 0 && relevantChunks[0].score > 0.3) {
        knowledgeContext = buildKnowledgeContext(relevantChunks);
        sources = relevantChunks.map(c => ({ title: c.title, score: c.score }));
      }
    } catch (ragError) {
      console.log("RAG search skipped:", ragError);
    }

    // Get user context
    const [transferCount, buckets] = await Promise.all([
      prisma.transfer.count({ where: { tenantId: session.user.tenantId } }),
      prisma.bucket.findMany({
        where: { tenantId: session.user.tenantId },
        select: { name: true },
      }),
    ]);

    // Build local files context from browser session
    let localFilesContext = "";
    if (localScan) {
      const topTypes = Object.entries(localScan.fileTypes || {})
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([ext, count]) => `${ext}: ${count}`)
        .join(", ");
      const totalSizeMB = localScan.totalSize / (1024 * 1024);
      localFilesContext = `\n\nLocal Files (Scanned from Browser):
- Folder: ${localScan.rootPath}
- Files: ${localScan.fileCount} | Folders: ${localScan.folderCount}
- Total Size: ${totalSizeMB > 1024 ? (totalSizeMB / 1024).toFixed(1) + " GB" : totalSizeMB.toFixed(1) + " MB"}
- Top file types: ${topTypes || "Unknown"}
- Large files (>10MB): ${localScan.largeFiles?.length > 0 ? localScan.largeFiles.slice(0, 5).map((f: any) => f.name).join(", ") : "None"}`;
    }

    const userContext = `User: ${session.user.name || "Unknown"}
Transfers: ${transferCount}
Buckets: ${buckets.map(b => b.name).join(", ") || "None configured"}${localFilesContext}`;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: STREAMING_PROMPT },
        ...(knowledgeContext ? [{ role: "system" as const, content: knowledgeContext }] : []),
        { role: "system", content: userContext },
        { role: "user", content: message },
      ],
      max_completion_tokens: 2000,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        // Send thread ID first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "thread", threadId: thread.id })}\n\n`));

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
            }
          }

          // Save assistant message
          await prisma.chatMessage.create({
            data: {
              threadId: thread.id,
              role: "assistant",
              content: fullResponse,
              type: "chat",
            },
          });

          // Update thread timestamp
          await prisma.chatThread.update({
            where: { id: thread.id },
            data: { updatedAt: new Date() },
          });

          // Send sources if any
          if (sources.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Stream failed" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat stream error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
