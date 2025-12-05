// AWS Architecture Resource Definitions
// Complete resource catalog with all config fields needed for deployment

export type ResourceCategory = 
  | "networking"
  | "compute"
  | "storage"
  | "database"
  | "security"
  | "application"
  | "monitoring"
  | "integration"
  | "container"
  | "serverless";

export type ResourceType =
  // Networking
  | "vpc"
  | "subnet"
  | "internet-gateway"
  | "nat-gateway"
  | "route-table"
  | "security-group"
  | "nacl"
  | "vpc-endpoint"
  | "transit-gateway"
  | "vpn-gateway"
  // Compute
  | "ec2"
  | "auto-scaling-group"
  | "launch-template"
  | "spot-fleet"
  // Container
  | "ecs-cluster"
  | "ecs-service"
  | "ecs-task"
  | "ecr"
  | "eks-cluster"
  | "fargate"
  // Serverless
  | "lambda"
  | "api-gateway"
  | "step-functions"
  | "eventbridge"
  // Storage
  | "s3"
  | "ebs"
  | "efs"
  | "fsx"
  | "glacier"
  | "storage-gateway"
  // Database
  | "rds"
  | "aurora"
  | "dynamodb"
  | "elasticache"
  | "redshift"
  | "documentdb"
  | "neptune"
  // Security
  | "iam-role"
  | "iam-policy"
  | "kms"
  | "secrets-manager"
  | "cognito"
  | "waf"
  | "shield"
  | "acm"
  // Application / Access
  | "alb"
  | "nlb"
  | "cloudfront"
  | "route53"
  | "global-accelerator"
  // Monitoring
  | "cloudwatch"
  | "cloudwatch-alarm"
  | "cloudtrail"
  | "xray"
  | "config"
  // Integration
  | "sns"
  | "sqs"
  | "kinesis"
  | "msk"
  // Zones (container nodes)
  | "region"
  | "availability-zone";

export interface ConfigField {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "boolean" | "cidr" | "tags" | "json";
  required?: boolean;
  default?: any;
  placeholder?: string;
  options?: { label: string; value: string }[];
  description?: string;
  validation?: string; // regex pattern
}

export interface ResourceDefinition {
  type: ResourceType;
  category: ResourceCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  // Can this resource contain other resources?
  isContainer?: boolean;
  // What resources can be placed inside this one?
  canContain?: ResourceType[];
  // What resources must this be placed inside?
  mustBeInside?: ResourceType[];
  // Configuration fields for deployment
  config: ConfigField[];
  // IAM permissions needed to create this resource
  iamActions: string[];
  // AWS API to create this resource
  createApi: string;
  // Estimated monthly cost (base)
  estimatedCost?: { min: number; max: number; unit: string };
}

// ============================================
// NETWORKING RESOURCES
// ============================================

export const networkingResources: ResourceDefinition[] = [
  {
    type: "region",
    category: "networking",
    label: "AWS Region",
    description: "AWS geographic region",
    icon: "Globe",
    color: "#232F3E",
    isContainer: true,
    canContain: ["vpc", "s3", "route53", "cloudfront", "iam-role", "iam-policy"],
    config: [
      {
        id: "region",
        label: "Region",
        type: "select",
        required: true,
        default: "us-east-1",
        options: [
          { label: "US East (N. Virginia)", value: "us-east-1" },
          { label: "US East (Ohio)", value: "us-east-2" },
          { label: "US West (N. California)", value: "us-west-1" },
          { label: "US West (Oregon)", value: "us-west-2" },
          { label: "EU (Ireland)", value: "eu-west-1" },
          { label: "EU (London)", value: "eu-west-2" },
          { label: "EU (Frankfurt)", value: "eu-central-1" },
          { label: "Asia Pacific (Tokyo)", value: "ap-northeast-1" },
          { label: "Asia Pacific (Singapore)", value: "ap-southeast-1" },
          { label: "Asia Pacific (Sydney)", value: "ap-southeast-2" },
        ],
      },
    ],
    iamActions: [],
    createApi: "N/A",
  },
  {
    type: "vpc",
    category: "networking",
    label: "VPC",
    description: "Virtual Private Cloud - isolated network",
    icon: "Network",
    color: "#8C4FFF",
    isContainer: true,
    canContain: ["availability-zone", "internet-gateway", "nat-gateway", "vpc-endpoint", "transit-gateway"],
    mustBeInside: ["region"],
    config: [
      { id: "name", label: "VPC Name", type: "text", required: true, placeholder: "my-vpc" },
      { id: "cidrBlock", label: "CIDR Block", type: "cidr", required: true, default: "10.0.0.0/16", description: "IPv4 CIDR block for the VPC" },
      { id: "enableDnsHostnames", label: "Enable DNS Hostnames", type: "boolean", default: true },
      { id: "enableDnsSupport", label: "Enable DNS Support", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateVpc", "ec2:ModifyVpcAttribute", "ec2:CreateTags"],
    createApi: "EC2.createVpc",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "availability-zone",
    category: "networking",
    label: "Availability Zone",
    description: "Isolated location within a region",
    icon: "Server",
    color: "#147EBA",
    isContainer: true,
    canContain: ["subnet"],
    mustBeInside: ["vpc"],
    config: [
      {
        id: "zone",
        label: "Availability Zone",
        type: "select",
        required: true,
        options: [
          { label: "Zone A", value: "a" },
          { label: "Zone B", value: "b" },
          { label: "Zone C", value: "c" },
        ],
      },
    ],
    iamActions: [],
    createApi: "N/A",
  },
  {
    type: "subnet",
    category: "networking",
    label: "Subnet",
    description: "Range of IP addresses in your VPC",
    icon: "LayoutGrid",
    color: "#147EBA",
    isContainer: true,
    canContain: ["ec2", "rds", "elasticache", "ecs-service", "lambda", "nat-gateway"],
    mustBeInside: ["availability-zone"],
    config: [
      { id: "name", label: "Subnet Name", type: "text", required: true, placeholder: "public-subnet-1a" },
      { id: "cidrBlock", label: "CIDR Block", type: "cidr", required: true, placeholder: "10.0.1.0/24" },
      { id: "isPublic", label: "Public Subnet", type: "boolean", default: false, description: "Enable auto-assign public IP" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateSubnet", "ec2:ModifySubnetAttribute", "ec2:CreateTags"],
    createApi: "EC2.createSubnet",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "internet-gateway",
    category: "networking",
    label: "Internet Gateway",
    description: "Gateway for internet access",
    icon: "Globe",
    color: "#8C4FFF",
    mustBeInside: ["vpc"],
    config: [
      { id: "name", label: "Name", type: "text", required: true, placeholder: "main-igw" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateInternetGateway", "ec2:AttachInternetGateway", "ec2:CreateTags"],
    createApi: "EC2.createInternetGateway",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "nat-gateway",
    category: "networking",
    label: "NAT Gateway",
    description: "Network address translation for private subnets",
    icon: "ArrowLeftRight",
    color: "#8C4FFF",
    mustBeInside: ["subnet"],
    config: [
      { id: "name", label: "Name", type: "text", required: true, placeholder: "nat-gw-1a" },
      { id: "connectivityType", label: "Connectivity", type: "select", default: "public", options: [
        { label: "Public", value: "public" },
        { label: "Private", value: "private" },
      ]},
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateNatGateway", "ec2:AllocateAddress", "ec2:CreateTags"],
    createApi: "EC2.createNatGateway",
    estimatedCost: { min: 32, max: 45, unit: "month" },
  },
  {
    type: "route-table",
    category: "networking",
    label: "Route Table",
    description: "Rules for routing network traffic",
    icon: "Route",
    color: "#8C4FFF",
    mustBeInside: ["vpc"],
    config: [
      { id: "name", label: "Name", type: "text", required: true, placeholder: "public-rt" },
      { id: "routes", label: "Routes", type: "json", description: "Route definitions" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateRouteTable", "ec2:CreateRoute", "ec2:AssociateRouteTable"],
    createApi: "EC2.createRouteTable",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "security-group",
    category: "security",
    label: "Security Group",
    description: "Virtual firewall for instances",
    icon: "Shield",
    color: "#DD344C",
    mustBeInside: ["vpc"],
    config: [
      { id: "name", label: "Name", type: "text", required: true, placeholder: "web-sg" },
      { id: "description", label: "Description", type: "text", required: true, placeholder: "Security group for web servers" },
      { id: "ingressRules", label: "Inbound Rules", type: "json", description: "Inbound traffic rules" },
      { id: "egressRules", label: "Outbound Rules", type: "json", description: "Outbound traffic rules" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateSecurityGroup", "ec2:AuthorizeSecurityGroupIngress", "ec2:AuthorizeSecurityGroupEgress"],
    createApi: "EC2.createSecurityGroup",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
];

// ============================================
// COMPUTE RESOURCES
// ============================================

export const computeResources: ResourceDefinition[] = [
  {
    type: "ec2",
    category: "compute",
    label: "EC2 Instance",
    description: "Virtual server in the cloud",
    icon: "Server",
    color: "#ED7100",
    mustBeInside: ["subnet"],
    config: [
      { id: "name", label: "Instance Name", type: "text", required: true, placeholder: "web-server-1" },
      { id: "instanceType", label: "Instance Type", type: "select", required: true, default: "t3.micro", options: [
        { label: "t3.micro (1 vCPU, 1GB)", value: "t3.micro" },
        { label: "t3.small (2 vCPU, 2GB)", value: "t3.small" },
        { label: "t3.medium (2 vCPU, 4GB)", value: "t3.medium" },
        { label: "t3.large (2 vCPU, 8GB)", value: "t3.large" },
        { label: "m5.large (2 vCPU, 8GB)", value: "m5.large" },
        { label: "m5.xlarge (4 vCPU, 16GB)", value: "m5.xlarge" },
        { label: "c5.large (2 vCPU, 4GB)", value: "c5.large" },
        { label: "r5.large (2 vCPU, 16GB)", value: "r5.large" },
      ]},
      { id: "ami", label: "AMI ID", type: "text", required: true, placeholder: "ami-0123456789abcdef0", description: "Amazon Machine Image" },
      { id: "keyName", label: "Key Pair", type: "text", placeholder: "my-key-pair" },
      { id: "ebsVolumeSize", label: "Root Volume Size (GB)", type: "number", default: 20 },
      { id: "ebsVolumeType", label: "Volume Type", type: "select", default: "gp3", options: [
        { label: "gp3 (General Purpose SSD)", value: "gp3" },
        { label: "gp2 (General Purpose SSD)", value: "gp2" },
        { label: "io1 (Provisioned IOPS)", value: "io1" },
        { label: "st1 (Throughput Optimized HDD)", value: "st1" },
      ]},
      { id: "userData", label: "User Data", type: "text", description: "Startup script (base64)" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:RunInstances", "ec2:CreateTags", "ec2:DescribeInstances"],
    createApi: "EC2.runInstances",
    estimatedCost: { min: 8, max: 150, unit: "month" },
  },
  {
    type: "auto-scaling-group",
    category: "compute",
    label: "Auto Scaling Group",
    description: "Automatically scale EC2 capacity",
    icon: "Scaling",
    color: "#ED7100",
    config: [
      { id: "name", label: "ASG Name", type: "text", required: true, placeholder: "web-asg" },
      { id: "minSize", label: "Minimum Size", type: "number", required: true, default: 1 },
      { id: "maxSize", label: "Maximum Size", type: "number", required: true, default: 4 },
      { id: "desiredCapacity", label: "Desired Capacity", type: "number", required: true, default: 2 },
      { id: "healthCheckType", label: "Health Check Type", type: "select", default: "EC2", options: [
        { label: "EC2", value: "EC2" },
        { label: "ELB", value: "ELB" },
      ]},
      { id: "healthCheckGracePeriod", label: "Health Check Grace Period (s)", type: "number", default: 300 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["autoscaling:CreateAutoScalingGroup", "autoscaling:UpdateAutoScalingGroup"],
    createApi: "AutoScaling.createAutoScalingGroup",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "lambda",
    category: "serverless",
    label: "Lambda Function",
    description: "Serverless compute service",
    icon: "Zap",
    color: "#ED7100",
    config: [
      { id: "functionName", label: "Function Name", type: "text", required: true, placeholder: "my-function" },
      { id: "runtime", label: "Runtime", type: "select", required: true, default: "nodejs18.x", options: [
        { label: "Node.js 18.x", value: "nodejs18.x" },
        { label: "Node.js 20.x", value: "nodejs20.x" },
        { label: "Python 3.11", value: "python3.11" },
        { label: "Python 3.12", value: "python3.12" },
        { label: "Java 17", value: "java17" },
        { label: "Go 1.x", value: "go1.x" },
        { label: ".NET 6", value: "dotnet6" },
      ]},
      { id: "handler", label: "Handler", type: "text", required: true, default: "index.handler" },
      { id: "memorySize", label: "Memory (MB)", type: "number", default: 128 },
      { id: "timeout", label: "Timeout (seconds)", type: "number", default: 30 },
      { id: "description", label: "Description", type: "text" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["lambda:CreateFunction", "lambda:UpdateFunctionConfiguration", "iam:PassRole"],
    createApi: "Lambda.createFunction",
    estimatedCost: { min: 0, max: 20, unit: "month" },
  },
];

// ============================================
// CONTAINER RESOURCES
// ============================================

export const containerResources: ResourceDefinition[] = [
  {
    type: "ecs-cluster",
    category: "container",
    label: "ECS Cluster",
    description: "Container orchestration cluster",
    icon: "Boxes",
    color: "#ED7100",
    config: [
      { id: "clusterName", label: "Cluster Name", type: "text", required: true, placeholder: "my-cluster" },
      { id: "capacityProviders", label: "Capacity Providers", type: "select", default: "FARGATE", options: [
        { label: "Fargate", value: "FARGATE" },
        { label: "Fargate Spot", value: "FARGATE_SPOT" },
        { label: "EC2", value: "EC2" },
      ]},
      { id: "containerInsights", label: "Container Insights", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ecs:CreateCluster", "ecs:TagResource"],
    createApi: "ECS.createCluster",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "ecs-service",
    category: "container",
    label: "ECS Service",
    description: "Long-running container service",
    icon: "Container",
    color: "#ED7100",
    mustBeInside: ["subnet"],
    config: [
      { id: "serviceName", label: "Service Name", type: "text", required: true, placeholder: "web-service" },
      { id: "desiredCount", label: "Desired Count", type: "number", required: true, default: 2 },
      { id: "launchType", label: "Launch Type", type: "select", default: "FARGATE", options: [
        { label: "Fargate", value: "FARGATE" },
        { label: "EC2", value: "EC2" },
      ]},
      { id: "cpu", label: "CPU Units", type: "select", default: "256", options: [
        { label: "0.25 vCPU", value: "256" },
        { label: "0.5 vCPU", value: "512" },
        { label: "1 vCPU", value: "1024" },
        { label: "2 vCPU", value: "2048" },
        { label: "4 vCPU", value: "4096" },
      ]},
      { id: "memory", label: "Memory", type: "select", default: "512", options: [
        { label: "512 MB", value: "512" },
        { label: "1 GB", value: "1024" },
        { label: "2 GB", value: "2048" },
        { label: "4 GB", value: "4096" },
        { label: "8 GB", value: "8192" },
      ]},
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ecs:CreateService", "ecs:UpdateService", "iam:PassRole"],
    createApi: "ECS.createService",
    estimatedCost: { min: 10, max: 100, unit: "month" },
  },
  {
    type: "fargate",
    category: "container",
    label: "Fargate Task",
    description: "Serverless container compute",
    icon: "Box",
    color: "#ED7100",
    mustBeInside: ["subnet"],
    config: [
      { id: "taskName", label: "Task Name", type: "text", required: true },
      { id: "cpu", label: "CPU", type: "select", default: "256", options: [
        { label: "0.25 vCPU", value: "256" },
        { label: "0.5 vCPU", value: "512" },
        { label: "1 vCPU", value: "1024" },
        { label: "2 vCPU", value: "2048" },
      ]},
      { id: "memory", label: "Memory", type: "select", default: "512", options: [
        { label: "512 MB", value: "512" },
        { label: "1 GB", value: "1024" },
        { label: "2 GB", value: "2048" },
        { label: "4 GB", value: "4096" },
      ]},
      { id: "image", label: "Container Image", type: "text", required: true, placeholder: "nginx:latest" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ecs:RunTask", "ecs:RegisterTaskDefinition"],
    createApi: "ECS.runTask",
    estimatedCost: { min: 10, max: 50, unit: "month" },
  },
];

// ============================================
// STORAGE RESOURCES
// ============================================

export const storageResources: ResourceDefinition[] = [
  {
    type: "s3",
    category: "storage",
    label: "S3 Bucket",
    description: "Object storage service",
    icon: "Bucket",
    color: "#3F8624",
    config: [
      { id: "bucketName", label: "Bucket Name", type: "text", required: true, placeholder: "my-unique-bucket-name" },
      { id: "versioning", label: "Versioning", type: "boolean", default: false },
      { id: "encryption", label: "Encryption", type: "select", default: "AES256", options: [
        { label: "SSE-S3 (AES-256)", value: "AES256" },
        { label: "SSE-KMS", value: "aws:kms" },
      ]},
      { id: "publicAccess", label: "Block Public Access", type: "boolean", default: true },
      { id: "lifecycleRules", label: "Lifecycle Rules", type: "json" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["s3:CreateBucket", "s3:PutBucketVersioning", "s3:PutBucketEncryption", "s3:PutBucketPublicAccessBlock"],
    createApi: "S3.createBucket",
    estimatedCost: { min: 0, max: 23, unit: "month per TB" },
  },
  {
    type: "ebs",
    category: "storage",
    label: "EBS Volume",
    description: "Block storage for EC2",
    icon: "HardDrive",
    color: "#3F8624",
    mustBeInside: ["availability-zone"],
    config: [
      { id: "name", label: "Volume Name", type: "text", required: true },
      { id: "volumeType", label: "Volume Type", type: "select", required: true, default: "gp3", options: [
        { label: "gp3 (General Purpose SSD)", value: "gp3" },
        { label: "gp2 (General Purpose SSD)", value: "gp2" },
        { label: "io1 (Provisioned IOPS)", value: "io1" },
        { label: "io2 (Provisioned IOPS)", value: "io2" },
        { label: "st1 (Throughput Optimized HDD)", value: "st1" },
        { label: "sc1 (Cold HDD)", value: "sc1" },
      ]},
      { id: "size", label: "Size (GB)", type: "number", required: true, default: 100 },
      { id: "iops", label: "IOPS", type: "number", description: "For io1/io2/gp3" },
      { id: "encrypted", label: "Encrypted", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["ec2:CreateVolume", "ec2:CreateTags"],
    createApi: "EC2.createVolume",
    estimatedCost: { min: 8, max: 125, unit: "month per 100GB" },
  },
  {
    type: "efs",
    category: "storage",
    label: "EFS File System",
    description: "Elastic file storage for EC2",
    icon: "FolderOpen",
    color: "#3F8624",
    config: [
      { id: "name", label: "File System Name", type: "text", required: true },
      { id: "performanceMode", label: "Performance Mode", type: "select", default: "generalPurpose", options: [
        { label: "General Purpose", value: "generalPurpose" },
        { label: "Max I/O", value: "maxIO" },
      ]},
      { id: "throughputMode", label: "Throughput Mode", type: "select", default: "bursting", options: [
        { label: "Bursting", value: "bursting" },
        { label: "Provisioned", value: "provisioned" },
        { label: "Elastic", value: "elastic" },
      ]},
      { id: "encrypted", label: "Encrypted", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["elasticfilesystem:CreateFileSystem", "elasticfilesystem:CreateMountTarget"],
    createApi: "EFS.createFileSystem",
    estimatedCost: { min: 0.30, max: 0.30, unit: "per GB-month" },
  },
];

// ============================================
// DATABASE RESOURCES
// ============================================

export const databaseResources: ResourceDefinition[] = [
  {
    type: "rds",
    category: "database",
    label: "RDS Database",
    description: "Managed relational database",
    icon: "Database",
    color: "#3B48CC",
    mustBeInside: ["subnet"],
    config: [
      { id: "identifier", label: "DB Identifier", type: "text", required: true, placeholder: "my-database" },
      { id: "engine", label: "Engine", type: "select", required: true, default: "postgres", options: [
        { label: "PostgreSQL", value: "postgres" },
        { label: "MySQL", value: "mysql" },
        { label: "MariaDB", value: "mariadb" },
        { label: "SQL Server", value: "sqlserver-ex" },
        { label: "Oracle", value: "oracle-se2" },
      ]},
      { id: "engineVersion", label: "Engine Version", type: "text", placeholder: "15.4" },
      { id: "instanceClass", label: "Instance Class", type: "select", required: true, default: "db.t3.micro", options: [
        { label: "db.t3.micro (1 vCPU, 1GB)", value: "db.t3.micro" },
        { label: "db.t3.small (2 vCPU, 2GB)", value: "db.t3.small" },
        { label: "db.t3.medium (2 vCPU, 4GB)", value: "db.t3.medium" },
        { label: "db.r5.large (2 vCPU, 16GB)", value: "db.r5.large" },
        { label: "db.r5.xlarge (4 vCPU, 32GB)", value: "db.r5.xlarge" },
      ]},
      { id: "allocatedStorage", label: "Storage (GB)", type: "number", required: true, default: 20 },
      { id: "storageType", label: "Storage Type", type: "select", default: "gp3", options: [
        { label: "gp3", value: "gp3" },
        { label: "gp2", value: "gp2" },
        { label: "io1", value: "io1" },
      ]},
      { id: "masterUsername", label: "Master Username", type: "text", required: true, default: "admin" },
      { id: "multiAZ", label: "Multi-AZ", type: "boolean", default: false, description: "High availability deployment" },
      { id: "publiclyAccessible", label: "Publicly Accessible", type: "boolean", default: false },
      { id: "backupRetention", label: "Backup Retention (days)", type: "number", default: 7 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["rds:CreateDBInstance", "rds:AddTagsToResource"],
    createApi: "RDS.createDBInstance",
    estimatedCost: { min: 15, max: 500, unit: "month" },
  },
  {
    type: "aurora",
    category: "database",
    label: "Aurora Cluster",
    description: "High-performance managed database",
    icon: "Database",
    color: "#3B48CC",
    config: [
      { id: "clusterIdentifier", label: "Cluster Identifier", type: "text", required: true },
      { id: "engine", label: "Engine", type: "select", required: true, default: "aurora-postgresql", options: [
        { label: "Aurora PostgreSQL", value: "aurora-postgresql" },
        { label: "Aurora MySQL", value: "aurora-mysql" },
      ]},
      { id: "engineMode", label: "Engine Mode", type: "select", default: "provisioned", options: [
        { label: "Provisioned", value: "provisioned" },
        { label: "Serverless v2", value: "serverless" },
      ]},
      { id: "instanceClass", label: "Instance Class", type: "select", default: "db.r5.large", options: [
        { label: "db.r5.large", value: "db.r5.large" },
        { label: "db.r5.xlarge", value: "db.r5.xlarge" },
        { label: "db.r5.2xlarge", value: "db.r5.2xlarge" },
        { label: "db.r6g.large", value: "db.r6g.large" },
      ]},
      { id: "instances", label: "Number of Instances", type: "number", default: 2, description: "Primary + Read Replicas" },
      { id: "masterUsername", label: "Master Username", type: "text", required: true, default: "admin" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["rds:CreateDBCluster", "rds:CreateDBInstance"],
    createApi: "RDS.createDBCluster",
    estimatedCost: { min: 60, max: 1000, unit: "month" },
  },
  {
    type: "dynamodb",
    category: "database",
    label: "DynamoDB Table",
    description: "Serverless NoSQL database",
    icon: "Table",
    color: "#3B48CC",
    config: [
      { id: "tableName", label: "Table Name", type: "text", required: true },
      { id: "partitionKey", label: "Partition Key", type: "text", required: true, placeholder: "id" },
      { id: "partitionKeyType", label: "Partition Key Type", type: "select", default: "S", options: [
        { label: "String", value: "S" },
        { label: "Number", value: "N" },
        { label: "Binary", value: "B" },
      ]},
      { id: "sortKey", label: "Sort Key", type: "text", placeholder: "timestamp" },
      { id: "billingMode", label: "Billing Mode", type: "select", default: "PAY_PER_REQUEST", options: [
        { label: "On-Demand", value: "PAY_PER_REQUEST" },
        { label: "Provisioned", value: "PROVISIONED" },
      ]},
      { id: "readCapacity", label: "Read Capacity Units", type: "number", default: 5, description: "For provisioned mode" },
      { id: "writeCapacity", label: "Write Capacity Units", type: "number", default: 5, description: "For provisioned mode" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["dynamodb:CreateTable", "dynamodb:TagResource"],
    createApi: "DynamoDB.createTable",
    estimatedCost: { min: 0, max: 100, unit: "month" },
  },
  {
    type: "elasticache",
    category: "database",
    label: "ElastiCache",
    description: "In-memory caching service",
    icon: "Zap",
    color: "#3B48CC",
    mustBeInside: ["subnet"],
    config: [
      { id: "clusterId", label: "Cluster ID", type: "text", required: true },
      { id: "engine", label: "Engine", type: "select", required: true, default: "redis", options: [
        { label: "Redis", value: "redis" },
        { label: "Memcached", value: "memcached" },
      ]},
      { id: "nodeType", label: "Node Type", type: "select", required: true, default: "cache.t3.micro", options: [
        { label: "cache.t3.micro", value: "cache.t3.micro" },
        { label: "cache.t3.small", value: "cache.t3.small" },
        { label: "cache.t3.medium", value: "cache.t3.medium" },
        { label: "cache.r5.large", value: "cache.r5.large" },
      ]},
      { id: "numCacheNodes", label: "Number of Nodes", type: "number", default: 1 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["elasticache:CreateCacheCluster", "elasticache:AddTagsToResource"],
    createApi: "ElastiCache.createCacheCluster",
    estimatedCost: { min: 12, max: 200, unit: "month" },
  },
];

// ============================================
// APPLICATION / ACCESS RESOURCES
// ============================================

export const applicationResources: ResourceDefinition[] = [
  {
    type: "alb",
    category: "application",
    label: "Application Load Balancer",
    description: "Layer 7 load balancer",
    icon: "Split",
    color: "#8C4FFF",
    config: [
      { id: "name", label: "Load Balancer Name", type: "text", required: true, placeholder: "web-alb" },
      { id: "scheme", label: "Scheme", type: "select", default: "internet-facing", options: [
        { label: "Internet-facing", value: "internet-facing" },
        { label: "Internal", value: "internal" },
      ]},
      { id: "ipAddressType", label: "IP Address Type", type: "select", default: "ipv4", options: [
        { label: "IPv4", value: "ipv4" },
        { label: "Dual-stack", value: "dualstack" },
      ]},
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["elasticloadbalancing:CreateLoadBalancer", "elasticloadbalancing:CreateTargetGroup", "elasticloadbalancing:CreateListener"],
    createApi: "ELBv2.createLoadBalancer",
    estimatedCost: { min: 16, max: 50, unit: "month" },
  },
  {
    type: "nlb",
    category: "application",
    label: "Network Load Balancer",
    description: "Layer 4 load balancer",
    icon: "Split",
    color: "#8C4FFF",
    config: [
      { id: "name", label: "Load Balancer Name", type: "text", required: true },
      { id: "scheme", label: "Scheme", type: "select", default: "internet-facing", options: [
        { label: "Internet-facing", value: "internet-facing" },
        { label: "Internal", value: "internal" },
      ]},
      { id: "crossZone", label: "Cross-Zone Load Balancing", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["elasticloadbalancing:CreateLoadBalancer"],
    createApi: "ELBv2.createLoadBalancer",
    estimatedCost: { min: 16, max: 50, unit: "month" },
  },
  {
    type: "cloudfront",
    category: "application",
    label: "CloudFront Distribution",
    description: "Content delivery network",
    icon: "Globe",
    color: "#8C4FFF",
    config: [
      { id: "comment", label: "Description", type: "text", placeholder: "My CDN distribution" },
      { id: "originDomain", label: "Origin Domain", type: "text", required: true, placeholder: "my-bucket.s3.amazonaws.com" },
      { id: "originProtocol", label: "Origin Protocol", type: "select", default: "https-only", options: [
        { label: "HTTPS Only", value: "https-only" },
        { label: "HTTP Only", value: "http-only" },
        { label: "Match Viewer", value: "match-viewer" },
      ]},
      { id: "priceClass", label: "Price Class", type: "select", default: "PriceClass_100", options: [
        { label: "Use All Edge Locations", value: "PriceClass_All" },
        { label: "Use Only North America and Europe", value: "PriceClass_100" },
        { label: "Use North America, Europe, Asia, Middle East, Africa", value: "PriceClass_200" },
      ]},
      { id: "defaultTTL", label: "Default TTL (seconds)", type: "number", default: 86400 },
      { id: "enabled", label: "Enabled", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["cloudfront:CreateDistribution", "cloudfront:TagResource"],
    createApi: "CloudFront.createDistribution",
    estimatedCost: { min: 0, max: 100, unit: "month" },
  },
  {
    type: "route53",
    category: "application",
    label: "Route 53 Hosted Zone",
    description: "DNS management",
    icon: "Globe",
    color: "#8C4FFF",
    config: [
      { id: "domainName", label: "Domain Name", type: "text", required: true, placeholder: "example.com" },
      { id: "comment", label: "Comment", type: "text" },
      { id: "privateZone", label: "Private Zone", type: "boolean", default: false },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["route53:CreateHostedZone", "route53:ChangeTagsForResource"],
    createApi: "Route53.createHostedZone",
    estimatedCost: { min: 0.50, max: 0.50, unit: "per hosted zone/month" },
  },
  {
    type: "api-gateway",
    category: "serverless",
    label: "API Gateway",
    description: "Managed API service",
    icon: "Webhook",
    color: "#A166FF",
    config: [
      { id: "name", label: "API Name", type: "text", required: true },
      { id: "description", label: "Description", type: "text" },
      { id: "apiType", label: "API Type", type: "select", default: "REST", options: [
        { label: "REST API", value: "REST" },
        { label: "HTTP API", value: "HTTP" },
        { label: "WebSocket API", value: "WEBSOCKET" },
      ]},
      { id: "endpointType", label: "Endpoint Type", type: "select", default: "REGIONAL", options: [
        { label: "Regional", value: "REGIONAL" },
        { label: "Edge-optimized", value: "EDGE" },
        { label: "Private", value: "PRIVATE" },
      ]},
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["apigateway:POST"],
    createApi: "APIGateway.createRestApi",
    estimatedCost: { min: 0, max: 50, unit: "month" },
  },
];

// ============================================
// SECURITY RESOURCES
// ============================================

export const securityResources: ResourceDefinition[] = [
  {
    type: "iam-role",
    category: "security",
    label: "IAM Role",
    description: "Identity with permissions",
    icon: "UserCheck",
    color: "#DD344C",
    config: [
      { id: "roleName", label: "Role Name", type: "text", required: true, placeholder: "my-role" },
      { id: "description", label: "Description", type: "text" },
      { id: "assumeRolePolicy", label: "Trust Policy", type: "json", required: true, description: "Who can assume this role" },
      { id: "maxSessionDuration", label: "Max Session Duration (seconds)", type: "number", default: 3600 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["iam:CreateRole", "iam:TagRole"],
    createApi: "IAM.createRole",
    estimatedCost: { min: 0, max: 0, unit: "month" },
  },
  {
    type: "waf",
    category: "security",
    label: "WAF Web ACL",
    description: "Web application firewall",
    icon: "Shield",
    color: "#DD344C",
    config: [
      { id: "name", label: "Web ACL Name", type: "text", required: true },
      { id: "description", label: "Description", type: "text" },
      { id: "scope", label: "Scope", type: "select", required: true, default: "REGIONAL", options: [
        { label: "Regional (ALB, API Gateway)", value: "REGIONAL" },
        { label: "CloudFront", value: "CLOUDFRONT" },
      ]},
      { id: "defaultAction", label: "Default Action", type: "select", default: "ALLOW", options: [
        { label: "Allow", value: "ALLOW" },
        { label: "Block", value: "BLOCK" },
      ]},
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["wafv2:CreateWebACL", "wafv2:TagResource"],
    createApi: "WAFv2.createWebACL",
    estimatedCost: { min: 5, max: 50, unit: "month" },
  },
  {
    type: "cognito",
    category: "security",
    label: "Cognito User Pool",
    description: "User authentication service",
    icon: "Users",
    color: "#DD344C",
    config: [
      { id: "poolName", label: "User Pool Name", type: "text", required: true },
      { id: "mfaConfiguration", label: "MFA", type: "select", default: "OFF", options: [
        { label: "Off", value: "OFF" },
        { label: "Optional", value: "OPTIONAL" },
        { label: "Required", value: "ON" },
      ]},
      { id: "passwordMinLength", label: "Password Min Length", type: "number", default: 8 },
      { id: "passwordRequireLowercase", label: "Require Lowercase", type: "boolean", default: true },
      { id: "passwordRequireUppercase", label: "Require Uppercase", type: "boolean", default: true },
      { id: "passwordRequireNumbers", label: "Require Numbers", type: "boolean", default: true },
      { id: "passwordRequireSymbols", label: "Require Symbols", type: "boolean", default: false },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["cognito-idp:CreateUserPool", "cognito-idp:TagResource"],
    createApi: "CognitoIdentityServiceProvider.createUserPool",
    estimatedCost: { min: 0, max: 0.0055, unit: "per MAU" },
  },
  {
    type: "kms",
    category: "security",
    label: "KMS Key",
    description: "Encryption key management",
    icon: "Key",
    color: "#DD344C",
    config: [
      { id: "alias", label: "Key Alias", type: "text", required: true, placeholder: "alias/my-key" },
      { id: "description", label: "Description", type: "text" },
      { id: "keyUsage", label: "Key Usage", type: "select", default: "ENCRYPT_DECRYPT", options: [
        { label: "Encrypt and Decrypt", value: "ENCRYPT_DECRYPT" },
        { label: "Sign and Verify", value: "SIGN_VERIFY" },
      ]},
      { id: "keySpec", label: "Key Spec", type: "select", default: "SYMMETRIC_DEFAULT", options: [
        { label: "Symmetric (AES-256)", value: "SYMMETRIC_DEFAULT" },
        { label: "RSA 2048", value: "RSA_2048" },
        { label: "RSA 4096", value: "RSA_4096" },
      ]},
      { id: "enableKeyRotation", label: "Enable Key Rotation", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["kms:CreateKey", "kms:CreateAlias", "kms:TagResource"],
    createApi: "KMS.createKey",
    estimatedCost: { min: 1, max: 1, unit: "per key/month" },
  },
  {
    type: "secrets-manager",
    category: "security",
    label: "Secrets Manager",
    description: "Secure secrets storage",
    icon: "Lock",
    color: "#DD344C",
    config: [
      { id: "name", label: "Secret Name", type: "text", required: true, placeholder: "my-app/db-password" },
      { id: "description", label: "Description", type: "text" },
      { id: "secretType", label: "Secret Type", type: "select", default: "other", options: [
        { label: "Other", value: "other" },
        { label: "RDS Database", value: "rds" },
        { label: "Redshift Cluster", value: "redshift" },
        { label: "DocumentDB", value: "documentdb" },
      ]},
      { id: "rotationEnabled", label: "Enable Rotation", type: "boolean", default: false },
      { id: "rotationDays", label: "Rotation Interval (days)", type: "number", default: 30 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["secretsmanager:CreateSecret", "secretsmanager:TagResource"],
    createApi: "SecretsManager.createSecret",
    estimatedCost: { min: 0.40, max: 0.40, unit: "per secret/month" },
  },
];

// ============================================
// MONITORING RESOURCES
// ============================================

export const monitoringResources: ResourceDefinition[] = [
  {
    type: "cloudwatch",
    category: "monitoring",
    label: "CloudWatch Dashboard",
    description: "Monitoring dashboard",
    icon: "BarChart3",
    color: "#E7157B",
    config: [
      { id: "dashboardName", label: "Dashboard Name", type: "text", required: true },
      { id: "widgets", label: "Widgets", type: "json", description: "Dashboard widget configuration" },
    ],
    iamActions: ["cloudwatch:PutDashboard"],
    createApi: "CloudWatch.putDashboard",
    estimatedCost: { min: 3, max: 3, unit: "per dashboard/month" },
  },
  {
    type: "cloudwatch-alarm",
    category: "monitoring",
    label: "CloudWatch Alarm",
    description: "Metric-based alarm",
    icon: "Bell",
    color: "#E7157B",
    config: [
      { id: "alarmName", label: "Alarm Name", type: "text", required: true },
      { id: "metricName", label: "Metric Name", type: "text", required: true, placeholder: "CPUUtilization" },
      { id: "namespace", label: "Namespace", type: "text", required: true, placeholder: "AWS/EC2" },
      { id: "statistic", label: "Statistic", type: "select", default: "Average", options: [
        { label: "Average", value: "Average" },
        { label: "Sum", value: "Sum" },
        { label: "Minimum", value: "Minimum" },
        { label: "Maximum", value: "Maximum" },
      ]},
      { id: "period", label: "Period (seconds)", type: "number", default: 300 },
      { id: "threshold", label: "Threshold", type: "number", required: true },
      { id: "comparisonOperator", label: "Comparison", type: "select", required: true, options: [
        { label: "Greater than", value: "GreaterThanThreshold" },
        { label: "Greater than or equal", value: "GreaterThanOrEqualToThreshold" },
        { label: "Less than", value: "LessThanThreshold" },
        { label: "Less than or equal", value: "LessThanOrEqualToThreshold" },
      ]},
      { id: "evaluationPeriods", label: "Evaluation Periods", type: "number", default: 2 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["cloudwatch:PutMetricAlarm", "cloudwatch:TagResource"],
    createApi: "CloudWatch.putMetricAlarm",
    estimatedCost: { min: 0.10, max: 0.10, unit: "per alarm/month" },
  },
  {
    type: "cloudtrail",
    category: "monitoring",
    label: "CloudTrail",
    description: "API activity logging",
    icon: "FileText",
    color: "#E7157B",
    config: [
      { id: "trailName", label: "Trail Name", type: "text", required: true },
      { id: "s3BucketName", label: "S3 Bucket for Logs", type: "text", required: true },
      { id: "isMultiRegion", label: "Multi-Region Trail", type: "boolean", default: true },
      { id: "includeGlobalEvents", label: "Include Global Events", type: "boolean", default: true },
      { id: "enableLogFileValidation", label: "Log File Validation", type: "boolean", default: true },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["cloudtrail:CreateTrail", "cloudtrail:AddTags"],
    createApi: "CloudTrail.createTrail",
    estimatedCost: { min: 0, max: 2, unit: "per 100K events" },
  },
];

// ============================================
// INTEGRATION RESOURCES
// ============================================

export const integrationResources: ResourceDefinition[] = [
  {
    type: "sns",
    category: "integration",
    label: "SNS Topic",
    description: "Pub/sub messaging service",
    icon: "Bell",
    color: "#E7157B",
    config: [
      { id: "topicName", label: "Topic Name", type: "text", required: true },
      { id: "displayName", label: "Display Name", type: "text" },
      { id: "fifoTopic", label: "FIFO Topic", type: "boolean", default: false },
      { id: "contentBasedDeduplication", label: "Content-Based Deduplication", type: "boolean", default: false },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["sns:CreateTopic", "sns:TagResource"],
    createApi: "SNS.createTopic",
    estimatedCost: { min: 0, max: 0.50, unit: "per million requests" },
  },
  {
    type: "sqs",
    category: "integration",
    label: "SQS Queue",
    description: "Message queuing service",
    icon: "ListOrdered",
    color: "#E7157B",
    config: [
      { id: "queueName", label: "Queue Name", type: "text", required: true },
      { id: "fifoQueue", label: "FIFO Queue", type: "boolean", default: false },
      { id: "visibilityTimeout", label: "Visibility Timeout (seconds)", type: "number", default: 30 },
      { id: "messageRetentionPeriod", label: "Message Retention (seconds)", type: "number", default: 345600 },
      { id: "delaySeconds", label: "Delivery Delay (seconds)", type: "number", default: 0 },
      { id: "maxMessageSize", label: "Max Message Size (bytes)", type: "number", default: 262144 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["sqs:CreateQueue", "sqs:TagQueue"],
    createApi: "SQS.createQueue",
    estimatedCost: { min: 0, max: 0.40, unit: "per million requests" },
  },
  {
    type: "eventbridge",
    category: "integration",
    label: "EventBridge Bus",
    description: "Serverless event bus",
    icon: "Workflow",
    color: "#E7157B",
    config: [
      { id: "name", label: "Event Bus Name", type: "text", required: true },
      { id: "description", label: "Description", type: "text" },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["events:CreateEventBus", "events:TagResource"],
    createApi: "EventBridge.createEventBus",
    estimatedCost: { min: 0, max: 1, unit: "per million events" },
  },
  {
    type: "kinesis",
    category: "integration",
    label: "Kinesis Data Stream",
    description: "Real-time data streaming",
    icon: "Activity",
    color: "#E7157B",
    config: [
      { id: "streamName", label: "Stream Name", type: "text", required: true },
      { id: "streamMode", label: "Capacity Mode", type: "select", default: "ON_DEMAND", options: [
        { label: "On-Demand", value: "ON_DEMAND" },
        { label: "Provisioned", value: "PROVISIONED" },
      ]},
      { id: "shardCount", label: "Shard Count", type: "number", default: 1, description: "For provisioned mode" },
      { id: "retentionPeriod", label: "Retention Period (hours)", type: "number", default: 24 },
      { id: "tags", label: "Tags", type: "tags" },
    ],
    iamActions: ["kinesis:CreateStream", "kinesis:AddTagsToStream"],
    createApi: "Kinesis.createStream",
    estimatedCost: { min: 36, max: 36, unit: "per shard/month" },
  },
];

// ============================================
// ALL RESOURCES COMBINED
// ============================================

export const allResources: ResourceDefinition[] = [
  ...networkingResources,
  ...computeResources,
  ...containerResources,
  ...storageResources,
  ...databaseResources,
  ...applicationResources,
  ...securityResources,
  ...monitoringResources,
  ...integrationResources,
];

export function getResourceDefinition(type: ResourceType): ResourceDefinition | undefined {
  return allResources.find(r => r.type === type);
}

export function getResourcesByCategory(category: ResourceCategory): ResourceDefinition[] {
  return allResources.filter(r => r.category === category);
}

export const resourceCategories: { id: ResourceCategory; label: string; icon: string; color: string }[] = [
  { id: "networking", label: "Networking", icon: "Network", color: "#8C4FFF" },
  { id: "compute", label: "Compute", icon: "Server", color: "#ED7100" },
  { id: "container", label: "Containers", icon: "Boxes", color: "#ED7100" },
  { id: "serverless", label: "Serverless", icon: "Zap", color: "#ED7100" },
  { id: "storage", label: "Storage", icon: "HardDrive", color: "#3F8624" },
  { id: "database", label: "Database", icon: "Database", color: "#3B48CC" },
  { id: "application", label: "Application", icon: "Globe", color: "#8C4FFF" },
  { id: "security", label: "Security", icon: "Shield", color: "#DD344C" },
  { id: "monitoring", label: "Monitoring", icon: "BarChart3", color: "#E7157B" },
  { id: "integration", label: "Integration", icon: "Workflow", color: "#E7157B" },
];
