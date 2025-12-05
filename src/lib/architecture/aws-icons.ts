/**
 * AWS Icon Registry
 * 
 * Maps AWS service types to their official icons and metadata.
 * Icons are stored in /public/aws-icons/ as SVGs from the official AWS Architecture Icons pack.
 */

export interface AWSService {
  id: string;
  name: string;
  shortName: string;
  category: AWSCategory;
  icon: string; // Path to SVG in /public/aws-icons/
  color: string; // AWS official category color
  description: string;
}

export type AWSCategory = 
  | "compute"
  | "containers"
  | "database"
  | "storage"
  | "networking"
  | "security"
  | "analytics"
  | "ai-ml"
  | "integration"
  | "management"
  | "migration";

// AWS Official Category Colors
export const AWS_CATEGORY_COLORS: Record<AWSCategory, string> = {
  compute: "#ED7100",
  containers: "#ED7100",
  database: "#3B48CC",
  storage: "#3F8624",
  networking: "#8C4FFF",
  security: "#DD344C",
  analytics: "#8C4FFF",
  "ai-ml": "#01A88D",
  integration: "#E7157B",
  management: "#E7157B",
  migration: "#3F8624",
};

// Category metadata for the sidebar
export const AWS_CATEGORIES: Array<{ id: AWSCategory; name: string; color: string }> = [
  { id: "compute", name: "Compute", color: "#ED7100" },
  { id: "containers", name: "Containers", color: "#ED7100" },
  { id: "database", name: "Database", color: "#3B48CC" },
  { id: "storage", name: "Storage", color: "#3F8624" },
  { id: "networking", name: "Networking", color: "#8C4FFF" },
  { id: "security", name: "Security", color: "#DD344C" },
  { id: "analytics", name: "Analytics", color: "#8C4FFF" },
  { id: "ai-ml", name: "AI / ML", color: "#01A88D" },
  { id: "integration", name: "Integration", color: "#E7157B" },
  { id: "management", name: "Management", color: "#E7157B" },
  { id: "migration", name: "Migration", color: "#3F8624" },
];

// Top 50+ AWS Services
export const AWS_SERVICES: AWSService[] = [
  // ============ COMPUTE ============
  {
    id: "ec2",
    name: "Amazon EC2",
    shortName: "EC2",
    category: "compute",
    icon: "/aws-icons/ec2.svg",
    color: "#ED7100",
    description: "Virtual servers in the cloud",
  },
  {
    id: "lambda",
    name: "AWS Lambda",
    shortName: "Lambda",
    category: "compute",
    icon: "/aws-icons/lambda.svg",
    color: "#ED7100",
    description: "Serverless compute service",
  },
  {
    id: "elastic-beanstalk",
    name: "AWS Elastic Beanstalk",
    shortName: "Beanstalk",
    category: "compute",
    icon: "/aws-icons/elastic-beanstalk.svg",
    color: "#ED7100",
    description: "Deploy and scale web apps",
  },
  {
    id: "batch",
    name: "AWS Batch",
    shortName: "Batch",
    category: "compute",
    icon: "/aws-icons/batch.svg",
    color: "#ED7100",
    description: "Batch processing at scale",
  },
  {
    id: "app-runner",
    name: "AWS App Runner",
    shortName: "App Runner",
    category: "compute",
    icon: "/aws-icons/app-runner.svg",
    color: "#ED7100",
    description: "Container web app deployment",
  },

  // ============ CONTAINERS ============
  {
    id: "ecs",
    name: "Amazon ECS",
    shortName: "ECS",
    category: "containers",
    icon: "/aws-icons/ecs.svg",
    color: "#ED7100",
    description: "Container orchestration service",
  },
  {
    id: "eks",
    name: "Amazon EKS",
    shortName: "EKS",
    category: "containers",
    icon: "/aws-icons/eks.svg",
    color: "#ED7100",
    description: "Managed Kubernetes service",
  },
  {
    id: "fargate",
    name: "AWS Fargate",
    shortName: "Fargate",
    category: "containers",
    icon: "/aws-icons/fargate.svg",
    color: "#ED7100",
    description: "Serverless containers",
  },
  {
    id: "ecr",
    name: "Amazon ECR",
    shortName: "ECR",
    category: "containers",
    icon: "/aws-icons/ecr.svg",
    color: "#ED7100",
    description: "Container registry",
  },

  // ============ DATABASE ============
  {
    id: "rds",
    name: "Amazon RDS",
    shortName: "RDS",
    category: "database",
    icon: "/aws-icons/rds.svg",
    color: "#3B48CC",
    description: "Managed relational database",
  },
  {
    id: "aurora",
    name: "Amazon Aurora",
    shortName: "Aurora",
    category: "database",
    icon: "/aws-icons/aurora.svg",
    color: "#3B48CC",
    description: "High-performance managed database",
  },
  {
    id: "dynamodb",
    name: "Amazon DynamoDB",
    shortName: "DynamoDB",
    category: "database",
    icon: "/aws-icons/dynamodb.svg",
    color: "#3B48CC",
    description: "Managed NoSQL database",
  },
  {
    id: "elasticache",
    name: "Amazon ElastiCache",
    shortName: "ElastiCache",
    category: "database",
    icon: "/aws-icons/elasticache.svg",
    color: "#3B48CC",
    description: "In-memory caching",
  },
  {
    id: "documentdb",
    name: "Amazon DocumentDB",
    shortName: "DocumentDB",
    category: "database",
    icon: "/aws-icons/documentdb.svg",
    color: "#3B48CC",
    description: "MongoDB-compatible database",
  },
  {
    id: "neptune",
    name: "Amazon Neptune",
    shortName: "Neptune",
    category: "database",
    icon: "/aws-icons/neptune.svg",
    color: "#3B48CC",
    description: "Graph database service",
  },
  {
    id: "redshift",
    name: "Amazon Redshift",
    shortName: "Redshift",
    category: "database",
    icon: "/aws-icons/redshift.svg",
    color: "#3B48CC",
    description: "Data warehouse",
  },

  // ============ STORAGE ============
  {
    id: "s3",
    name: "Amazon S3",
    shortName: "S3",
    category: "storage",
    icon: "/aws-icons/s3.svg",
    color: "#3F8624",
    description: "Object storage",
  },
  {
    id: "ebs",
    name: "Amazon EBS",
    shortName: "EBS",
    category: "storage",
    icon: "/aws-icons/ebs.svg",
    color: "#3F8624",
    description: "Block storage for EC2",
  },
  {
    id: "efs",
    name: "Amazon EFS",
    shortName: "EFS",
    category: "storage",
    icon: "/aws-icons/efs.svg",
    color: "#3F8624",
    description: "Elastic file system",
  },
  {
    id: "fsx",
    name: "Amazon FSx",
    shortName: "FSx",
    category: "storage",
    icon: "/aws-icons/fsx.svg",
    color: "#3F8624",
    description: "Managed file storage",
  },
  {
    id: "glacier",
    name: "Amazon S3 Glacier",
    shortName: "Glacier",
    category: "storage",
    icon: "/aws-icons/glacier.svg",
    color: "#3F8624",
    description: "Archive storage",
  },

  // ============ NETWORKING ============
  {
    id: "vpc",
    name: "Amazon VPC",
    shortName: "VPC",
    category: "networking",
    icon: "/aws-icons/vpc.svg",
    color: "#8C4FFF",
    description: "Virtual private cloud",
  },
  {
    id: "cloudfront",
    name: "Amazon CloudFront",
    shortName: "CloudFront",
    category: "networking",
    icon: "/aws-icons/cloudfront.svg",
    color: "#8C4FFF",
    description: "Content delivery network",
  },
  {
    id: "route53",
    name: "Amazon Route 53",
    shortName: "Route 53",
    category: "networking",
    icon: "/aws-icons/route53.svg",
    color: "#8C4FFF",
    description: "DNS web service",
  },
  {
    id: "api-gateway",
    name: "Amazon API Gateway",
    shortName: "API Gateway",
    category: "networking",
    icon: "/aws-icons/api-gateway.svg",
    color: "#8C4FFF",
    description: "API management",
  },
  {
    id: "elb",
    name: "Elastic Load Balancing",
    shortName: "ELB",
    category: "networking",
    icon: "/aws-icons/elb.svg",
    color: "#8C4FFF",
    description: "Load balancer",
  },
  {
    id: "direct-connect",
    name: "AWS Direct Connect",
    shortName: "Direct Connect",
    category: "networking",
    icon: "/aws-icons/direct-connect.svg",
    color: "#8C4FFF",
    description: "Dedicated network connection",
  },

  // ============ SECURITY ============
  {
    id: "iam",
    name: "AWS IAM",
    shortName: "IAM",
    category: "security",
    icon: "/aws-icons/iam.svg",
    color: "#DD344C",
    description: "Identity and access management",
  },
  {
    id: "cognito",
    name: "Amazon Cognito",
    shortName: "Cognito",
    category: "security",
    icon: "/aws-icons/cognito.svg",
    color: "#DD344C",
    description: "User identity and access",
  },
  {
    id: "kms",
    name: "AWS KMS",
    shortName: "KMS",
    category: "security",
    icon: "/aws-icons/kms.svg",
    color: "#DD344C",
    description: "Key management service",
  },
  {
    id: "secrets-manager",
    name: "AWS Secrets Manager",
    shortName: "Secrets Manager",
    category: "security",
    icon: "/aws-icons/secrets-manager.svg",
    color: "#DD344C",
    description: "Secrets management",
  },
  {
    id: "waf",
    name: "AWS WAF",
    shortName: "WAF",
    category: "security",
    icon: "/aws-icons/waf.svg",
    color: "#DD344C",
    description: "Web application firewall",
  },
  {
    id: "shield",
    name: "AWS Shield",
    shortName: "Shield",
    category: "security",
    icon: "/aws-icons/shield.svg",
    color: "#DD344C",
    description: "DDoS protection",
  },
  {
    id: "guardduty",
    name: "Amazon GuardDuty",
    shortName: "GuardDuty",
    category: "security",
    icon: "/aws-icons/guardduty.svg",
    color: "#DD344C",
    description: "Threat detection",
  },
  {
    id: "acm",
    name: "AWS Certificate Manager",
    shortName: "ACM",
    category: "security",
    icon: "/aws-icons/acm.svg",
    color: "#DD344C",
    description: "SSL/TLS certificates",
  },

  // ============ ANALYTICS ============
  {
    id: "athena",
    name: "Amazon Athena",
    shortName: "Athena",
    category: "analytics",
    icon: "/aws-icons/athena.svg",
    color: "#8C4FFF",
    description: "Query data in S3",
  },
  {
    id: "kinesis",
    name: "Amazon Kinesis",
    shortName: "Kinesis",
    category: "analytics",
    icon: "/aws-icons/kinesis.svg",
    color: "#8C4FFF",
    description: "Real-time data streaming",
  },
  {
    id: "glue",
    name: "AWS Glue",
    shortName: "Glue",
    category: "analytics",
    icon: "/aws-icons/glue.svg",
    color: "#8C4FFF",
    description: "ETL service",
  },
  {
    id: "quicksight",
    name: "Amazon QuickSight",
    shortName: "QuickSight",
    category: "analytics",
    icon: "/aws-icons/quicksight.svg",
    color: "#8C4FFF",
    description: "Business intelligence",
  },
  {
    id: "opensearch",
    name: "Amazon OpenSearch",
    shortName: "OpenSearch",
    category: "analytics",
    icon: "/aws-icons/opensearch.svg",
    color: "#8C4FFF",
    description: "Search and analytics",
  },
  {
    id: "emr",
    name: "Amazon EMR",
    shortName: "EMR",
    category: "analytics",
    icon: "/aws-icons/emr.svg",
    color: "#8C4FFF",
    description: "Big data processing",
  },

  // ============ AI / ML ============
  {
    id: "sagemaker",
    name: "Amazon SageMaker",
    shortName: "SageMaker",
    category: "ai-ml",
    icon: "/aws-icons/sagemaker.svg",
    color: "#01A88D",
    description: "Machine learning platform",
  },
  {
    id: "bedrock",
    name: "Amazon Bedrock",
    shortName: "Bedrock",
    category: "ai-ml",
    icon: "/aws-icons/bedrock.svg",
    color: "#01A88D",
    description: "Foundation models",
  },
  {
    id: "rekognition",
    name: "Amazon Rekognition",
    shortName: "Rekognition",
    category: "ai-ml",
    icon: "/aws-icons/rekognition.svg",
    color: "#01A88D",
    description: "Image and video analysis",
  },
  {
    id: "comprehend",
    name: "Amazon Comprehend",
    shortName: "Comprehend",
    category: "ai-ml",
    icon: "/aws-icons/comprehend.svg",
    color: "#01A88D",
    description: "Natural language processing",
  },
  {
    id: "lex",
    name: "Amazon Lex",
    shortName: "Lex",
    category: "ai-ml",
    icon: "/aws-icons/lex.svg",
    color: "#01A88D",
    description: "Conversational AI",
  },
  {
    id: "polly",
    name: "Amazon Polly",
    shortName: "Polly",
    category: "ai-ml",
    icon: "/aws-icons/polly.svg",
    color: "#01A88D",
    description: "Text to speech",
  },
  {
    id: "transcribe",
    name: "Amazon Transcribe",
    shortName: "Transcribe",
    category: "ai-ml",
    icon: "/aws-icons/transcribe.svg",
    color: "#01A88D",
    description: "Speech to text",
  },
  {
    id: "translate",
    name: "Amazon Translate",
    shortName: "Translate",
    category: "ai-ml",
    icon: "/aws-icons/translate.svg",
    color: "#01A88D",
    description: "Language translation",
  },
  {
    id: "kendra",
    name: "Amazon Kendra",
    shortName: "Kendra",
    category: "ai-ml",
    icon: "/aws-icons/kendra.svg",
    color: "#01A88D",
    description: "Enterprise search",
  },
  {
    id: "personalize",
    name: "Amazon Personalize",
    shortName: "Personalize",
    category: "ai-ml",
    icon: "/aws-icons/personalize.svg",
    color: "#01A88D",
    description: "Personalization and recommendations",
  },

  // ============ INTEGRATION ============
  {
    id: "sqs",
    name: "Amazon SQS",
    shortName: "SQS",
    category: "integration",
    icon: "/aws-icons/sqs.svg",
    color: "#E7157B",
    description: "Message queuing",
  },
  {
    id: "sns",
    name: "Amazon SNS",
    shortName: "SNS",
    category: "integration",
    icon: "/aws-icons/sns.svg",
    color: "#E7157B",
    description: "Pub/sub messaging",
  },
  {
    id: "eventbridge",
    name: "Amazon EventBridge",
    shortName: "EventBridge",
    category: "integration",
    icon: "/aws-icons/eventbridge.svg",
    color: "#E7157B",
    description: "Event bus",
  },
  {
    id: "step-functions",
    name: "AWS Step Functions",
    shortName: "Step Functions",
    category: "integration",
    icon: "/aws-icons/step-functions.svg",
    color: "#E7157B",
    description: "Workflow orchestration",
  },
  {
    id: "appsync",
    name: "AWS AppSync",
    shortName: "AppSync",
    category: "integration",
    icon: "/aws-icons/appsync.svg",
    color: "#E7157B",
    description: "GraphQL APIs",
  },

  // ============ MANAGEMENT ============
  {
    id: "cloudwatch",
    name: "Amazon CloudWatch",
    shortName: "CloudWatch",
    category: "management",
    icon: "/aws-icons/cloudwatch.svg",
    color: "#E7157B",
    description: "Monitoring and observability",
  },
  {
    id: "cloudformation",
    name: "AWS CloudFormation",
    shortName: "CloudFormation",
    category: "management",
    icon: "/aws-icons/cloudformation.svg",
    color: "#E7157B",
    description: "Infrastructure as code",
  },
  {
    id: "cloudtrail",
    name: "AWS CloudTrail",
    shortName: "CloudTrail",
    category: "management",
    icon: "/aws-icons/cloudtrail.svg",
    color: "#E7157B",
    description: "API activity logging",
  },
  {
    id: "systems-manager",
    name: "AWS Systems Manager",
    shortName: "Systems Manager",
    category: "management",
    icon: "/aws-icons/systems-manager.svg",
    color: "#E7157B",
    description: "Operations management",
  },

  // ============ MIGRATION ============
  {
    id: "dms",
    name: "AWS DMS",
    shortName: "DMS",
    category: "migration",
    icon: "/aws-icons/dms.svg",
    color: "#3F8624",
    description: "Database migration service",
  },
];

// Helper functions
export function getServiceById(id: string): AWSService | undefined {
  return AWS_SERVICES.find((s) => s.id === id);
}

export function getServicesByCategory(category: AWSCategory): AWSService[] {
  return AWS_SERVICES.filter((s) => s.category === category);
}

export function searchServices(query: string): AWSService[] {
  const q = query.toLowerCase();
  return AWS_SERVICES.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.shortName.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      s.description.toLowerCase().includes(q)
  );
}

// Map draw.io shape names to our service IDs
export const DRAWIO_TO_SERVICE_MAP: Record<string, string> = {
  "mxgraph.aws4.ec2": "ec2",
  "mxgraph.aws4.lambda_function": "lambda",
  "mxgraph.aws4.elastic_beanstalk": "elastic-beanstalk",
  "mxgraph.aws4.batch": "batch",
  "mxgraph.aws4.ecs": "ecs",
  "mxgraph.aws4.eks": "eks",
  "mxgraph.aws4.fargate": "fargate",
  "mxgraph.aws4.ecr": "ecr",
  "mxgraph.aws4.rds": "rds",
  "mxgraph.aws4.aurora": "aurora",
  "mxgraph.aws4.dynamodb": "dynamodb",
  "mxgraph.aws4.elasticache": "elasticache",
  "mxgraph.aws4.documentdb": "documentdb",
  "mxgraph.aws4.neptune": "neptune",
  "mxgraph.aws4.redshift": "redshift",
  "mxgraph.aws4.s3": "s3",
  "mxgraph.aws4.simple_storage_service": "s3",
  "mxgraph.aws4.ebs": "ebs",
  "mxgraph.aws4.efs": "efs",
  "mxgraph.aws4.fsx": "fsx",
  "mxgraph.aws4.glacier": "glacier",
  "mxgraph.aws4.vpc": "vpc",
  "mxgraph.aws4.cloudfront": "cloudfront",
  "mxgraph.aws4.route_53": "route53",
  "mxgraph.aws4.api_gateway": "api-gateway",
  "mxgraph.aws4.elastic_load_balancing": "elb",
  "mxgraph.aws4.direct_connect": "direct-connect",
  "mxgraph.aws4.iam": "iam",
  "mxgraph.aws4.cognito": "cognito",
  "mxgraph.aws4.kms": "kms",
  "mxgraph.aws4.secrets_manager": "secrets-manager",
  "mxgraph.aws4.waf": "waf",
  "mxgraph.aws4.shield": "shield",
  "mxgraph.aws4.guardduty": "guardduty",
  "mxgraph.aws4.certificate_manager": "acm",
  "mxgraph.aws4.athena": "athena",
  "mxgraph.aws4.kinesis": "kinesis",
  "mxgraph.aws4.glue": "glue",
  "mxgraph.aws4.quicksight": "quicksight",
  "mxgraph.aws4.opensearch_service": "opensearch",
  "mxgraph.aws4.opensearch_observability": "opensearch",
  "mxgraph.aws4.emr": "emr",
  "mxgraph.aws4.sagemaker": "sagemaker",
  "mxgraph.aws4.bedrock": "bedrock",
  "mxgraph.aws4.rekognition": "rekognition",
  "mxgraph.aws4.comprehend": "comprehend",
  "mxgraph.aws4.lex": "lex",
  "mxgraph.aws4.polly": "polly",
  "mxgraph.aws4.transcribe": "transcribe",
  "mxgraph.aws4.translate": "translate",
  "mxgraph.aws4.kendra": "kendra",
  "mxgraph.aws4.personalize": "personalize",
  "mxgraph.aws4.entity_resolution": "personalize", // Map to closest
  "mxgraph.aws4.sqs": "sqs",
  "mxgraph.aws4.sns": "sns",
  "mxgraph.aws4.eventbridge": "eventbridge",
  "mxgraph.aws4.step_functions": "step-functions",
  "mxgraph.aws4.appsync": "appsync",
  "mxgraph.aws4.cloudwatch": "cloudwatch",
  "mxgraph.aws4.cloudformation": "cloudformation",
  "mxgraph.aws4.cloudtrail": "cloudtrail",
  "mxgraph.aws4.systems_manager": "systems-manager",
  "mxgraph.aws4.database_migration_service": "dms",
};
