import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSecret, getAwsCredentials } from "@/lib/secrets";
import { DATA_ASSISTANT_PROMPT, buildContextMessage } from "@/lib/prompts/data-assistant";
// RAG now handled by Crawl4AI API - see CRAWL4AI_URL env var
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";
import OpenAI from "openai";

/**
 * Smart chart data population based on chart type and user intent
 */
async function populateChartData(
  chart: { type: string; xAxis?: string; yAxis?: string; data?: any[] },
  tenantId: string,
  userMessage: string
): Promise<any[]> {
  // If AI already provided data, use it
  if (chart.data && chart.data.length > 0) {
    return chart.data;
  }

  const msgLower = userMessage.toLowerCase();
  const xAxis = chart.xAxis || "name";
  const yAxis = chart.yAxis || "value";

  // Detect what kind of data the user wants
  const wantsByBucket = /bucket|destination|target/i.test(msgLower);
  const wantsByDate = /time|date|day|week|month|trend|over time/i.test(msgLower);
  const wantsByFileType = /type|extension|mime|format/i.test(msgLower);
  const wantsBySize = /size|storage|bytes|large|small/i.test(msgLower);

  try {
    // GROUP BY BUCKET
    if (wantsByBucket) {
      const bucketCounts = await prisma.transfer.groupBy({
        by: ["bucketId"],
        where: { tenantId },
        _count: true,
        _sum: { fileSize: true },
      });

      // Get bucket names
      const bucketIds = bucketCounts.map((b) => b.bucketId).filter(Boolean) as string[];
      const buckets = await prisma.bucket.findMany({
        where: { id: { in: bucketIds } },
        select: { id: true, name: true },
      });
      const bucketMap = new Map(buckets.map((b) => [b.id, b.name]));

      return bucketCounts.map((b) => ({
        [xAxis]: bucketMap.get(b.bucketId || "") || "Unknown",
        [yAxis]: wantsBySize ? Number(b._sum.fileSize || 0) : b._count,
      }));
    }

    // GROUP BY DATE (last 7 days)
    if (wantsByDate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const transfers = await prisma.transfer.findMany({
        where: { tenantId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, fileSize: true },
      });

      // Group by day
      const byDay = new Map<string, { count: number; size: bigint }>();
      for (const t of transfers) {
        const day = t.createdAt.toISOString().split("T")[0];
        const existing = byDay.get(day) || { count: 0, size: BigInt(0) };
        byDay.set(day, {
          count: existing.count + 1,
          size: existing.size + t.fileSize,
        });
      }

      // Sort by date and format
      return Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, data]) => ({
          [xAxis]: day,
          [yAxis]: wantsBySize ? Number(data.size) : data.count,
        }));
    }

    // GROUP BY FILE TYPE (extension)
    if (wantsByFileType) {
      const transfers = await prisma.transfer.findMany({
        where: { tenantId },
        select: { fileName: true, fileSize: true },
      });

      const byType = new Map<string, { count: number; size: bigint }>();
      for (const t of transfers) {
        const ext = t.fileName.includes(".")
          ? t.fileName.split(".").pop()?.toLowerCase() || "unknown"
          : "no extension";
        const existing = byType.get(ext) || { count: 0, size: BigInt(0) };
        byType.set(ext, {
          count: existing.count + 1,
          size: existing.size + t.fileSize,
        });
      }

      // Sort by count descending, take top 10
      return Array.from(byType.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([ext, data]) => ({
          [xAxis]: `.${ext}`,
          [yAxis]: wantsBySize ? Number(data.size) : data.count,
        }));
    }

    // DEFAULT: GROUP BY STATUS (most common request)
    const statusCounts = await prisma.transfer.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
      _sum: { fileSize: true },
    });

    if (statusCounts.length > 0) {
      return statusCounts.map((s) => ({
        [xAxis]: s.status,
        [yAxis]: wantsBySize ? Number(s._sum.fileSize || 0) : s._count,
      }));
    }

    return [];
  } catch (error) {
    console.error("[populateChartData] Error:", error);
    return [];
  }
}

// Helper to save assistant message and return response
async function saveAndRespond(
  threadId: string,
  response: Record<string, any>
): Promise<NextResponse> {
  await prisma.chatMessage.create({
    data: {
      threadId,
      role: "assistant",
      content: response.message || "",
      type: response.type,
      data: JSON.stringify({
        results: response.results,
        files: response.files,
        folders: response.folders,
        stats: response.stats,
        bucket: response.bucket,
        // Visualization data
        chart: response.chart,
        table: response.table,
        document: response.document,
        metric: response.metric,
      }),
    },
  });

  // Update thread timestamp
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ...response, threadId });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, threadId, localScan: frontendScan } = await request.json();

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
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Get or create thread
    let thread;
    if (threadId) {
      thread = await prisma.chatThread.findFirst({
        where: { id: threadId, userId: session.user.id },
      });
    }
    
    if (!thread) {
      // Create new thread with first message as title
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

    // Fetch conversation history for context
    const conversationHistory = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 50, // Last 50 messages for extended context
      select: {
        role: true,
        content: true,
      },
    });

    // Superusers use env key, tenants use their encrypted key
    let apiKey: string | null = null;
    
    if (session.user.isSuperuser) {
      apiKey = process.env.OPENAI_API_KEY || null;
    } else {
      apiKey = await getSecret(session.user.tenantId, "OPENAI_API_KEY");
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: session.user.isSuperuser 
          ? "OPENAI_API_KEY not set in .env" 
          : "OpenAI API key not configured. Add your key in Settings." 
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Get some context about their data
    const [transferCount, buckets, recentTransfers, tenant] = await Promise.all([
      prisma.transfer.count({ where: { tenantId: session.user.tenantId } }),
      prisma.bucket.findMany({
        where: { tenantId: session.user.tenantId },
        select: { name: true, region: true },
      }),
      prisma.transfer.findMany({
        where: { tenantId: session.user.tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { fileName: true, fileSize: true, status: true, createdAt: true },
      }),
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
        select: { agentConnected: true },
      }),
    ]);

    const agentConnected = tenant?.agentConnected || false;

    // Build context message using helper
    const contextMessage = buildContextMessage({
      transferCount,
      buckets,
      recentTransfers,
      userName: session.user.name,
      localScan,
      agentConnected,
    });

    // Check if this is a cloud knowledge question vs data visualization
    const visualizationKeywords = /\b(chart|graph|plot|table|report|visuali|pie|bar|line|metric|transfer|bucket|file|upload)\b/i;
    const isVisualizationRequest = visualizationKeywords.test(message);
    
    let aiResponse = "";
    
    if (!isVisualizationRequest) {
      // Use Crawl4AI agent for cloud knowledge questions
      try {
        const crawl4aiUrl = process.env.CRAWL4AI_URL || "http://crawl4ai:1021";
        
        // Build conversation history for context
        const historyText = conversationHistory
          .slice(-10) // Last 10 messages
          .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n");

        const agentResponse = await fetch(`${crawl4aiUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message,
            conversation_history: historyText,
            system_prompt: `You are CloudFabric's AI assistant. You help users with cloud services (AWS, GCP, Azure, Oracle), migrations, and architecture.
            
User context:
- They have ${transferCount} file transfers
- ${buckets.length} configured buckets
- User: ${session.user.name || session.user.email}

CONVERSATION HISTORY (maintain context from previous messages):
${historyText}

Search the knowledge base when answering cloud-related questions. Be concise and technical. Remember the context from previous messages in this conversation.`
          }),
        });
        
        if (agentResponse.ok) {
          const agentData = await agentResponse.json();
          if (agentData.success && agentData.response) {
            console.log(`[Chat API] Crawl4AI agent responded (${agentData.tool_calls_made} tool calls)`);
            aiResponse = JSON.stringify({ type: "chat", message: agentData.response });
          }
        }
      } catch (agentError) {
        console.log("Crawl4AI agent error, falling back to direct OpenAI:", agentError);
      }
    }
    
    // Fallback to direct OpenAI for visualization requests or if agent failed
    if (!aiResponse) {
      console.log("[Chat API] Using direct OpenAI for:", isVisualizationRequest ? "visualization" : "fallback");
      
      // Build messages array with conversation history
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: DATA_ASSISTANT_PROMPT },
        { role: "system", content: contextMessage },
      ];

      // Add conversation history (excluding the current message we just saved)
      for (const msg of conversationHistory.slice(0, -1)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }

      // Add current message
      messages.push({ role: "user", content: message });

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages,
        temperature: 0.3,
        max_tokens: 16000, // Increased for complex responses
      });

      aiResponse = completion.choices[0]?.message?.content || "";
    }
    console.log("[Chat API] Raw AI response:", aiResponse.substring(0, 200));
    
    // Strip markdown code blocks if present
    aiResponse = aiResponse.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    
    // Try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(aiResponse);
      console.log("[Chat API] Parsed type:", parsed.type);
    } catch {
      // If not valid JSON, treat as conversational response
      console.log("[Chat API] Failed to parse JSON, treating as chat");
      parsed = { type: "chat", message: aiResponse };
    }

    // If it's a query, execute it
    if (parsed.type === "query" && parsed.filters) {
      const where: any = { tenantId: session.user.tenantId };
      const filters = parsed.filters;

      if (filters.status) where.status = filters.status;
      if (filters.minSize) where.fileSize = { gte: BigInt(filters.minSize) };
      if (filters.maxSize) where.fileSize = { ...where.fileSize, lte: BigInt(filters.maxSize) };
      if (filters.fileName) where.fileName = { contains: filters.fileName };
      if (filters.dateFrom) where.createdAt = { gte: new Date(filters.dateFrom) };
      if (filters.dateTo) where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };

      const results = await prisma.transfer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { bucket: { select: { name: true } } },
      });

      // Convert BigInt to string for JSON serialization
      const serializedResults = results.map((r) => ({
        ...r,
        fileSize: r.fileSize.toString(),
      }));

      return saveAndRespond(thread.id, {
        type: "query",
        message: parsed.message,
        results: serializedResults,
        count: results.length,
      });
    }

    // S3 operations - list objects
    if (parsed.type === "s3_list" || parsed.type === "s3_browse") {
      // Get AWS credentials
      let awsCreds;
      if (session.user.isSuperuser) {
        // Superuser uses env vars
        awsCreds = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || null,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || null,
        };
      } else {
        awsCreds = await getAwsCredentials(session.user.tenantId);
      }

      if (!awsCreds.accessKeyId || !awsCreds.secretAccessKey) {
        return NextResponse.json({
          type: "error",
          message: "AWS credentials not configured. Add your AWS keys in Settings.",
        });
      }

      // Get default bucket or use specified
      const defaultBucket = await prisma.bucket.findFirst({
        where: { tenantId: session.user.tenantId, isDefault: true },
      });
      
      const bucketName = parsed.s3?.bucket || defaultBucket?.name || process.env.AWS_S3_BUCKET;
      
      if (!bucketName) {
        return NextResponse.json({
          type: "error", 
          message: "No S3 bucket configured. Add a bucket first.",
        });
      }

      const s3Client = new S3Client({
        region: defaultBucket?.region || process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: awsCreds.accessKeyId,
          secretAccessKey: awsCreds.secretAccessKey,
        },
      });

      try {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: parsed.s3?.prefix || "",
          MaxKeys: parsed.s3?.maxKeys || 20,
          Delimiter: parsed.type === "s3_browse" ? "/" : undefined,
        });

        const response = await s3Client.send(command);
        
        const files = (response.Contents || []).map((obj) => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          storageClass: obj.StorageClass,
        }));

        const folders = (response.CommonPrefixes || []).map((p) => p.Prefix);

        return saveAndRespond(thread.id, {
          type: "s3_list",
          message: parsed.message,
          bucket: bucketName,
          prefix: parsed.s3?.prefix || "",
          files,
          folders,
          count: files.length,
          truncated: response.IsTruncated,
        });
      } catch (s3Error: any) {
        return NextResponse.json({
          type: "error",
          message: `S3 Error: ${s3Error.message}`,
        });
      }
    }

    // For insights, calculate stats if needed
    if (parsed.type === "insight") {
      const stats = await prisma.transfer.aggregate({
        where: { tenantId: session.user.tenantId },
        _sum: { fileSize: true },
        _count: true,
      });

      return saveAndRespond(thread.id, {
        type: "insight",
        message: parsed.message,
        stats: {
          totalFiles: stats._count,
          totalBytes: stats._sum.fileSize?.toString() || "0",
        },
      });
    }

    // For CHART visualizations - populate with real data based on chart intent
    if (parsed.type === "chart" && parsed.chart) {
      const chartData = await populateChartData(
        parsed.chart,
        session.user.tenantId,
        message
      );
      parsed.chart.data = chartData;
      
      return saveAndRespond(thread.id, {
        type: "chart",
        message: parsed.message,
        chart: parsed.chart,
      });
    }

    // For TABLE visualizations - populate with real data if needed
    if (parsed.type === "table" && parsed.table) {
      // If AI returned empty data, populate from transfers
      if (!parsed.table.data || parsed.table.data.length === 0) {
        const transfers = await prisma.transfer.findMany({
          where: { tenantId: session.user.tenantId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { bucket: { select: { name: true } } },
        });
        
        parsed.table.data = transfers.map((t) => ({
          fileName: t.fileName,
          fileSize: t.fileSize.toString(),
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          bucket: t.bucket?.name || "—",
        }));
      }
      
      return saveAndRespond(thread.id, {
        type: "table",
        message: parsed.message,
        table: parsed.table,
      });
    }

    // For DOCUMENT visualizations
    if (parsed.type === "document" && parsed.document) {
      return saveAndRespond(thread.id, {
        type: "document",
        message: parsed.message,
        document: parsed.document,
      });
    }

    // For METRIC visualizations
    if (parsed.type === "metric" && parsed.metric) {
      return saveAndRespond(thread.id, {
        type: "metric",
        message: parsed.message,
        metric: parsed.metric,
      });
    }

    // For AGENT COMMANDS - send command to desktop agent
    if (parsed.type === "agent_command" && parsed.command) {
      // Check if agent is connected
      if (!agentConnected) {
        return saveAndRespond(thread.id, {
          type: "chat",
          message: "The desktop agent is not connected. Please install and run the agent first, then try again.",
        });
      }

      // Create command in queue
      const command = await prisma.agentCommand.create({
        data: {
          tenantId: session.user.tenantId,
          type: parsed.command.type,
          payload: JSON.stringify(parsed.command.payload || {}),
          status: "PENDING",
        },
      });

      return saveAndRespond(thread.id, {
        type: "agent_command",
        message: parsed.message,
        commandId: command.id,
        commandType: parsed.command.type,
        commandStatus: "PENDING",
      });
    }

    // For chat/conversational responses, just return the message
    if (parsed.type === "chat" || parsed.message) {
      return saveAndRespond(thread.id, {
        type: "chat",
        message: parsed.message || "I'm here to help with your data. Try asking about your S3 bucket or transfers!",
      });
    }

    return saveAndRespond(thread.id, parsed);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
