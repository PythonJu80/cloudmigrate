// LLM Node Executor - Calls OpenAI API
import { getSecret } from "@/lib/secrets";

interface LLMConfig {
  model: string;
  systemPrompt?: string;
  userPrompt?: string;
  prompt?: string;
  temperature: string;
  maxTokens: string;
}

interface ExecutionContext {
  tenantId: string;
  userId: string;
  inputs: Record<string, any>;
}

// Get decrypted API key from user's secrets
async function getApiKey(tenantId: string): Promise<string | null> {
  return getSecret(tenantId, "OPENAI_API_KEY");
}

// Execute LLM Chat node
export async function executeLLMChat(
  config: LLMConfig,
  context: ExecutionContext
): Promise<{ response: string; usage: object }> {
  const apiKey = await getApiKey(context.tenantId);
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found. Add it in Settings > Secrets.");
  }

  // Replace {{input}} template with actual input
  let userPrompt = config.userPrompt || "";
  if (context.inputs?.input) {
    userPrompt = userPrompt.replace(/\{\{input\}\}/g, JSON.stringify(context.inputs.input));
  }

  const messages: Array<{ role: string; content: string }> = [];
  
  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }
  
  messages.push({ role: "user", content: userPrompt });

  // Use max_completion_tokens for GPT-5+ models, max_tokens for older models
  const isNewModel = config.model.startsWith("gpt-5") || config.model.startsWith("o1") || config.model.startsWith("o3");
  const maxTokens = parseInt(config.maxTokens) || 1024;
  const tokenParam = isNewModel ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: parseFloat(config.temperature) || 0.7,
      ...tokenParam,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    response: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

// Execute LLM Completion node
export async function executeLLMCompletion(
  config: LLMConfig,
  context: ExecutionContext
): Promise<{ completion: string; usage: object }> {
  const apiKey = await getApiKey(context.tenantId);
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not found. Add it in Settings > Secrets.");
  }

  // Replace {{input}} template with actual input
  let prompt = config.prompt || "";
  if (context.inputs?.input) {
    prompt = prompt.replace(/\{\{input\}\}/g, JSON.stringify(context.inputs.input));
  }

  // Use max_completion_tokens for GPT-5+ models, max_tokens for older models
  const isNewModel = config.model.startsWith("gpt-5") || config.model.startsWith("o1") || config.model.startsWith("o3");
  const maxTokens = parseInt(config.maxTokens) || 1024;
  const tokenParam = isNewModel ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: parseFloat(config.temperature) || 0.7,
      ...tokenParam,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  return {
    completion: data.choices[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}
