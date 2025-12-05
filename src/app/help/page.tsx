"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  HelpCircle,
  Cloud,
  Boxes,
  Workflow,
  Activity,
  Brain,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  Rocket,
  Shield,
  CreditCard,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Help documentation structure
const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    color: "#4ade80",
    articles: [
      {
        id: "welcome",
        title: "Welcome to CloudFabric",
        content: `
# Welcome to CloudFabric

CloudFabric is your all-in-one cloud management platform. We help you migrate, design, automate, and monitor your AWS infrastructure with ease.

## What can you do with CloudFabric?

- **CloudMigrate**: Upload and transfer files to Amazon S3
- **Architecture**: Design your cloud infrastructure visually
- **Automations**: Create workflows to automate repetitive tasks
- **Monitoring**: Keep an eye on your cloud resources
- **AI Advisor**: Get intelligent recommendations

## Quick Start

1. **Connect your AWS account** - Click on "AWS Config" in the sidebar
2. **Start uploading files** - Go to CloudMigrate and drag files to upload
3. **Explore your buckets** - Use the Browser tab to see your S3 contents

Need help? Contact our support team anytime!
        `,
      },
      {
        id: "aws-setup",
        title: "Connecting Your AWS Account",
        content: `
# Connecting Your AWS Account

To use CloudFabric, you'll need to connect your AWS account. Here's how:

## Step 1: Get Your AWS Credentials

1. Log into your AWS Console
2. Go to **IAM** (Identity and Access Management)
3. Click **Users** → **Add user**
4. Create a user with **Programmatic access**
5. Attach the **AmazonS3FullAccess** policy (or create a custom policy)
6. Save your **Access Key ID** and **Secret Access Key**

## Step 2: Enter Credentials in CloudFabric

1. Click **AWS Config** in the sidebar
2. Enter your Access Key ID
3. Enter your Secret Access Key
4. Select your preferred AWS Region
5. Click **Save Configuration**

## Security Tips

- Never share your AWS credentials
- Use IAM roles with minimal permissions
- Rotate your access keys regularly
- Enable MFA on your AWS account

Your credentials are encrypted and stored securely.
        `,
      },
    ],
  },
  {
    id: "cloudmigrate",
    title: "CloudMigrate",
    icon: Cloud,
    color: "#4ade80",
    articles: [
      {
        id: "uploading-files",
        title: "Uploading Files to S3",
        content: `
# Uploading Files to S3

CloudMigrate makes it easy to upload files to Amazon S3.

## How to Upload

1. Go to **CloudMigrate** in the sidebar
2. Click the **Upload** tab
3. Select your destination bucket from the dropdown
4. Drag and drop files into the upload area, or click to browse
5. Click **Upload** to start the transfer

## Supported File Types

You can upload any file type to S3, including:
- Documents (PDF, Word, Excel)
- Images (JPG, PNG, GIF)
- Videos (MP4, MOV)
- Archives (ZIP, TAR)
- And more!

## Upload Limits

- Maximum file size: 5GB per file
- No limit on number of files
- Uploads are tracked in the Transfer Log

## Tips

- Use the **Browser** tab to verify your uploads
- Check the **History** tab to see past transfers
- Large files are automatically uploaded in chunks
        `,
      },
      {
        id: "browsing-files",
        title: "Browsing Your S3 Buckets",
        content: `
# Browsing Your S3 Buckets

The Browser tab lets you explore all your S3 buckets and files.

## Navigation

- **Select a bucket** from the dropdown at the top
- **Click folders** to navigate inside them
- **Click "Back"** or use breadcrumbs to go up

## Actions

For each file, you can:
- **Download** - Click the download icon
- **Delete** - Click the trash icon (requires confirmation)

## File Icons

Different file types show different icons:
- 📁 Folders
- 🖼️ Images
- 🎬 Videos
- 🎵 Audio
- 📦 Archives
- 📄 Documents

## Tips

- Use the refresh button to see new files
- Empty folders show a message
- Deleted files cannot be recovered
        `,
      },
      {
        id: "transfer-history",
        title: "Viewing Transfer History",
        content: `
# Viewing Transfer History

The History tab shows all your past file transfers.

## Status Types

- **Completed** (green) - Transfer successful
- **Failed** (red) - Transfer encountered an error
- **Uploading** (blue) - Transfer in progress
- **Pending** (yellow) - Waiting to start

## Filtering

- Use the **search box** to find specific files
- Use the **status filter** to show only certain types
- Results are paginated for large histories

## Actions

- **Download** - Re-download completed files
- **Delete** - Remove the transfer record

## Tips

- Failed transfers show error messages
- You can retry failed uploads from the Upload tab
        `,
      },
    ],
  },
  {
    id: "architecture",
    title: "Architecture Designer",
    icon: Boxes,
    color: "#a78bfa",
    articles: [
      {
        id: "design-basics",
        title: "Designing Your Infrastructure",
        content: `
# Designing Your Infrastructure

The Architecture Designer lets you visually plan your AWS infrastructure.

## Getting Started

1. Go to **Architecture** in the sidebar
2. You'll see a blank canvas
3. Drag resources from the left panel onto the canvas
4. Connect resources by dragging from one to another

## Available Resources

**Compute**
- EC2 Instance - Virtual servers
- Lambda - Serverless functions
- ECS Container - Docker containers

**Storage**
- S3 Bucket - Object storage
- EBS Volume - Block storage
- EFS - Elastic file system

**Database**
- RDS - Relational databases
- DynamoDB - NoSQL database
- ElastiCache - In-memory cache

**Networking**
- VPC - Virtual private cloud
- Load Balancer - Traffic distribution
- CloudFront - CDN

**Security**
- IAM Role - Access management
- Security Group - Firewall rules
- WAF - Web application firewall

## Tips

- Click a resource to see its properties
- Use the minimap to navigate large designs
- Save your work frequently!
        `,
      },
      {
        id: "saving-exporting",
        title: "Saving and Exporting",
        content: `
# Saving and Exporting

Keep your architecture designs safe and share them with your team.

## Saving

- Click the **Save** button in the toolbar
- Your design is saved to your account
- Access saved designs anytime

## Exporting

- Click the **Export** button
- Downloads as a JSON file
- Can be imported later or shared

## Deploying

- Click **Deploy** to create resources in AWS
- Review the resources before confirming
- Deployment creates real AWS resources (charges may apply)

## Tips

- Name your architectures descriptively
- Export before making major changes
- Test in a development account first
        `,
      },
    ],
  },
  {
    id: "cloudflow",
    title: "CloudFlow",
    icon: Workflow,
    color: "#f59e0b",
    articles: [
      {
        id: "cloudflow-intro",
        title: "Introduction to CloudFlow",
        content: `
# Introduction to CloudFlow

CloudFlow is a powerful visual workflow builder that lets you orchestrate cloud services across **AWS**, **Google Cloud**, **Azure**, and **Oracle Cloud** - all from one interface.

## What is CloudFlow?

CloudFlow is a drag-and-drop workflow automation tool that connects:
- **140+ cloud service nodes** across 4 major providers
- **Local file operations** for data processing
- **Logic nodes** for conditional branching
- **Generic utilities** like HTTP requests and Slack notifications

## Key Features

- **Visual Builder** - Drag nodes onto a canvas and connect them
- **Multi-Cloud** - AWS, GCP, Azure, and Oracle in one workflow
- **Real-time Execution** - Run workflows and see results instantly
- **Save & Export** - Save workflows and export as JSON

## Use Cases

- Sync files between cloud providers
- Automate backups across regions
- Process data through multiple services
- Trigger actions based on events
- Build complex ETL pipelines
        `,
      },
      {
        id: "cloudflow-getting-started",
        title: "Getting Started with CloudFlow",
        content: `
# Getting Started with CloudFlow

Build your first workflow in minutes.

## Step 1: Open CloudFlow

Navigate to **CloudFlow** in the sidebar.

## Step 2: Add a Trigger

Every workflow starts with a trigger:
- **Manual Trigger** - Start with a button click
- **Schedule (Cron)** - Run on a schedule
- **Webhook** - Trigger via HTTP request

Drag a trigger from the sidebar onto the canvas.

## Step 3: Add Action Nodes

Expand a cloud provider (AWS, GCP, Azure, Oracle) and drag action nodes:
- **Compute** - EC2, Lambda, VMs, Functions
- **Storage** - S3, Cloud Storage, Blob Storage
- **Database** - RDS, DynamoDB, Firestore, Cosmos DB
- **And more!**

## Step 4: Connect Nodes

Click and drag from one node's output to another's input to create connections.

## Step 5: Configure Nodes

Click a node to open its configuration panel. Fill in required fields like:
- Bucket names
- Instance IDs
- SQL queries
- API endpoints

## Step 6: Run Your Workflow

Click **Run Flow** to execute. Watch the nodes light up as they process!
        `,
      },
      {
        id: "cloudflow-providers",
        title: "Supported Cloud Providers",
        content: `
# Supported Cloud Providers

CloudFlow supports 4 major cloud providers with 140+ nodes.

## AWS (Amazon Web Services)

| Category | Services |
|----------|----------|
| Compute | EC2, EKS, Lambda |
| Storage | S3, EBS, EFS |
| Database | RDS, DynamoDB, Redshift |
| Networking | VPC, Route 53, API Gateway, CloudFront |
| Integration | SNS, SQS, EventBridge, SES, Step Functions |
| AI/ML | Bedrock, SageMaker, Rekognition, Comprehend |
| Management | CloudWatch, CloudFormation |

## Google Cloud

| Category | Services |
|----------|----------|
| Compute | Compute Engine, GKE, Cloud Functions, Cloud Run |
| Storage | Cloud Storage, Persistent Disk, Filestore |
| Database | Cloud SQL, Firestore, BigQuery |
| Integration | Pub/Sub, Eventarc, Cloud Tasks |
| AI/ML | Vertex AI, Gemini, Vision API, Speech |

## Microsoft Azure

| Category | Services |
|----------|----------|
| Compute | Virtual Machines, AKS, Functions, Container Apps |
| Storage | Blob Storage, Managed Disk, File Storage |
| Database | SQL Database, Cosmos DB |
| Integration | Event Grid, Service Bus, Logic Apps |
| AI/ML | Azure OpenAI, Computer Vision, Speech |

## Oracle Cloud

| Category | Services |
|----------|----------|
| Compute | Virtual Machine, OKE, OCI Functions |
| Storage | Object Storage, Block Volume, File Storage |
| Database | ATP, ADW, NoSQL |
| Analytics | Big Data, Streaming, Data Integration |
| AI/ML | Data Science, AI Vision, Speech |
        `,
      },
      {
        id: "cloudflow-local-files",
        title: "Working with Local Files",
        content: `
# Working with Local Files

CloudFlow includes powerful local file operations for data processing.

## Available File Nodes

| Node | Description |
|------|-------------|
| **Read File** | Read contents from a local file |
| **Write File** | Write contents to a local file |
| **Delete File** | Delete a local file |
| **Copy File** | Copy a file to another location |
| **Move File** | Move/rename a file |
| **File Exists** | Check if a file exists |
| **List Directory** | List files in a directory |
| **Read JSON** | Read and parse a JSON file |
| **Write JSON** | Write data as JSON |
| **Read CSV** | Read and parse a CSV file |
| **Write CSV** | Write data as CSV |

## Common Use Cases

### Process a CSV and Upload to S3
1. **Read CSV File** - Load local data
2. **Transform Data** - Process with JavaScript
3. **S3 Upload** - Send to cloud storage

### Download, Process, Re-upload
1. **S3 Download** - Get file from cloud
2. **Write File** - Save locally
3. **Read JSON** - Parse the data
4. **Transform** - Modify as needed
5. **Write JSON** - Save results
6. **S3 Upload** - Send back to cloud

## Tips

- Use **UTF-8** encoding for text files
- Enable **Create Directory** when writing to new paths
- Use **glob patterns** to filter directory listings
        `,
      },
      {
        id: "cloudflow-logic",
        title: "Logic & Control Flow",
        content: `
# Logic & Control Flow

Use logic nodes to create conditional workflows.

## If/Else Node

Branch your workflow based on conditions.

**Condition Types:**
- Equals / Not Equals
- Greater Than / Less Than
- Contains
- Is Empty / Is Not Empty

**Example:** Check if a file size is greater than 1MB, then choose different processing paths.

## Wait Node

Pause workflow execution for a specified duration.

**Use Cases:**
- Rate limiting API calls
- Waiting for async operations
- Scheduled delays between steps

## Transform Data Node

Process data using JavaScript code.

**Example:**
\`\`\`javascript
// Filter items with price > 100
return data.filter(item => item.price > 100);
\`\`\`

**Tips:**
- Use \`data\` variable to access input
- Return the transformed result
- Handle errors gracefully
        `,
      },
      {
        id: "cloudflow-tips",
        title: "Tips & Best Practices",
        content: `
# Tips & Best Practices

Get the most out of CloudFlow with these tips.

## Workflow Design

- **Start simple** - Build incrementally
- **Test often** - Run after each change
- **Name clearly** - Use descriptive flow names
- **Document** - Add descriptions to complex nodes

## Performance

- **Minimize nodes** - Combine operations when possible
- **Use filters** - Don't process unnecessary data
- **Parallel paths** - Split independent operations

## Error Handling

- **Check outputs** - Verify each node's result
- **Use conditions** - Handle error cases with If/Else
- **Log important data** - Use Transform nodes to log

## Security

- **Don't hardcode secrets** - Use environment variables
- **Minimal permissions** - Use least-privilege IAM roles
- **Audit regularly** - Review workflow access

## Multi-Cloud Tips

- **Consistent naming** - Use same conventions across providers
- **Region awareness** - Consider data residency
- **Cost optimization** - Compare pricing across providers
        `,
      },
    ],
  },
  {
    id: "automations",
    title: "Automations",
    icon: Activity,
    color: "#f472b6",
    articles: [
      {
        id: "workflow-basics",
        title: "Creating Workflows",
        content: `
# Creating Workflows

Automations help you automate repetitive cloud tasks.

## What is a Workflow?

A workflow is a series of actions that run automatically based on a trigger.

## Trigger Types

**Schedule-based**
- Run at specific times (e.g., daily at midnight)
- Uses cron expressions
- Great for backups and reports

**Event-based**
- Run when something happens
- Examples: new user signup, file upload, cost threshold
- Instant response to changes

## Creating a Workflow

1. Click **New Workflow**
2. Give it a name and description
3. Choose a trigger type
4. Define the actions to perform
5. Save and activate

## Tips

- Start with simple workflows
- Test before activating
- Monitor success rates
        `,
      },
      {
        id: "managing-workflows",
        title: "Managing Workflows",
        content: `
# Managing Workflows

Keep your automations running smoothly.

## Workflow Status

- **Active** - Running and responding to triggers
- **Paused** - Temporarily disabled

## Actions

- **Run Now** - Manually trigger the workflow
- **Pause/Activate** - Toggle the status
- **Edit** - Modify the workflow
- **Delete** - Remove permanently

## Monitoring

- View total runs
- Check success rate
- See last and next run times

## Tips

- Pause workflows before editing
- Check logs for failed runs
- Set up alerts for failures
        `,
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring",
    icon: Activity,
    color: "#fb923c",
    articles: [
      {
        id: "dashboard-overview",
        title: "Understanding the Dashboard",
        content: `
# Understanding the Dashboard

The Monitoring dashboard gives you a real-time view of your cloud health.

## Metrics

**CPU Usage**
- Shows processor utilization
- High values may indicate need for scaling

**Memory**
- RAM usage across services
- Watch for memory leaks

**Storage**
- Disk space utilization
- Plan for expansion when high

**Network I/O**
- Data transfer rates
- Helps identify bottlenecks

## Service Health

Shows the status of each service:
- **Healthy** (green) - Operating normally
- **Warning** (yellow) - Needs attention
- **Critical** (red) - Immediate action required

## Tips

- Refresh regularly for latest data
- Set up alerts for critical thresholds
- Review trends over time
        `,
      },
      {
        id: "alerts",
        title: "Setting Up Alerts",
        content: `
# Setting Up Alerts

Get notified when something needs your attention.

## Alert Types

- **Critical** - Immediate action required
- **Warning** - Should be addressed soon
- **Info** - Informational notices

## Notification Channels

- Email notifications
- Slack integration (coming soon)
- SMS alerts (coming soon)

## Best Practices

- Set realistic thresholds
- Don't create too many alerts
- Review and tune regularly
- Acknowledge alerts promptly

## Tips

- Start with essential alerts only
- Gradually add more as needed
- Document your alert responses
        `,
      },
    ],
  },
  {
    id: "ai-advisor",
    title: "AI Advisor",
    icon: Brain,
    color: "#22d3ee",
    articles: [
      {
        id: "using-ai",
        title: "Getting AI Recommendations",
        content: `
# Getting AI Recommendations

The AI Advisor helps you optimize your cloud infrastructure.

## What Can AI Help With?

- Cost optimization suggestions
- Security best practices
- Performance improvements
- Architecture recommendations
- Troubleshooting issues

## How to Use

1. Go to **AI Advisor** in the sidebar
2. Type your question in the chat
3. Get instant recommendations
4. Follow up with more questions

## Example Questions

- "How can I reduce my S3 costs?"
- "What's the best instance type for my workload?"
- "How do I secure my RDS database?"
- "Why is my Lambda function slow?"

## Tips

- Be specific in your questions
- Provide context about your setup
- Ask follow-up questions
- Implement suggestions gradually
        `,
      },
    ],
  },
  {
    id: "billing",
    title: "Billing & Plans",
    icon: CreditCard,
    color: "#fbbf24",
    articles: [
      {
        id: "plans",
        title: "Available Plans",
        content: `
# Available Plans

Choose the plan that fits your needs.

## Free Tier

- 5GB storage transfer
- Basic monitoring
- Community support
- 1 team member

## Pro Plan

- 100GB storage transfer
- Advanced monitoring
- Priority support
- 5 team members
- Automations

## Enterprise

- Unlimited transfer
- Custom monitoring
- Dedicated support
- Unlimited team members
- All features
- SLA guarantee

## Upgrading

1. Go to **Billing** in the sidebar
2. Click **Upgrade Plan**
3. Select your new plan
4. Enter payment details
5. Confirm upgrade

Changes take effect immediately.
        `,
      },
      {
        id: "usage",
        title: "Understanding Usage",
        content: `
# Understanding Usage

Track your CloudFabric usage and costs.

## What Counts as Usage?

- **Storage Transfer** - Data uploaded to S3
- **API Calls** - Requests to AWS services
- **Automations** - Workflow executions

## Viewing Usage

1. Go to **Billing** in the sidebar
2. See your current usage
3. View usage history
4. Download invoices

## Tips

- Monitor usage regularly
- Set up usage alerts
- Upgrade before hitting limits
- Contact support for custom needs
        `,
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: Shield,
    color: "#ef4444",
    articles: [
      {
        id: "best-practices",
        title: "Security Best Practices",
        content: `
# Security Best Practices

Keep your cloud infrastructure secure.

## Account Security

- Use strong passwords
- Enable two-factor authentication
- Review team member access regularly
- Log out from shared devices

## AWS Security

- Use IAM roles with minimal permissions
- Rotate access keys regularly
- Enable CloudTrail logging
- Use VPCs for network isolation

## Data Security

- Encrypt sensitive data
- Use S3 bucket policies
- Enable versioning for important files
- Regular backups

## Tips

- Review security settings monthly
- Stay updated on AWS security features
- Report suspicious activity immediately
        `,
      },
    ],
  },
];

export default function HelpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("getting-started");
  const [selectedArticle, setSelectedArticle] = useState(helpSections[0].articles[0]);

  const filteredSections = searchQuery
    ? helpSections.map((section) => ({
        ...section,
        articles: section.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((section) => section.articles.length > 0)
    : helpSections;


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
        <div className="w-52 shrink-0" />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Header */}
          <header className="shrink-0 border-b border-border/50">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Help Center</h1>
                    <p className="text-xs text-muted-foreground">
                      Documentation and guides for CloudFabric
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a href="http://localhost:6081" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2">
                      <BookOpen className="w-4 h-4" />
                      Full Documentation
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </a>
                  <Button variant="outline" className="gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-72 border-r border-border/50 bg-card/30 overflow-y-auto">
              <div className="p-4">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search help..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-accent border-border"
                  />
                </div>

                {/* Sections */}
                <div className="space-y-1">
                  {filteredSections.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === section.id ? null : section.id
                          )
                        }
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <section.icon
                            className="w-4 h-4"
                            style={{ color: section.color }}
                          />
                          <span className="text-sm font-medium">{section.title}</span>
                        </div>
                        {expandedSection === section.id ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {expandedSection === section.id && (
                        <div className="ml-6 mt-1 space-y-1">
                          {section.articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => setSelectedArticle(article)}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                selectedArticle.id === article.id
                                  ? "bg-accent text-foreground"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              {article.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold text-foreground mb-6 pb-2 border-b border-border">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-terminal-cyan rounded-full" />
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-muted-foreground mb-4 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 mb-4 ml-4">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="space-y-2 mb-4 ml-4 list-decimal list-inside">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-muted-foreground flex items-start gap-2">
                        <span className="text-terminal-cyan mt-1.5">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="text-terminal-cyan not-italic">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 bg-accent rounded text-terminal-green font-mono text-sm">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="p-4 bg-accent/50 rounded-lg border border-border overflow-x-auto mb-4">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-terminal-cyan pl-4 py-2 my-4 bg-accent/30 rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        className="text-terminal-cyan hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    hr: () => <hr className="my-8 border-border" />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full border-collapse border border-border rounded-lg">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border bg-accent/50 px-4 py-2 text-left font-semibold text-foreground">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-4 py-2 text-muted-foreground">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {selectedArticle.content}
                </ReactMarkdown>

                {/* Helpful? */}
                <div className="mt-12 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">Was this article helpful?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Yes, thanks!</Button>
                    <Button variant="outline" size="sm">Not really</Button>
                  </div>
                </div>

                {/* Related Articles */}
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Related Articles</h3>
                  <div className="space-y-2">
                    {helpSections
                      .flatMap((s) => s.articles)
                      .filter((a) => a.id !== selectedArticle.id)
                      .slice(0, 3)
                      .map((article) => (
                        <button
                          key={article.id}
                          onClick={() => setSelectedArticle(article)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          {article.title}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
