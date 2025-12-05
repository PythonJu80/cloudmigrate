/**
 * Knowledge Base Scraper
 * 
 * Scrapes official cloud provider documentation and seeds the knowledge base.
 * Run with: docker compose exec dev npx tsx scripts/scrape-knowledge.ts
 */

import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

// URLs to scrape for each provider
const KNOWLEDGE_SOURCES = {
  aws: [
    "https://aws.amazon.com/what-is/cloud-migration/",
    "https://aws.amazon.com/cloud-migration/",
    "https://aws.amazon.com/architecture/well-architected/",
    "https://aws.amazon.com/s3/",
    "https://aws.amazon.com/ec2/",
    "https://aws.amazon.com/rds/",
    "https://aws.amazon.com/lambda/",
    "https://aws.amazon.com/cloudformation/",
    "https://aws.amazon.com/cloudwatch/",
  ],
  gcp: [
    "https://cloud.google.com/learn/what-is-cloud-migration",
    "https://cloud.google.com/architecture/migration-to-gcp-getting-started",
    "https://cloud.google.com/storage",
    "https://cloud.google.com/compute",
    "https://cloud.google.com/sql",
    "https://cloud.google.com/functions",
    "https://cloud.google.com/bigquery",
  ],
  azure: [
    "https://azure.microsoft.com/en-us/solutions/migration/",
    "https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/",
    "https://azure.microsoft.com/en-us/products/storage/blobs/",
    "https://azure.microsoft.com/en-us/products/virtual-machines/",
    "https://azure.microsoft.com/en-us/products/azure-sql/",
    "https://azure.microsoft.com/en-us/products/functions/",
  ],
  oracle: [
    "https://www.oracle.com/cloud/cloud-migration/",
    "https://www.oracle.com/cloud/storage/object-storage/",
    "https://www.oracle.com/cloud/compute/",
    "https://www.oracle.com/autonomous-database/",
    "https://www.oracle.com/cloud/networking/",
  ],
};

/**
 * Extract text from HTML
 */
function extractText(html: string): string {
  // Remove scripts, styles, nav, footer, header
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&mdash;/g, "—");
  text = text.replace(/&ndash;/g, "–");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
}

/**
 * Chunk text into smaller pieces
 */
function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk.trim().length > 100) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Fetch and process a URL
 */
async function scrapeUrl(url: string): Promise<{ title: string; chunks: string[] } | null> {
  try {
    console.log(`  Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CloudFabric-Bot/1.0 (Knowledge Scraper)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      console.log(`    ⚠️ Failed: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).pathname;
    
    // Extract and chunk text
    const text = extractText(html);
    
    if (text.length < 200) {
      console.log(`    ⚠️ Too little content`);
      return null;
    }

    const chunks = chunkText(text);
    console.log(`    ✓ Extracted ${chunks.length} chunks`);
    
    return { title, chunks };
  } catch (error: any) {
    console.log(`    ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Generate title for a chunk using GPT
 */
async function generateChunkTitle(
  openai: OpenAI,
  content: string,
  provider: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate a short, descriptive title (max 10 words) for this cloud documentation chunk. Include the provider name if relevant.",
        },
        {
          role: "user",
          content: `Provider: ${provider.toUpperCase()}\n\nContent: ${content.slice(0, 500)}`,
        },
      ],
      max_tokens: 30,
    });
    return completion.choices[0]?.message?.content?.trim() || `${provider.toUpperCase()} Documentation`;
  } catch {
    return `${provider.toUpperCase()} Documentation`;
  }
}

/**
 * Main scraping function
 */
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not set");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Parse args
  const args = process.argv.slice(2);
  const clearExisting = args.includes("--clear");
  const providersArg = args.find(a => a.startsWith("--providers="));
  const providers = providersArg 
    ? providersArg.split("=")[1].split(",") 
    : Object.keys(KNOWLEDGE_SOURCES);

  if (clearExisting) {
    console.log("🧹 Clearing existing knowledge chunks...");
    await prisma.knowledgeChunk.deleteMany({
      where: {
        source: { startsWith: "docs:" },
      },
    });
  }

  console.log(`\n📚 Scraping knowledge for: ${providers.join(", ")}\n`);

  let totalChunks = 0;

  for (const provider of providers) {
    const urls = KNOWLEDGE_SOURCES[provider as keyof typeof KNOWLEDGE_SOURCES];
    if (!urls) {
      console.log(`⚠️ Unknown provider: ${provider}`);
      continue;
    }

    console.log(`\n🔷 ${provider.toUpperCase()}`);

    for (const url of urls) {
      const result = await scrapeUrl(url);
      if (!result) continue;

      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i];
        
        // Skip very short chunks
        if (chunk.length < 150) continue;

        // Generate title
        const title = await generateChunkTitle(openai, chunk, provider);

        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: `${title}\n\n${chunk}`,
        });

        // Store in database (upsert to avoid duplicates)
        // Use content hash as unique identifier
        const contentHash = Buffer.from(chunk.slice(0, 200)).toString('base64').slice(0, 50);
        const chunkId = `${provider}_${contentHash}`;
        
        await prisma.knowledgeChunk.upsert({
          where: { id: chunkId },
          update: {
            title,
            content: chunk,
            embedding: JSON.stringify(embeddingResponse.data[0].embedding),
            metadata: JSON.stringify({
              provider,
              url,
              chunkIndex: i,
              scrapedAt: new Date().toISOString(),
            }),
          },
          create: {
            id: chunkId,
            source: `docs:${provider}`,
            title,
            content: chunk,
            embedding: JSON.stringify(embeddingResponse.data[0].embedding),
            metadata: JSON.stringify({
              provider,
              url,
              chunkIndex: i,
              scrapedAt: new Date().toISOString(),
            }),
          },
        });

        totalChunks++;
        process.stdout.write(`    Embedded: ${title.slice(0, 50)}...\r`);
      }
      console.log(); // newline after each URL
    }
  }

  console.log(`\n✅ Done! Created ${totalChunks} knowledge chunks.`);

  // Show summary
  const counts = await prisma.knowledgeChunk.groupBy({
    by: ["source"],
    _count: true,
  });
  
  console.log("\n📊 Knowledge Base Summary:");
  for (const c of counts) {
    console.log(`   ${c.source}: ${c._count} chunks`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
