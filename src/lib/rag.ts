import { prisma } from "./db";
import OpenAI from "openai";

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search knowledge base for relevant chunks
 * Includes both global knowledge and tenant-specific company knowledge
 */
export async function searchKnowledge(
  query: string,
  apiKey: string,
  topK: number = 3,
  tenantId?: string
): Promise<{ title: string; content: string; score: number }[]> {
  const openai = new OpenAI({ apiKey });

  // Get embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Get all knowledge chunks (docs + company-specific)
  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      OR: [
        { source: { startsWith: "docs:" } },  // All provider docs (docs:aws, docs:gcp, etc.)
        { source: "cloudmigrate-knowledge-base" },  // Legacy hardcoded knowledge
        ...(tenantId ? [{ source: `company:${tenantId}` }] : []),  // Company-specific
      ],
    },
    select: {
      title: true,
      content: true,
      embedding: true,
      source: true,
    },
  });

  // Calculate similarity scores
  const scored = chunks.map((chunk) => {
    const chunkEmbedding = JSON.parse(chunk.embedding) as number[];
    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    return {
      title: chunk.title || "",
      content: chunk.content,
      score,
    };
  });

  // Sort by score and return top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Build context from knowledge chunks for the prompt
 */
export function buildKnowledgeContext(
  chunks: { title: string; content: string; score: number }[]
): string {
  if (chunks.length === 0) return "";

  const context = chunks
    .map((c) => `### ${c.title}\n${c.content}`)
    .join("\n\n");

  return `
## Cloud Migration Knowledge Base
The following is expert knowledge about cloud migration that you should use to answer questions:

${context}

Use this knowledge to provide accurate, helpful answers about cloud migration strategies, benefits, challenges, and AWS tools.`;
}
