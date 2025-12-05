/**
 * Three-Tier Web Application Template
 * 
 * Clean layout with official AWS icons - no container boxes.
 * Internet → CloudFront → ALB → EC2 → RDS
 */

import { Node, Edge } from "@xyflow/react";
import { ArchitectureTemplate } from "../types";

// AWS Official Colors
const awsColors = {
  compute: "#ED7100",
  database: "#3B48CC",
  storage: "#3F8624",
  networking: "#8C4FFF",
  security: "#DD344C",
  cdn: "#8C4FFF",
};

export const threeTierWebTemplate: ArchitectureTemplate = {
  id: "three-tier-web",
  name: "Three-Tier Web Application",
  description: "Production-ready 3-tier architecture: CloudFront CDN → Application Load Balancer → EC2 Auto Scaling → RDS Multi-AZ with ElastiCache",
  category: "web",
  complexity: "intermediate",
  useCases: ["Web applications", "E-commerce", "SaaS products"],
  estimatedCost: { min: 200, max: 800 },
  deploymentOrder: [
    "route53-1", "cloudfront-1", "waf-1",
    "alb-1", "alb-2",
    "ec2-1", "ec2-2", "ec2-3",
    "elasticache-1",
    "rds-1", "rds-2",
    "s3-1"
  ],
  // Layout constants - consistent spacing
  // Row Y positions: 50, 200, 350, 500, 650
  // Column X positions: 100, 300, 500, 700, 900
  nodes: [
    // ========== ROW 1: EDGE LAYER (y: 50) ==========
    // Route 53 - centered
    {
      id: "route53-1",
      type: "awsResource",
      position: { x: 500, y: 50 },
      data: {
        serviceId: "route53",
        label: "Route 53",
        sublabel: "DNS",
        type: "route53",
        icon: "/aws-icons/route53.svg",
        color: awsColors.networking,
      },
      zIndex: 10,
    },
    // S3 Static Assets - right side
    {
      id: "s3-1",
      type: "awsResource",
      position: { x: 900, y: 50 },
      data: {
        serviceId: "s3",
        label: "S3",
        sublabel: "Static Assets",
        type: "s3",
        icon: "/aws-icons/s3.svg",
        color: awsColors.storage,
      },
      zIndex: 10,
    },

    // ========== ROW 2: CDN LAYER (y: 200) ==========
    // CloudFront - centered
    {
      id: "cloudfront-1",
      type: "awsResource",
      position: { x: 500, y: 200 },
      data: {
        serviceId: "cloudfront",
        label: "CloudFront",
        sublabel: "CDN",
        type: "cloudfront",
        icon: "/aws-icons/cloudfront.svg",
        color: awsColors.cdn,
      },
      zIndex: 10,
    },
    // WAF - right of CloudFront
    {
      id: "waf-1",
      type: "awsResource",
      position: { x: 700, y: 200 },
      data: {
        serviceId: "waf",
        label: "WAF",
        sublabel: "Firewall",
        type: "waf",
        icon: "/aws-icons/waf.svg",
        color: awsColors.security,
      },
      zIndex: 10,
    },

    // ========== ROW 3: LOAD BALANCER LAYER (y: 350) ==========
    // ALB 1 - left
    {
      id: "alb-1",
      type: "awsResource",
      position: { x: 350, y: 350 },
      data: {
        serviceId: "elb",
        label: "ALB",
        sublabel: "AZ-A",
        type: "alb",
        icon: "/aws-icons/elb.svg",
        color: awsColors.networking,
      },
      zIndex: 10,
    },
    // ALB 2 - right
    {
      id: "alb-2",
      type: "awsResource",
      position: { x: 650, y: 350 },
      data: {
        serviceId: "elb",
        label: "ALB",
        sublabel: "AZ-B",
        type: "alb",
        icon: "/aws-icons/elb.svg",
        color: awsColors.networking,
      },
      zIndex: 10,
    },

    // ========== ROW 4: APPLICATION LAYER (y: 500) ==========
    // EC2 Instance 1
    {
      id: "ec2-1",
      type: "awsResource",
      position: { x: 200, y: 500 },
      data: {
        serviceId: "ec2",
        label: "EC2",
        sublabel: "App Server 1",
        type: "ec2",
        icon: "/aws-icons/ec2.svg",
        color: awsColors.compute,
      },
      zIndex: 10,
    },
    // EC2 Instance 2
    {
      id: "ec2-2",
      type: "awsResource",
      position: { x: 500, y: 500 },
      data: {
        serviceId: "ec2",
        label: "EC2",
        sublabel: "App Server 2",
        type: "ec2",
        icon: "/aws-icons/ec2.svg",
        color: awsColors.compute,
      },
      zIndex: 10,
    },
    // EC2 Instance 3
    {
      id: "ec2-3",
      type: "awsResource",
      position: { x: 800, y: 500 },
      data: {
        serviceId: "ec2",
        label: "EC2",
        sublabel: "App Server 3",
        type: "ec2",
        icon: "/aws-icons/ec2.svg",
        color: awsColors.compute,
      },
      zIndex: 10,
    },

    // ========== ROW 5: DATA LAYER (y: 650) ==========
    // RDS Primary
    {
      id: "rds-1",
      type: "awsResource",
      position: { x: 300, y: 650 },
      data: {
        serviceId: "rds",
        label: "RDS",
        sublabel: "Primary",
        type: "rds",
        icon: "/aws-icons/rds.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },
    // RDS Standby
    {
      id: "rds-2",
      type: "awsResource",
      position: { x: 500, y: 650 },
      data: {
        serviceId: "rds",
        label: "RDS",
        sublabel: "Standby",
        type: "rds",
        icon: "/aws-icons/rds.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },
    // ElastiCache
    {
      id: "elasticache-1",
      type: "awsResource",
      position: { x: 700, y: 650 },
      data: {
        serviceId: "elasticache",
        label: "ElastiCache",
        sublabel: "Redis",
        type: "elasticache",
        icon: "/aws-icons/elasticache.svg",
        color: awsColors.database,
      },
      zIndex: 10,
    },
  ],
  edges: [
    // Route53 → CloudFront
    { id: "e-r53-cf", source: "route53-1", target: "cloudfront-1", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // CloudFront → S3 (static)
    { id: "e-cf-s3", source: "cloudfront-1", target: "s3-1", type: "smoothstep", animated: true, style: { stroke: "#3F8624", strokeWidth: 2 } },
    
    // WAF → CloudFront (protection)
    { id: "e-waf-cf", source: "waf-1", target: "cloudfront-1", type: "smoothstep", animated: false, style: { stroke: "#DD344C", strokeWidth: 2, strokeDasharray: "5,5" } },
    
    // CloudFront → ALBs
    { id: "e-cf-alb1", source: "cloudfront-1", target: "alb-1", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    { id: "e-cf-alb2", source: "cloudfront-1", target: "alb-2", type: "smoothstep", animated: true, style: { stroke: "#8C4FFF", strokeWidth: 2 } },
    
    // ALB1 → EC2s
    { id: "e-alb1-ec2-1", source: "alb-1", target: "ec2-1", type: "smoothstep", animated: true, style: { stroke: "#ED7100", strokeWidth: 2 } },
    { id: "e-alb1-ec2-2", source: "alb-1", target: "ec2-2", type: "smoothstep", animated: true, style: { stroke: "#ED7100", strokeWidth: 2 } },
    
    // ALB2 → EC2s
    { id: "e-alb2-ec2-2", source: "alb-2", target: "ec2-2", type: "smoothstep", animated: true, style: { stroke: "#ED7100", strokeWidth: 2 } },
    { id: "e-alb2-ec2-3", source: "alb-2", target: "ec2-3", type: "smoothstep", animated: true, style: { stroke: "#ED7100", strokeWidth: 2 } },
    
    // EC2s → RDS Primary
    { id: "e-ec2-1-rds", source: "ec2-1", target: "rds-1", type: "smoothstep", animated: true, style: { stroke: "#3B48CC", strokeWidth: 2 } },
    { id: "e-ec2-2-rds", source: "ec2-2", target: "rds-1", type: "smoothstep", animated: true, style: { stroke: "#3B48CC", strokeWidth: 2 } },
    { id: "e-ec2-3-rds", source: "ec2-3", target: "rds-1", type: "smoothstep", animated: true, style: { stroke: "#3B48CC", strokeWidth: 2 } },
    
    // RDS Primary → Standby (replication)
    { id: "e-rds-repl", source: "rds-1", target: "rds-2", type: "smoothstep", animated: false, style: { stroke: "#3B48CC", strokeWidth: 2, strokeDasharray: "5,5" } },
    
    // EC2s → ElastiCache
    { id: "e-ec2-1-cache", source: "ec2-1", target: "elasticache-1", type: "smoothstep", animated: true, style: { stroke: "#3B48CC", strokeWidth: 2 } },
    { id: "e-ec2-2-cache", source: "ec2-2", target: "elasticache-1", type: "smoothstep", animated: true, style: { stroke: "#3B48CC", strokeWidth: 2 } },
    { id: "e-ec2-3-cache", source: "ec2-3", target: "elasticache-1", type: "smoothstep", animated: true, style: { stroke: "#3B48CC", strokeWidth: 2 } },
  ],
};
