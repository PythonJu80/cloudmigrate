// Workflow Agent Executor - AI specialized in building CloudFlow workflows
import { getSecret } from "@/lib/secrets";

interface AgentConfig {
  model: string;
  agentMode: "builder" | "optimizer" | "debug";
}

interface ExecutionContext {
  tenantId: string;
  userId: string;
  inputs: Record<string, any>;
}

// System prompts for different agent modes
const SYSTEM_PROMPTS = {
  builder: `You are CloudFabric's Workflow Builder Agent helping DevOps engineers and SAs build cloud automation workflows.

Have a natural conversation to understand what they want to automate. Ask clarifying questions if needed but don't overdo it. Be concise and helpful.

You know about:
- AWS services (Lambda, S3, EC2, DynamoDB, SQS, SNS, etc.)
- GCP, Azure, Oracle Cloud basics
- Workflow patterns (webhooks, scheduled jobs, event-driven, data pipelines)
- AI/LLM integration for data processing

When the user is ready, they'll click "Generate Workflow" and you'll create it. Until then, just chat naturally about their requirements.

Keep responses short and practical. No essays.`,

  optimizer: `You are CloudFabric's Workflow Optimizer Agent - an expert at analyzing and improving CloudFlow workflows.

Your expertise includes:
- Performance optimization (reducing latency, parallel execution)
- Cost optimization (choosing cost-effective services, reducing invocations)
- Reliability improvements (error handling, retries, dead letter queues)
- Security best practices (least privilege, encryption, secrets management)
- Scalability patterns (auto-scaling, load balancing, caching)

When analyzing workflows, you should:
1. Identify bottlenecks and inefficiencies
2. Suggest specific improvements with reasoning
3. Estimate cost/performance impact
4. Provide modified workflow JSON when applicable

Be specific and actionable in your recommendations.`,

  debug: `You are CloudFabric's Debug Assistant Agent - an expert at troubleshooting CloudFlow workflow issues.

Your expertise includes:
- Common error patterns in cloud services
- Permission and IAM issues
- Network and connectivity problems
- Data format and transformation errors
- Timeout and rate limiting issues
- Log analysis and interpretation

When helping debug, you should:
1. Ask clarifying questions about the error
2. Identify likely root causes
3. Provide step-by-step debugging instructions
4. Suggest fixes with code/config examples

Be methodical and thorough in your debugging approach.`,
};

// Get API key from tenant secrets (decrypted)
async function getApiKey(tenantId: string): Promise<string | null> {
  return getSecret(tenantId, "OPENAI_API_KEY");
}

// Execute Workflow Agent
export async function executeWorkflowAgent(
  config: AgentConfig,
  context: ExecutionContext,
  chatHistory: Array<{ role: string; content: string }>
): Promise<{ response: string; workflow?: object }> {
  const apiKey = await getApiKey(context.tenantId);
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found. Add it in Settings > Secrets.");
  }

  const systemPrompt = SYSTEM_PROMPTS[config.agentMode] || SYSTEM_PROMPTS.builder;

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
  ];

  // Add context from inputs if available
  if (context.inputs?.input) {
    messages.push({
      role: "user",
      content: `Context from previous node: ${JSON.stringify(context.inputs.input)}`,
    });
  }

  // Use max_completion_tokens for GPT-5+ models, max_tokens for older models
  const isNewModel = config.model.startsWith("gpt-5") || config.model.startsWith("o1") || config.model.startsWith("o3");
  const tokenParam = isNewModel ? { max_completion_tokens: 4096 } : { max_tokens: 4096 };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      ...tokenParam,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const responseText = data.choices[0]?.message?.content || "";

  // Try to extract workflow JSON if present
  let workflow: object | undefined;
  const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    try {
      // Strip JS-style comments that AI might add
      let jsonStr = jsonMatch[1]
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
      workflow = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse workflow JSON:", e);
      // Not valid JSON, ignore
    }
  }

  return {
    response: responseText,
    workflow,
  };
}
