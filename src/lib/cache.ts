/**
 * Redis Cache Utility
 * 
 * Caching layer for expensive API calls (CloudWatch, Cost Explorer, etc.)
 */

import { Redis } from "ioredis";

let redis: Redis | null = null;

/**
 * Get Redis client (singleton)
 */
function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
  }
  return redis;
}

/**
 * Cache key prefix
 */
const PREFIX = "cloudmigrate:cache:";

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const value = await client.get(PREFIX + key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

/**
 * Set cached value with TTL (in seconds)
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  try {
    const client = getRedis();
    await client.setex(PREFIX + key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(PREFIX + key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
}

/**
 * Delete all cached values matching pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const client = getRedis();
    const keys = await client.keys(PREFIX + pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error("Cache delete pattern error:", error);
  }
}

/**
 * Get or set cache (fetch if not cached)
 */
export async function cacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try cache first
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const value = await fetchFn();
  await setCache(key, value, ttlSeconds);
  return value;
}

/**
 * Cache keys for monitoring
 */
export const CacheKeys = {
  // CloudWatch metrics - cache for 1 minute
  metrics: (tenantId: string) => `metrics:${tenantId}`,
  
  // EC2 instances - cache for 2 minutes
  instances: (tenantId: string) => `instances:${tenantId}`,
  
  // Costs - cache for 15 minutes (doesn't change often)
  costs: (tenantId: string) => `costs:${tenantId}`,
  
  // Quotas - cache for 1 hour
  quotas: (tenantId: string) => `quotas:${tenantId}`,
  
  // Audit events - cache for 30 seconds
  auditEvents: (tenantId: string) => `audit:${tenantId}`,
  
  // Health events - cache for 5 minutes
  healthEvents: (tenantId: string) => `health:${tenantId}`,
};

/**
 * Cache TTLs in seconds
 */
export const CacheTTL = {
  METRICS: 60,        // 1 minute
  INSTANCES: 120,     // 2 minutes
  COSTS: 900,         // 15 minutes
  QUOTAS: 3600,       // 1 hour
  AUDIT_EVENTS: 30,   // 30 seconds
  HEALTH_EVENTS: 300, // 5 minutes
};
