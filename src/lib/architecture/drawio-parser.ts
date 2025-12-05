/**
 * Draw.io HTML Parser
 * 
 * Parses draw.io HTML exports and converts them to React Flow nodes/edges.
 * This allows us to use draw.io as the source of truth for architecture templates.
 */

import { Node, Edge } from "@xyflow/react";

// Draw.io shape to our node type mapping
const DRAWIO_SHAPE_MAP: Record<string, { type: string; icon: string; label: string }> = {
  // AWS Compute
  "mxgraph.aws4.ec2": { type: "ec2", icon: "Server", label: "EC2" },
  "mxgraph.aws4.lambda_function": { type: "lambda", icon: "Zap", label: "Lambda" },
  "mxgraph.aws4.ecs": { type: "ecs", icon: "Container", label: "ECS" },
  "mxgraph.aws4.fargate": { type: "fargate", icon: "Container", label: "Fargate" },
  "mxgraph.aws4.auto_scaling2": { type: "auto-scaling", icon: "Boxes", label: "Auto Scaling" },
  
  // AWS Database
  "mxgraph.aws4.rds": { type: "rds", icon: "Database", label: "RDS" },
  "mxgraph.aws4.aurora": { type: "aurora", icon: "Database", label: "Aurora" },
  "mxgraph.aws4.dynamodb": { type: "dynamodb", icon: "Table", label: "DynamoDB" },
  "mxgraph.aws4.elasticache": { type: "elasticache", icon: "Database", label: "ElastiCache" },
  "mxgraph.aws4.database_migration_service": { type: "dms", icon: "Database", label: "DMS" },
  
  // AWS Storage
  "mxgraph.aws4.s3": { type: "s3", icon: "HardDrive", label: "S3" },
  "mxgraph.aws4.efs": { type: "efs", icon: "HardDrive", label: "EFS" },
  "mxgraph.aws4.glacier": { type: "glacier", icon: "HardDrive", label: "Glacier" },
  
  // AWS Networking
  "mxgraph.aws4.vpc": { type: "vpc", icon: "Network", label: "VPC" },
  "mxgraph.aws4.internet_gateway": { type: "internet-gateway", icon: "Globe", label: "Internet Gateway" },
  "mxgraph.aws4.nat_gateway": { type: "nat-gateway", icon: "ArrowLeftRight", label: "NAT Gateway" },
  "mxgraph.aws4.elastic_load_balancing": { type: "alb", icon: "Split", label: "Load Balancer" },
  "mxgraph.aws4.route_53": { type: "route53", icon: "Globe", label: "Route 53" },
  "mxgraph.aws4.cloudfront": { type: "cloudfront", icon: "Globe", label: "CloudFront" },
  "mxgraph.aws4.api_gateway": { type: "api-gateway", icon: "Webhook", label: "API Gateway" },
  
  // AWS Security
  "mxgraph.aws4.iam": { type: "iam", icon: "Users", label: "IAM" },
  "mxgraph.aws4.cognito": { type: "cognito", icon: "UserCheck", label: "Cognito" },
  "mxgraph.aws4.kms": { type: "kms", icon: "Key", label: "KMS" },
  "mxgraph.aws4.secrets_manager": { type: "secrets-manager", icon: "Lock", label: "Secrets Manager" },
  "mxgraph.aws4.waf": { type: "waf", icon: "Shield", label: "WAF" },
  
  // AWS Analytics & AI
  "mxgraph.aws4.quicksight": { type: "quicksight", icon: "BarChart3", label: "QuickSight" },
  "mxgraph.aws4.athena": { type: "athena", icon: "BarChart3", label: "Athena" },
  "mxgraph.aws4.glue": { type: "glue", icon: "Workflow", label: "Glue" },
  "mxgraph.aws4.kinesis": { type: "kinesis", icon: "Activity", label: "Kinesis" },
  "mxgraph.aws4.bedrock": { type: "bedrock", icon: "Zap", label: "Bedrock" },
  "mxgraph.aws4.sagemaker": { type: "sagemaker", icon: "Zap", label: "SageMaker" },
  "mxgraph.aws4.personalize": { type: "personalize", icon: "Users", label: "Personalize" },
  "mxgraph.aws4.kendra": { type: "kendra", icon: "FileText", label: "Kendra" },
  "mxgraph.aws4.entity_resolution": { type: "entity-resolution", icon: "Users", label: "Entity Resolution" },
  "mxgraph.aws4.opensearch_observability": { type: "opensearch", icon: "BarChart3", label: "OpenSearch" },
  
  // AWS Integration
  "mxgraph.aws4.sns": { type: "sns", icon: "Bell", label: "SNS" },
  "mxgraph.aws4.sqs": { type: "sqs", icon: "ListOrdered", label: "SQS" },
  "mxgraph.aws4.eventbridge": { type: "eventbridge", icon: "Workflow", label: "EventBridge" },
  "mxgraph.aws4.step_functions": { type: "step-functions", icon: "Workflow", label: "Step Functions" },
  
  // AWS Management
  "mxgraph.aws4.cloudwatch": { type: "cloudwatch", icon: "Activity", label: "CloudWatch" },
  "mxgraph.aws4.cloudformation": { type: "cloudformation", icon: "Layers", label: "CloudFormation" },
  
  // Office/Generic shapes
  "mxgraph.office.concepts.documents": { type: "documents", icon: "FileText", label: "Documents" },
};

// AWS color categories
const AWS_COLORS: Record<string, string> = {
  "#ED7100": "compute",      // Orange - Compute
  "#3B48CC": "database",     // Blue - Database  
  "#C925D1": "database",     // Purple/Pink - Database (Aurora, DynamoDB)
  "#7AA116": "storage",      // Green - Storage
  "#8C4FFF": "networking",   // Purple - Networking/Analytics
  "#DD344C": "security",     // Red - Security
  "#01A88D": "ai",           // Teal - AI/ML
  "#E7157B": "integration",  // Pink - Integration
  "#232F3E": "management",   // Dark - Management
};

export interface DrawioNode {
  id: string;
  value: string;
  shape: string;
  fillColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: string;
}

export interface DrawioEdge {
  id: string;
  source: string;
  target: string;
  style: string;
}

export interface ParsedDrawio {
  nodes: DrawioNode[];
  edges: DrawioEdge[];
  title: string;
}

/**
 * Parse a draw.io HTML export string
 */
export function parseDrawioHtml(htmlContent: string): ParsedDrawio {
  // Extract the data-mxgraph attribute
  const dataMatch = htmlContent.match(/data-mxgraph="([^"]+)"/);
  if (!dataMatch) {
    throw new Error("No draw.io data found in HTML");
  }
  
  // Unescape HTML entities
  const unescapeHtml = (str: string) => {
    return str
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'");
  };
  
  const jsonStr = unescapeHtml(dataMatch[1]);
  const jsonData = JSON.parse(jsonStr);
  const xmlContent = unescapeHtml(jsonData.xml || "");
  
  // Extract title
  const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : "Untitled";
  
  const nodes: DrawioNode[] = [];
  const edges: DrawioEdge[] = [];
  
  // Parse mxCell elements
  const cellRegex = /<mxCell[^>]+>/g;
  const geoRegex = /<mxGeometry[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*width="([^"]*)"[^>]*height="([^"]*)"/;
  
  // Find all cells with their following geometry
  const fullCellRegex = /<mxCell[^>]+>(?:\s*<mxGeometry[^/]*\/>)?/g;
  const matches = xmlContent.match(fullCellRegex) || [];
  
  for (const cellBlock of matches) {
    const idMatch = cellBlock.match(/id="([^"]+)"/);
    const valueMatch = cellBlock.match(/value="([^"]*)"/);
    const styleMatch = cellBlock.match(/style="([^"]+)"/);
    const isVertex = cellBlock.includes('vertex="1"');
    const isEdge = cellBlock.includes('edge="1"');
    const sourceMatch = cellBlock.match(/source="([^"]+)"/);
    const targetMatch = cellBlock.match(/target="([^"]+)"/);
    const geoMatch = cellBlock.match(geoRegex);
    
    if (isVertex && idMatch && styleMatch) {
      const style = styleMatch[1];
      const styleDict: Record<string, string> = {};
      
      for (const part of style.split(';')) {
        if (part.includes('=')) {
          const [k, v] = part.split('=');
          styleDict[k] = v;
        }
      }
      
      const shape = styleDict.resIcon || styleDict.shape || "basic";
      const fillColor = styleDict.fillColor || "#666666";
      
      nodes.push({
        id: idMatch[1],
        value: valueMatch ? valueMatch[1] : "",
        shape,
        fillColor,
        x: geoMatch ? parseFloat(geoMatch[1]) : 0,
        y: geoMatch ? parseFloat(geoMatch[2]) : 0,
        width: geoMatch ? parseFloat(geoMatch[3]) : 80,
        height: geoMatch ? parseFloat(geoMatch[4]) : 80,
        style,
      });
    }
    
    if (isEdge && sourceMatch && targetMatch) {
      edges.push({
        id: idMatch ? idMatch[1] : `edge-${edges.length}`,
        source: sourceMatch[1],
        target: targetMatch[1],
        style: styleMatch ? styleMatch[1] : "",
      });
    }
  }
  
  return { nodes, edges, title };
}

/**
 * Convert parsed draw.io data to React Flow nodes
 */
export function convertToReactFlowNodes(parsed: ParsedDrawio): Node[] {
  return parsed.nodes
    .filter(n => n.shape !== "basic" || n.value) // Filter out empty basic shapes
    .map((node) => {
      const mapping = DRAWIO_SHAPE_MAP[node.shape];
      const category = AWS_COLORS[node.fillColor] || "compute";
      
      // Determine node type
      let nodeType = "awsResource";
      if (node.shape.includes("vpc")) nodeType = "vpc";
      else if (node.shape.includes("subnet")) nodeType = "subnet";
      else if (node.shape.includes("availability")) nodeType = "az";
      
      return {
        id: node.id,
        type: nodeType,
        position: { x: node.x, y: node.y },
        data: {
          label: node.value || mapping?.label || node.shape.split('.').pop() || "Resource",
          sublabel: mapping?.type || "",
          type: mapping?.type || node.shape,
          icon: mapping?.icon || "Server",
          color: node.fillColor,
          category,
          drawioShape: node.shape, // Keep original for reference
        },
        style: {
          width: node.width,
          height: node.height,
        },
        zIndex: 10,
      };
    });
}

/**
 * Convert parsed draw.io edges to React Flow edges
 */
export function convertToReactFlowEdges(parsed: ParsedDrawio): Edge[] {
  return parsed.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: true,
    style: { stroke: "#22d3ee", strokeWidth: 2 },
  }));
}

/**
 * Full conversion from draw.io HTML to React Flow format
 */
export function drawioToReactFlow(htmlContent: string): { nodes: Node[]; edges: Edge[]; title: string } {
  const parsed = parseDrawioHtml(htmlContent);
  return {
    nodes: convertToReactFlowNodes(parsed),
    edges: convertToReactFlowEdges(parsed),
    title: parsed.title,
  };
}

/**
 * Get all unique shapes from a draw.io file (useful for building shape libraries)
 */
export function getUniqueShapes(htmlContent: string): string[] {
  const parsed = parseDrawioHtml(htmlContent);
  const shapes = new Set(parsed.nodes.map(n => n.shape));
  return Array.from(shapes).sort();
}

/**
 * Extract shape definitions for creating a node palette
 */
export function extractShapePalette(htmlContent: string): Array<{
  shape: string;
  color: string;
  label: string;
  icon: string;
}> {
  const parsed = parseDrawioHtml(htmlContent);
  const seen = new Set<string>();
  const palette: Array<{ shape: string; color: string; label: string; icon: string }> = [];
  
  for (const node of parsed.nodes) {
    if (seen.has(node.shape)) continue;
    seen.add(node.shape);
    
    const mapping = DRAWIO_SHAPE_MAP[node.shape];
    palette.push({
      shape: node.shape,
      color: node.fillColor,
      label: mapping?.label || node.shape.split('.').pop() || "Unknown",
      icon: mapping?.icon || "Server",
    });
  }
  
  return palette;
}
