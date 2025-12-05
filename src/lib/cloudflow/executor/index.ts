// CloudFlow Executor
// Orchestrates workflow execution with credential management

import { prisma } from "@/lib/db";
import { Flow, FlowNode, FlowEdge, ExecutionContext } from "../nodes/types";
import { getNodeDefinition } from "../nodes/registry";
import { initAwsClients, AwsClients } from "./clients";
import { awsHandlers } from "./handlers/aws";
import { executeLLMChat, executeLLMCompletion } from "../executors/llm";
import { executeWorkflowAgent } from "../executors/workflow-agent";

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  startedAt: Date;
  completedAt: Date;
  nodeResults: Record<string, {
    status: "success" | "error" | "skipped";
    outputs: Record<string, any>;
    error?: string;
    duration: number;
  }>;
  error?: string;
}

export interface ExecutionLog {
  timestamp: Date;
  nodeId: string;
  message: string;
  level: "info" | "warn" | "error";
}

/**
 * Execute a CloudFlow workflow
 */
export async function executeFlow(
  flow: Flow,
  tenantId: string,
  triggeredBy: string = "manual"
): Promise<ExecutionResult> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const startedAt = new Date();
  const logs: ExecutionLog[] = [];
  const nodeResults: ExecutionResult["nodeResults"] = {};

  const log = (nodeId: string, message: string, level: "info" | "warn" | "error" = "info") => {
    logs.push({ timestamp: new Date(), nodeId, message, level });
    console.log(`[${executionId}] [${nodeId}] ${message}`);
  };

  try {
    // Create execution record
    await prisma.flowExecution.create({
      data: {
        id: executionId,
        flowId: flow.id,
        tenantId,
        status: "running",
        triggeredBy,
        startedAt,
      },
    });

    // Build execution order (topological sort)
    const executionOrder = getExecutionOrder(flow.nodes, flow.edges);
    log("executor", `Execution order: ${executionOrder.map(n => n.id).join(" -> ")}`);

    // Track outputs from each node for passing to downstream nodes
    const nodeOutputs: Record<string, Record<string, any>> = {};

    // Initialize cloud clients based on nodes in the flow
    const providers = new Set(flow.nodes.map(n => {
      const def = getNodeDefinition(n.definitionId);
      return def?.provider;
    }).filter(Boolean));

    let awsClients: AwsClients | null = null;
    if (providers.has("aws")) {
      awsClients = await initAwsClients(tenantId);
      if (!awsClients) {
        throw new Error("AWS credentials not configured. Please add credentials in Settings.");
      }
      log("executor", "AWS clients initialized");
    }

    // Execute nodes in order
    for (const node of executionOrder) {
      const nodeStart = Date.now();
      const definition = getNodeDefinition(node.definitionId);

      if (!definition) {
        nodeResults[node.id] = {
          status: "error",
          outputs: {},
          error: `Unknown node type: ${node.definitionId}`,
          duration: Date.now() - nodeStart,
        };
        continue;
      }

      // Skip trigger nodes (they just start the flow)
      if (definition.type === "trigger") {
        nodeResults[node.id] = {
          status: "success",
          outputs: { triggered: true },
          duration: Date.now() - nodeStart,
        };
        nodeOutputs[node.id] = { triggered: true };
        continue;
      }

      // Gather inputs from connected upstream nodes
      const inputs: Record<string, any> = {};
      const incomingEdges = flow.edges.filter(e => e.target === node.id);
      for (const edge of incomingEdges) {
        const sourceOutputs = nodeOutputs[edge.source] || {};
        Object.assign(inputs, sourceOutputs);
      }

      // Create execution context
      const context: ExecutionContext = {
        flowId: flow.id,
        executionId,
        credentials: {}, // Credentials are handled by clients
        inputs,
        logger: (msg) => log(node.id, msg),
      };

      try {
        log(node.id, `Executing ${definition.label}`);
        
        let outputs: Record<string, any> = {};

        // Route to appropriate handler
        if (definition.id === "ai.workflow.agent") {
          const result = await executeWorkflowAgent(
            node.data.config as any,
            { tenantId, userId: triggeredBy, inputs },
            node.data.chatHistory || []
          );
          outputs = result;
        } else if (definition.id === "ai.llm.chat") {
          const result = await executeLLMChat(node.data.config as any, {
            tenantId,
            userId: triggeredBy,
            inputs,
          });
          outputs = result;
        } else if (definition.id === "ai.llm.completion") {
          const result = await executeLLMCompletion(node.data.config as any, {
            tenantId,
            userId: triggeredBy,
            inputs,
          });
          outputs = result;
        } else if (definition.provider === "aws" && awsClients) {
          const handler = awsHandlers[definition.id];
          if (handler) {
            outputs = await handler(awsClients, context, node.data.config || {});
          } else {
            throw new Error(`No handler for ${definition.id}`);
          }
        } else if (definition.provider === "gcp") {
          // TODO: Implement GCP handlers
          throw new Error("GCP handlers not yet implemented");
        } else if (definition.provider === "azure") {
          // TODO: Implement Azure handlers
          throw new Error("Azure handlers not yet implemented");
        } else if (definition.category === "ai") {
          throw new Error(`Unknown AI node: ${definition.id}`);
        } else {
          throw new Error(`Unsupported provider: ${definition.provider}`);
        }

        nodeResults[node.id] = {
          status: "success",
          outputs,
          duration: Date.now() - nodeStart,
        };
        nodeOutputs[node.id] = outputs;
        log(node.id, `Completed successfully`);

      } catch (error: any) {
        log(node.id, `Error: ${error.message}`, "error");
        nodeResults[node.id] = {
          status: "error",
          outputs: {},
          error: error.message,
          duration: Date.now() - nodeStart,
        };
        
        // Stop execution on error (could make this configurable)
        throw error;
      }
    }

    const completedAt = new Date();

    // Update execution record
    await prisma.flowExecution.update({
      where: { id: executionId },
      data: {
        status: "success",
        completedAt,
        results: JSON.stringify(nodeResults),
        logs: JSON.stringify(logs),
      },
    });

    return {
      success: true,
      executionId,
      startedAt,
      completedAt,
      nodeResults,
    };

  } catch (error: any) {
    const completedAt = new Date();

    // Update execution record with error
    await prisma.flowExecution.update({
      where: { id: executionId },
      data: {
        status: "error",
        completedAt,
        results: JSON.stringify(nodeResults),
        logs: JSON.stringify(logs),
        error: error.message,
      },
    });

    return {
      success: false,
      executionId,
      startedAt,
      completedAt,
      nodeResults,
      error: error.message,
    };
  }
}

/**
 * Get execution order using topological sort
 */
function getExecutionOrder(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // Find nodes with no incoming edges (triggers)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  // Process queue
  const result: FlowNode[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      result.push(node);
    }

    for (const neighbor of adjacency.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Get execution history for a flow
 */
export async function getFlowExecutions(
  flowId: string,
  tenantId: string,
  limit: number = 10
) {
  return prisma.flowExecution.findMany({
    where: { flowId, tenantId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

/**
 * Get a specific execution
 */
export async function getExecution(executionId: string, tenantId: string) {
  return prisma.flowExecution.findFirst({
    where: { id: executionId, tenantId },
  });
}
