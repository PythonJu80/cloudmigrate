import neo4j, { Driver, Session, Result } from "neo4j-driver";
import { prisma } from "./db";
import { checkPlanLimits } from "./graph-usage";

// Singleton driver for shared cluster
let sharedDriver: Driver | null = null;

/**
 * Get the shared Neo4j driver (for multi-tenant shared cluster)
 */
export function getSharedDriver(): Driver {
  if (!sharedDriver) {
    const uri = process.env.NEO4J_URI || "bolt://neo4j:7687";
    const user = process.env.NEO4J_USER || "neo4j";
    const password = process.env.NEO4J_PASSWORD || "cloudmigrate2025";
    
    sharedDriver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
    });
  }
  return sharedDriver;
}

/**
 * Get a driver for a specific tenant (BYOD or shared)
 */
export async function getTenantDriver(tenantId: string): Promise<Driver> {
  const config = await prisma.tenantNeo4jConfig.findUnique({
    where: { tenantId },
  });

  if (!config || config.configType === "SHARED") {
    return getSharedDriver();
  }

  // BYOD - create a dedicated driver
  return neo4j.driver(
    config.boltUri,
    neo4j.auth.basic(config.username, config.password)
  );
}

/**
 * Get the database name for a tenant
 */
export async function getTenantDatabase(tenantId: string): Promise<string> {
  const config = await prisma.tenantNeo4jConfig.findUnique({
    where: { tenantId },
  });
  return config?.database || `tenant_${tenantId.replace(/-/g, "_")}`;
}

/**
 * Multi-tenant Neo4j client with usage tracking
 */
export class TenantGraphClient {
  private tenantId: string;
  private driver: Driver;
  private database: string;
  private startTime: number = 0;
  private nodesProcessed: number = 0;
  private relsProcessed: number = 0;
  private queriesExecuted: number = 0;

  private constructor(tenantId: string, driver: Driver, database: string) {
    this.tenantId = tenantId;
    this.driver = driver;
    this.database = database;
  }

  static async create(tenantId: string): Promise<TenantGraphClient> {
    const driver = await getTenantDriver(tenantId);
    const database = await getTenantDatabase(tenantId);
    return new TenantGraphClient(tenantId, driver, database);
  }

  /**
   * Check if tenant has exceeded plan limits
   * Throws an error if limits exceeded
   */
  async checkLimits(): Promise<void> {
    const limitCheck = await checkPlanLimits(this.tenantId);
    if (!limitCheck.allowed) {
      const error = new Error(limitCheck.reason || "Plan limit exceeded");
      (error as any).code = "PLAN_LIMIT_EXCEEDED";
      (error as any).usage = limitCheck.usage;
      throw error;
    }
  }

  /**
   * Run a Cypher query with usage tracking
   */
  async run(cypher: string, params: Record<string, any> = {}): Promise<Result> {
    const session = this.driver.session({ database: this.database });
    this.queriesExecuted++;
    const startTime = Date.now();
    
    try {
      const result = await session.run(cypher, params);
      
      // Track nodes/relationships from result summary
      const summary = result.summary;
      let nodesChanged = 0;
      let relsChanged = 0;
      if (summary.counters) {
        nodesChanged = (summary.counters.updates().nodesCreated || 0) + 
                       (summary.counters.updates().nodesDeleted || 0);
        relsChanged = (summary.counters.updates().relationshipsCreated || 0) + 
                      (summary.counters.updates().relationshipsDeleted || 0);
        this.nodesProcessed += nodesChanged;
        this.relsProcessed += relsChanged;
      }
      
      // Persist usage for every write query
      if (nodesChanged > 0 || relsChanged > 0) {
        await this.trackUsage(Date.now() - startTime, nodesChanged, relsChanged);
      }
      
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Run a read-only query with usage tracking
   */
  async read(cypher: string, params: Record<string, any> = {}, trackNodes: boolean = false): Promise<Result> {
    const session = this.driver.session({ 
      database: this.database,
      defaultAccessMode: neo4j.session.READ,
    });
    this.queriesExecuted++;
    const startTime = Date.now();
    
    try {
      const result = await session.run(cypher, params);
      
      // Track read queries if they return nodes
      if (trackNodes && result.records.length > 0) {
        await this.trackUsage(Date.now() - startTime, result.records.length, 0);
      }
      
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Create tenant-isolated nodes
   */
  async createNode(label: string, properties: Record<string, any>): Promise<any> {
    const result = await this.run(
      `CREATE (n:${label} $props) SET n.tenantId = $tenantId RETURN n`,
      { props: properties, tenantId: this.tenantId }
    );
    this.nodesProcessed++;
    return result.records[0]?.get("n");
  }

  /**
   * Create a relationship between nodes
   */
  async createRelationship(
    fromId: string,
    toId: string,
    type: string,
    properties: Record<string, any> = {}
  ): Promise<any> {
    const result = await this.run(
      `MATCH (a {id: $fromId, tenantId: $tenantId}), (b {id: $toId, tenantId: $tenantId})
       CREATE (a)-[r:${type} $props]->(b)
       RETURN r`,
      { fromId, toId, props: properties, tenantId: this.tenantId }
    );
    this.relsProcessed++;
    return result.records[0]?.get("r");
  }

  /**
   * Find nodes by label (tenant-isolated) - tracked for billing
   */
  async findNodes(label: string, where: Record<string, any> = {}): Promise<any[]> {
    // Check plan limits before executing
    await this.checkLimits();
    
    const whereClause = Object.keys(where).length > 0
      ? `AND ${Object.keys(where).map(k => `n.${k} = $${k}`).join(" AND ")}`
      : "";
    
    const result = await this.read(
      `MATCH (n:${label}) WHERE n.tenantId = $tenantId ${whereClause} RETURN n`,
      { ...where, tenantId: this.tenantId },
      true // Track nodes for billing
    );
    
    return result.records.map(r => r.get("n").properties);
  }

  /**
   * Run PageRank algorithm (GDS) - billable operation
   */
  async runPageRank(nodeLabel: string, relType: string): Promise<any> {
    // Check plan limits before executing
    await this.checkLimits();
    
    this.startTime = Date.now();
    
    // Project the graph
    const graphName = `pagerank_${this.tenantId}_${Date.now()}`;
    
    await this.run(`
      CALL gds.graph.project(
        $graphName,
        {
          ${nodeLabel}: { properties: ['tenantId'] }
        },
        '${relType}'
      )
    `, { graphName });

    // Run PageRank
    const result = await this.run(`
      CALL gds.pageRank.stream($graphName)
      YIELD nodeId, score
      RETURN gds.util.asNode(nodeId).id AS id, score
      ORDER BY score DESC
      LIMIT 100
    `, { graphName });

    // Drop the projection
    await this.run(`CALL gds.graph.drop($graphName)`, { graphName });

    const executionMs = Date.now() - this.startTime;
    
    // Log the job
    await this.logJob("pagerank", executionMs, result.records.length);

    return result.records.map(r => ({
      id: r.get("id"),
      score: r.get("score"),
    }));
  }

  /**
   * Run similarity search - billable operation
   */
  async findSimilar(nodeId: string, limit: number = 10): Promise<any[]> {
    // Check plan limits before executing
    await this.checkLimits();
    
    this.startTime = Date.now();
    
    const result = await this.read(`
      MATCH (n {id: $nodeId, tenantId: $tenantId})-[r]-(similar)
      WHERE similar.tenantId = $tenantId
      WITH similar, count(r) as commonConnections
      ORDER BY commonConnections DESC
      LIMIT $limit
      RETURN similar, commonConnections
    `, { nodeId, tenantId: this.tenantId, limit: neo4j.int(limit) });

    const executionMs = Date.now() - this.startTime;
    await this.logJob("similarity", executionMs, result.records.length);

    return result.records.map(r => ({
      node: r.get("similar").properties,
      score: r.get("commonConnections").toNumber(),
    }));
  }

  /**
   * Get graph statistics for the tenant
   */
  async getStats(): Promise<{ nodes: number; relationships: number; labels: string[] }> {
    const nodesResult = await this.read(
      `MATCH (n) WHERE n.tenantId = $tenantId RETURN count(n) as count`,
      { tenantId: this.tenantId }
    );
    
    const relsResult = await this.read(
      `MATCH (a {tenantId: $tenantId})-[r]->(b {tenantId: $tenantId}) RETURN count(r) as count`,
      { tenantId: this.tenantId }
    );
    
    const labelsResult = await this.read(
      `MATCH (n) WHERE n.tenantId = $tenantId RETURN DISTINCT labels(n) as labels`,
      { tenantId: this.tenantId }
    );

    return {
      nodes: nodesResult.records[0]?.get("count").toNumber() || 0,
      relationships: relsResult.records[0]?.get("count").toNumber() || 0,
      labels: labelsResult.records.flatMap(r => r.get("labels")),
    };
  }

  /**
   * Track usage for billing (called automatically by run/read)
   */
  private async trackUsage(executionMs: number, nodesProcessed: number, relsProcessed: number = 0): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await prisma.graphUsage.upsert({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: this.tenantId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        tenantId: this.tenantId,
        periodStart,
        periodEnd,
        computeSeconds: Math.ceil(executionMs / 1000),
        nodesProcessed,
        relationshipsProcessed: relsProcessed,
        queriesExecuted: 1,
      },
      update: {
        computeSeconds: { increment: Math.ceil(executionMs / 1000) },
        nodesProcessed: { increment: nodesProcessed },
        relationshipsProcessed: { increment: relsProcessed },
        queriesExecuted: { increment: 1 },
      },
    });
  }

  /**
   * Log a graph job for billing
   */
  private async logJob(algorithm: string, executionMs: number, recordsProcessed: number): Promise<void> {
    await prisma.graphJobLog.create({
      data: {
        tenantId: this.tenantId,
        algorithm,
        status: "COMPLETED",
        nodesProcessed: recordsProcessed,
        relsProcessed: 0,
        executionMs,
        startedAt: new Date(Date.now() - executionMs),
        completedAt: new Date(),
      },
    });

    // Update usage for current billing period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await prisma.graphUsage.upsert({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: this.tenantId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        tenantId: this.tenantId,
        periodStart,
        periodEnd,
        computeSeconds: Math.ceil(executionMs / 1000),
        nodesProcessed: recordsProcessed,
        queriesExecuted: 1,
      },
      update: {
        computeSeconds: { increment: Math.ceil(executionMs / 1000) },
        nodesProcessed: { increment: recordsProcessed },
        queriesExecuted: { increment: 1 },
      },
    });
  }

  /**
   * Get usage for current billing period
   */
  async getUsage(): Promise<any> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return prisma.graphUsage.findFirst({
      where: {
        tenantId: this.tenantId,
        periodStart,
        periodEnd,
      },
    });
  }
}

/**
 * Initialize tenant database (create if not exists)
 */
export async function initializeTenantDatabase(tenantId: string): Promise<void> {
  const driver = getSharedDriver();
  const session = driver.session({ database: "system" });
  
  const dbName = `tenant_${tenantId.replace(/-/g, "_")}`;
  
  try {
    // Check if database exists
    const result = await session.run(
      "SHOW DATABASES YIELD name WHERE name = $dbName",
      { dbName }
    );
    
    if (result.records.length === 0) {
      // Create the database
      await session.run(`CREATE DATABASE ${dbName} IF NOT EXISTS`);
      console.log(`Created Neo4j database: ${dbName}`);
    }
    
    // Save config
    await prisma.tenantNeo4jConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        database: dbName,
        password: process.env.NEO4J_PASSWORD || "cloudmigrate2025",
      },
      update: {
        database: dbName,
      },
    });
  } finally {
    await session.close();
  }
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function closeConnections(): Promise<void> {
  if (sharedDriver) {
    await sharedDriver.close();
    sharedDriver = null;
  }
}
