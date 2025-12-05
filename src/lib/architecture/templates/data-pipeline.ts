/**
 * Data Pipeline Template
 * 
 * Generated from draw.io export: FinalSAD1.drawio.html
 * This template shows a data migration and AI/ML pipeline architecture.
 */

import { Node, Edge } from "@xyflow/react";
import { ArchitectureTemplate } from "../types";

// AWS Official Colors (from draw.io export)
const awsColors = {
  compute: "#ED7100",      // Orange
  database: "#C925D1",     // Purple/Pink
  storage: "#7AA116",      // Green
  analytics: "#8C4FFF",    // Purple
  ai: "#01A88D",           // Teal
  documents: "#505050",    // Gray
};

export const dataPipelineTemplate: ArchitectureTemplate = {
  id: "data-pipeline-ai",
  name: "Data Pipeline with AI/ML",
  description: "End-to-end data pipeline: Source databases → DMS → S3 Data Lake → Glue ETL → DynamoDB → Bedrock AI → QuickSight Analytics",
  category: "data",
  complexity: "advanced",
  useCases: ["Data Migration", "AI/ML Pipelines", "Analytics Dashboards", "Data Lakes"],
  estimatedCost: { min: 500, max: 2000 },
  deploymentOrder: [
    "source-db-1", "source-db-2", "source-docs-1", "source-docs-2",
    "dms-1", "s3-datalake",
    "glue-etl", "dynamodb-1",
    "lambda-1", "entity-resolution",
    "bedrock-1", "bedrock-2", "kendra-1",
    "opensearch-1", "personalize-1",
    "quicksight-1"
  ],
  // Layout constants - strict grid spacing
  // Columns (X): 100, 300, 500, 700, 900, 1100
  // Rows (Y): 50, 200, 350, 500, 650
  nodes: [
    // ========== COLUMN 1: SOURCE LAYER (x: 100) ==========
    // Source Database 1 (Aurora - Ohmzio)
    {
      id: "source-db-1",
      type: "awsResource",
      position: { x: 100, y: 50 },
      data: {
        serviceId: "aurora",
        label: "Ohmzio",
        sublabel: "Database",
        type: "aurora",
        icon: "/aws-icons/aurora.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },
    // Source Database 2 (Aurora - Ampworks)
    {
      id: "source-db-2",
      type: "awsResource",
      position: { x: 100, y: 200 },
      data: {
        serviceId: "aurora",
        label: "Ampworks",
        sublabel: "Database",
        type: "aurora",
        icon: "/aws-icons/aurora.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },
    // Source Documents 1
    {
      id: "source-docs-1",
      type: "awsResource",
      position: { x: 100, y: 350 },
      data: {
        serviceId: "s3",
        label: "Documents",
        sublabel: "Source 1",
        type: "documents",
        icon: "/aws-icons/s3.svg",
        color: awsColors.documents,
      },
      zIndex: 10,
    },
    // Source Documents 2
    {
      id: "source-docs-2",
      type: "awsResource",
      position: { x: 100, y: 500 },
      data: {
        serviceId: "s3",
        label: "Documents",
        sublabel: "Source 2",
        type: "documents",
        icon: "/aws-icons/s3.svg",
        color: awsColors.documents,
      },
      zIndex: 10,
    },

    // ========== COLUMN 2: MIGRATION LAYER (x: 300) ==========
    // DMS - Database Migration Service
    {
      id: "dms-1",
      type: "awsResource",
      position: { x: 300, y: 125 },
      data: {
        serviceId: "dms",
        label: "DMS",
        sublabel: "Migration",
        type: "dms",
        icon: "/aws-icons/dms.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },

    // ========== COLUMN 3: STORAGE & ETL (x: 500) ==========
    // S3 Data Lake
    {
      id: "s3-datalake",
      type: "awsResource",
      position: { x: 500, y: 50 },
      data: {
        serviceId: "s3",
        label: "S3",
        sublabel: "Data Lake",
        type: "s3",
        icon: "/aws-icons/s3.svg",
        color: awsColors.storage,
      },
      zIndex: 10,
    },
    // Glue ETL
    {
      id: "glue-etl",
      type: "awsResource",
      position: { x: 500, y: 200 },
      data: {
        serviceId: "glue",
        label: "AWS Glue",
        sublabel: "ETL",
        type: "glue",
        icon: "/aws-icons/glue.svg",
        color: awsColors.analytics,
      },
      zIndex: 10,
    },
    // DynamoDB
    {
      id: "dynamodb-1",
      type: "awsResource",
      position: { x: 500, y: 350 },
      data: {
        serviceId: "dynamodb",
        label: "DynamoDB",
        sublabel: "NoSQL",
        type: "dynamodb",
        icon: "/aws-icons/dynamodb.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },
    // Personalize
    {
      id: "personalize-1",
      type: "awsResource",
      position: { x: 500, y: 500 },
      data: {
        serviceId: "personalize",
        label: "Personalize",
        sublabel: "Recommendations",
        type: "personalize",
        icon: "/aws-icons/personalize.svg",
        color: awsColors.ai,
      },
      zIndex: 10,
    },

    // ========== COLUMN 4: COMPUTE & RESOLUTION (x: 700) ==========
    // Entity Resolution
    {
      id: "entity-resolution",
      type: "awsResource",
      position: { x: 700, y: 200 },
      data: {
        serviceId: "personalize",
        label: "Entity",
        sublabel: "Resolution",
        type: "entity-resolution",
        icon: "/aws-icons/personalize.svg",
        color: awsColors.analytics,
      },
      zIndex: 10,
    },
    // Lambda
    {
      id: "lambda-1",
      type: "awsResource",
      position: { x: 700, y: 350 },
      data: {
        serviceId: "lambda",
        label: "Lambda",
        sublabel: "Functions",
        type: "lambda",
        icon: "/aws-icons/lambda.svg",
        color: awsColors.compute,
      },
      zIndex: 10,
    },
    // Kendra
    {
      id: "kendra-1",
      type: "awsResource",
      position: { x: 700, y: 500 },
      data: {
        serviceId: "kendra",
        label: "Kendra",
        sublabel: "Search",
        type: "kendra",
        icon: "/aws-icons/kendra.svg",
        color: awsColors.ai,
      },
      zIndex: 10,
    },

    // ========== COLUMN 5: AI/ML LAYER (x: 900) ==========
    // Bedrock 1
    {
      id: "bedrock-1",
      type: "awsResource",
      position: { x: 900, y: 50 },
      data: {
        serviceId: "bedrock",
        label: "Bedrock",
        sublabel: "Foundation Models",
        type: "bedrock",
        icon: "/aws-icons/bedrock.svg",
        color: awsColors.ai,
      },
      zIndex: 10,
    },
    // Bedrock 2
    {
      id: "bedrock-2",
      type: "awsResource",
      position: { x: 900, y: 200 },
      data: {
        serviceId: "bedrock",
        label: "Bedrock",
        sublabel: "RAG",
        type: "bedrock",
        icon: "/aws-icons/bedrock.svg",
        color: awsColors.ai,
      },
      zIndex: 10,
    },

    // ========== COLUMN 6: ANALYTICS OUTPUT (x: 1100) ==========
    // QuickSight
    {
      id: "quicksight-1",
      type: "awsResource",
      position: { x: 1100, y: 50 },
      data: {
        serviceId: "quicksight",
        label: "QuickSight",
        sublabel: "BI Dashboard",
        type: "quicksight",
        icon: "/aws-icons/quicksight.svg",
        color: awsColors.analytics,
      },
      zIndex: 10,
    },
    // OpenSearch
    {
      id: "opensearch-1",
      type: "awsResource",
      position: { x: 1100, y: 200 },
      data: {
        serviceId: "opensearch",
        label: "OpenSearch",
        sublabel: "Analytics",
        type: "opensearch",
        icon: "/aws-icons/opensearch.svg",
        color: awsColors.analytics,
      },
      zIndex: 10,
    },
  ],
  edges: [
    // Source to DMS
    { id: "e-db1-dms", source: "source-db-1", target: "dms-1", type: "smoothstep", animated: true, style: { stroke: "#C925D1", strokeWidth: 2 } },
    { id: "e-db2-dms", source: "source-db-2", target: "dms-1", type: "smoothstep", animated: true, style: { stroke: "#C925D1", strokeWidth: 2 } },
    
    // DMS to S3
    { id: "e-dms-s3", source: "dms-1", target: "s3-datalake", type: "smoothstep", animated: true, style: { stroke: "#7AA116", strokeWidth: 2 } },
    
    // Documents to Glue
    { id: "e-docs1-glue", source: "source-docs-1", target: "glue-etl", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    { id: "e-docs2-glue", source: "source-docs-2", target: "glue-etl", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // S3 to Glue
    { id: "e-s3-glue", source: "s3-datalake", target: "glue-etl", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // Glue to DynamoDB
    { id: "e-glue-dynamo", source: "glue-etl", target: "dynamodb-1", type: "smoothstep", animated: true, style: { stroke: "#C925D1", strokeWidth: 2 } },
    
    // Glue to Entity Resolution
    { id: "e-glue-entity", source: "glue-etl", target: "entity-resolution", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // DynamoDB to Lambda
    { id: "e-dynamo-lambda", source: "dynamodb-1", target: "lambda-1", type: "smoothstep", animated: true, style: { stroke: "#ED7100", strokeWidth: 2 } },
    
    // S3 to Bedrock
    { id: "e-s3-bedrock", source: "s3-datalake", target: "bedrock-1", type: "smoothstep", animated: true, style: { stroke: "#01A88D", strokeWidth: 2 } },
    
    // Entity Resolution to Bedrock
    { id: "e-entity-bedrock", source: "entity-resolution", target: "bedrock-2", type: "smoothstep", animated: true, style: { stroke: "#01A88D", strokeWidth: 2 } },
    
    // Lambda to Kendra
    { id: "e-lambda-kendra", source: "lambda-1", target: "kendra-1", type: "smoothstep", animated: true, style: { stroke: "#01A88D", strokeWidth: 2 } },
    
    // Lambda to Personalize
    { id: "e-lambda-personalize", source: "lambda-1", target: "personalize-1", type: "smoothstep", animated: true, style: { stroke: "#01A88D", strokeWidth: 2 } },
    
    // Bedrock to OpenSearch
    { id: "e-bedrock-opensearch", source: "bedrock-2", target: "opensearch-1", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // Bedrock to QuickSight
    { id: "e-bedrock-quicksight", source: "bedrock-1", target: "quicksight-1", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // Kendra to Bedrock
    { id: "e-kendra-bedrock", source: "kendra-1", target: "bedrock-2", type: "smoothstep", animated: true, style: { stroke: "#01A88D", strokeWidth: 2 } },
  ],
};
