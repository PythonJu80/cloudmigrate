import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSecret } from "@/lib/secrets";
import OpenAI from "openai";

// Simple HTML to text extraction
function extractText(html: string): string {
  // Remove scripts and styles
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { websiteUrl } = await request.json();
    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL required" }, { status: 400 });
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(websiteUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Get OpenAI API key
    const tenantKey = await getSecret(session.user.tenantId, "openai_api_key");
    const apiKey = tenantKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 400 });
    }

    // Fetch the website
    console.log(`Fetching ${url.href}...`);
    const response = await fetch(url.href, {
      headers: {
        "User-Agent": "CloudMigrate-Bot/1.0 (Knowledge Scraper)",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch website: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();
    const text = extractText(html);
    
    // Limit text length
    const maxLength = 15000;
    const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

    // Use GPT to summarize and extract key business info
    const openai = new OpenAI({ apiKey });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a business analyst. Extract and summarize key information about this company from their website content. Focus on:
1. What the company does (products/services)
2. Their industry and target market
3. Company size indicators (if mentioned)
4. Technology stack or infrastructure (if mentioned)
5. Any challenges or pain points they might have with cloud/data

Format as a concise summary (max 500 words) that would help a cloud migration advisor understand this business.`,
        },
        {
          role: "user",
          content: `Website: ${url.href}\n\nContent:\n${truncatedText}`,
        },
      ],
      max_tokens: 800,
    });

    const companyContext = completion.choices[0]?.message?.content || "";

    // Save to tenant
    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        companyWebsite: url.href,
        companyContext,
        knowledgeUpdatedAt: new Date(),
      },
    });

    // Also create knowledge chunks for RAG
    const source = `company:${session.user.tenantId}`;
    
    // Clear old company knowledge
    await prisma.knowledgeChunk.deleteMany({
      where: { source },
    });

    // Create embedding for company context
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `Company Context: ${companyContext}`,
    });

    await prisma.knowledgeChunk.create({
      data: {
        source,
        title: `Company Profile: ${url.hostname}`,
        content: companyContext,
        embedding: JSON.stringify(embeddingResponse.data[0].embedding),
        metadata: JSON.stringify({ 
          tenantId: session.user.tenantId,
          website: url.href,
          scrapedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      website: url.href,
      summary: companyContext,
    });
  } catch (error) {
    console.error("Company knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to process company website" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: {
        companyWebsite: true,
        companyContext: true,
        knowledgeUpdatedAt: true,
      },
    });

    return NextResponse.json({
      website: tenant?.companyWebsite || null,
      context: tenant?.companyContext || null,
      updatedAt: tenant?.knowledgeUpdatedAt || null,
    });
  } catch (error) {
    console.error("Get company knowledge error:", error);
    return NextResponse.json({ error: "Failed to get company knowledge" }, { status: 500 });
  }
}
