/**
 * CloudFabric™ - Event Bus
 * 
 * Pub/sub event system for decoupled communication between modules.
 * Uses Redis for persistence and cross-instance communication.
 */

import { Redis } from "ioredis";

// Event types
export type EventType =
  // Resource events
  | "resource.created"
  | "resource.updated"
  | "resource.deleted"
  | "resource.status_changed"
  // Architecture events
  | "architecture.created"
  | "architecture.updated"
  | "architecture.deployed"
  | "architecture.deployment_failed"
  // Workflow events
  | "workflow.created"
  | "workflow.updated"
  | "workflow.triggered"
  | "workflow.completed"
  | "workflow.failed"
  // Alert events
  | "alert.triggered"
  | "alert.acknowledged"
  | "alert.resolved"
  // Transfer events (existing)
  | "transfer.started"
  | "transfer.progress"
  | "transfer.completed"
  | "transfer.failed"
  // System events
  | "system.error"
  | "system.warning";

// Event payload interface
export interface CloudEvent<T = unknown> {
  id: string;
  type: EventType;
  tenantId: string;
  userId?: string;
  timestamp: number;
  data: T;
  metadata?: Record<string, unknown>;
}

// Event handler type
export type EventHandler<T = unknown> = (event: CloudEvent<T>) => Promise<void> | void;

// Singleton Redis clients
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

// In-memory handlers for local subscriptions
const handlers = new Map<EventType, Set<EventHandler>>();

// Channel name
const CHANNEL = "cloudfabric:events";

/**
 * Get Redis connection URL
 */
function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://redis:6379";
}

/**
 * Initialize Redis connections
 */
async function initRedis(): Promise<void> {
  if (publisher && subscriber) return;

  const redisUrl = getRedisUrl();

  publisher = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  subscriber = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  // Handle incoming messages
  subscriber.on("message", (channel, message) => {
    if (channel !== CHANNEL) return;

    try {
      const event = JSON.parse(message) as CloudEvent;
      const eventHandlers = handlers.get(event.type);

      if (eventHandlers) {
        eventHandlers.forEach((handler) => {
          try {
            handler(event);
          } catch (error) {
            console.error(`Event handler error for ${event.type}:`, error);
          }
        });
      }
    } catch (error) {
      console.error("Failed to parse event message:", error);
    }
  });

  await subscriber.subscribe(CHANNEL);
  console.log("Event bus connected to Redis");
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Publish an event
 */
export async function publish<T>(
  type: EventType,
  tenantId: string,
  data: T,
  options?: { userId?: string; metadata?: Record<string, unknown> }
): Promise<string> {
  await initRedis();

  const event: CloudEvent<T> = {
    id: generateEventId(),
    type,
    tenantId,
    userId: options?.userId,
    timestamp: Date.now(),
    data,
    metadata: options?.metadata,
  };

  await publisher!.publish(CHANNEL, JSON.stringify(event));

  // Also store in Redis list for history (keep last 1000 events per tenant)
  const historyKey = `cloudfabric:events:${tenantId}`;
  await publisher!.lpush(historyKey, JSON.stringify(event));
  await publisher!.ltrim(historyKey, 0, 999);

  return event.id;
}

/**
 * Subscribe to events
 */
export async function subscribe<T = unknown>(
  type: EventType,
  handler: EventHandler<T>
): Promise<() => void> {
  await initRedis();

  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }

  handlers.get(type)!.add(handler as EventHandler);

  // Return unsubscribe function
  return () => {
    handlers.get(type)?.delete(handler as EventHandler);
  };
}

/**
 * Subscribe to multiple event types
 */
export async function subscribeMany<T = unknown>(
  types: EventType[],
  handler: EventHandler<T>
): Promise<() => void> {
  const unsubscribers = await Promise.all(
    types.map((type) => subscribe(type, handler))
  );

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Get recent events for a tenant
 */
export async function getRecentEvents(
  tenantId: string,
  limit = 100
): Promise<CloudEvent[]> {
  await initRedis();

  const historyKey = `cloudfabric:events:${tenantId}`;
  const events = await publisher!.lrange(historyKey, 0, limit - 1);

  return events.map((e) => JSON.parse(e) as CloudEvent);
}

/**
 * Get events by type for a tenant
 */
export async function getEventsByType(
  tenantId: string,
  type: EventType,
  limit = 50
): Promise<CloudEvent[]> {
  const allEvents = await getRecentEvents(tenantId, 500);
  return allEvents.filter((e) => e.type === type).slice(0, limit);
}

/**
 * Close Redis connections
 */
export async function closeEventBus(): Promise<void> {
  if (subscriber) {
    await subscriber.unsubscribe(CHANNEL);
    subscriber.disconnect();
    subscriber = null;
  }

  if (publisher) {
    publisher.disconnect();
    publisher = null;
  }

  handlers.clear();
}

/**
 * Convenience methods for common events
 */
export const events = {
  // Resource events
  resourceCreated: (tenantId: string, resourceId: string, resourceType: string, userId?: string) =>
    publish("resource.created", tenantId, { resourceId, resourceType }, { userId }),

  resourceUpdated: (tenantId: string, resourceId: string, changes: Record<string, unknown>, userId?: string) =>
    publish("resource.updated", tenantId, { resourceId, changes }, { userId }),

  resourceDeleted: (tenantId: string, resourceId: string, resourceType: string, userId?: string) =>
    publish("resource.deleted", tenantId, { resourceId, resourceType }, { userId }),

  resourceStatusChanged: (tenantId: string, resourceId: string, oldStatus: string, newStatus: string) =>
    publish("resource.status_changed", tenantId, { resourceId, oldStatus, newStatus }),

  // Architecture events
  architectureDeployed: (tenantId: string, architectureId: string, resourceCount: number, userId?: string) =>
    publish("architecture.deployed", tenantId, { architectureId, resourceCount }, { userId }),

  architectureDeploymentFailed: (tenantId: string, architectureId: string, error: string, userId?: string) =>
    publish("architecture.deployment_failed", tenantId, { architectureId, error }, { userId }),

  // Workflow events
  workflowTriggered: (tenantId: string, workflowId: string, triggeredBy: string) =>
    publish("workflow.triggered", tenantId, { workflowId, triggeredBy }),

  workflowCompleted: (tenantId: string, workflowId: string, executionId: string, duration: number) =>
    publish("workflow.completed", tenantId, { workflowId, executionId, duration }),

  workflowFailed: (tenantId: string, workflowId: string, executionId: string, error: string) =>
    publish("workflow.failed", tenantId, { workflowId, executionId, error }),

  // Alert events
  alertTriggered: (tenantId: string, alertRuleId: string, value: number, threshold: number, resourceArn?: string) =>
    publish("alert.triggered", tenantId, { alertRuleId, value, threshold, resourceArn }),

  alertResolved: (tenantId: string, incidentId: string, resolvedBy?: string) =>
    publish("alert.resolved", tenantId, { incidentId, resolvedBy }),

  // Transfer events
  transferStarted: (tenantId: string, transferId: string, fileName: string, userId?: string) =>
    publish("transfer.started", tenantId, { transferId, fileName }, { userId }),

  transferCompleted: (tenantId: string, transferId: string, fileName: string, size: number) =>
    publish("transfer.completed", tenantId, { transferId, fileName, size }),

  transferFailed: (tenantId: string, transferId: string, fileName: string, error: string) =>
    publish("transfer.failed", tenantId, { transferId, fileName, error }),
};
