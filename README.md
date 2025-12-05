# CloudMigrate - AWS Migration SaaS

A production-ready, multi-tenant SaaS application for migrating local files and directories to AWS S3. Built with Next.js 14, featuring a CLI-inspired dark UI with AI-powered data analysis and knowledge graph visualization.

![CloudMigrate Dashboard](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38B2AC?style=flat-square&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5.6-2D3748?style=flat-square&logo=prisma)
![Neo4j](https://img.shields.io/badge/Neo4j-5.15-008CC1?style=flat-square&logo=neo4j)

## Features

### Core Features
- 🏢 **Multi-tenant Architecture** - Isolated data per organization with role-based access (Admin/User)
- ☁️ **AWS S3 Integration** - Direct uploads with presigned URLs, multipart support
- 🔐 **Cross-Account Support** - Use customer AWS accounts via STS AssumeRole
- 🖥️ **CLI-Style UI** - Terminal-inspired dark interface with keyboard shortcuts
- 📊 **Real-time Progress** - Live upload progress with transfer logs
- 👥 **Team Management** - Add team members with Admin or User roles
- 📁 **File Browser** - Browse and manage S3 bucket contents
- 📜 **Transfer History** - Track all file transfers with status

### AI & Analytics
- 🤖 **AI Data Assistant** - Chat with your data using OpenAI (BYOK - Bring Your Own Key)
- 📈 **Smart Visualizations** - AI generates charts, tables, and metrics from natural language
- 🔗 **Knowledge Graph** - Neo4j-powered graph database for file relationships
- 🗺️ **Graph Visualization** - Interactive graph viewer with dependency analysis

### CloudFlow - Visual Workflow Builder
- 🔄 **Drag & Drop Canvas** - Visual workflow builder with React Flow
- 🤖 **AI Workflow Agent** - Chat with AI to generate workflows automatically
- 📦 **Example Templates** - Pre-built workflow templates (S3 Backup, Lambda Alerts, ETL Pipelines)
- ☁️ **Multi-Cloud Nodes** - AWS, GCP, Azure, Oracle Cloud integrations
- 🧠 **AI/ML Nodes** - LLM completion and chat nodes for AI-powered workflows
- ⚡ **Logic Nodes** - Conditions, transforms, delays for workflow control

### Billing & Monitoring
- 💳 **Stripe Billing** - Full subscription management (Free/Business/Enterprise tiers)
- 📊 **Usage Metering** - Track bytes transferred and graph nodes per tenant
- 📉 **Grafana Dashboards** - Real-time AWS and application metrics
- 🔔 **Prometheus Metrics** - CloudWatch metrics via YACE exporter

### Local Agent
- 🖥️ **Go Agent** - Lightweight agent for scanning local filesystems
- 📂 **Directory Scanning** - Scan and catalog local files before migration
- 🔄 **Real-time Sync** - Agent communicates with SaaS for coordinated uploads

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui, Lucide Icons, Recharts |
| **Database** | Prisma ORM with SQLite (dev) / PostgreSQL (prod) |
| **Graph DB** | Neo4j 5.15 with APOC & Graph Data Science |
| **Auth** | NextAuth.js with credentials provider |
| **AWS** | @aws-sdk/client-s3, @aws-sdk/client-sts |
| **AI** | OpenAI GPT-4 (BYOK), Streaming responses |
| **Billing** | Stripe (Subscriptions, Customer Portal, Webhooks) |
| **Monitoring** | Prometheus, Grafana, YACE (CloudWatch Exporter) |
| **Agent** | Go 1.21+ (local filesystem scanner) |
| **Container** | Docker & Docker Compose |

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/PythonJu80/cloudmigrate.git
cd cloudmigrate

# Copy environment variables
cp .env.example .env

# Start with Docker Compose
docker compose up -d

# Open http://localhost:6080
```

### Manual Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize the database
npm run db:generate
npm run db:push

# Start development server
npm run dev

# Open http://localhost:3000
```

## Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AWS Credentials
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"

# Neo4j (Graph Database)
NEO4J_URI="bolt://localhost:6086"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="cloudmigrate2025"

# Stripe (Billing) - See docs/STRIPE_SETUP.md
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# OpenAI (optional - tenants can BYOK in settings)
OPENAI_API_KEY=""

# Grafana
NEXT_PUBLIC_GRAFANA_URL="http://localhost:6091"
```

## Project Structure

```
cloudmigrate/
├── agent/                   # Go agent for local scanning
│   ├── cmd/main.go          # Agent entry point
│   └── internal/            # Scanner & API client
├── docs/
│   └── STRIPE_SETUP.md      # Stripe integration guide
├── monitoring/
│   ├── grafana/             # Dashboards & provisioning
│   ├── prometheus.yml       # Metrics scraping config
│   └── yace-config.yml      # AWS CloudWatch exporter
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── agent/       # Agent authentication & scanning
│   │   │   ├── auth/        # Authentication
│   │   │   ├── billing/     # Stripe checkout, portal, webhooks
│   │   │   ├── browser/     # File browser & download
│   │   │   ├── chat/        # AI chat & streaming
│   │   │   ├── graph/       # Neo4j graph operations
│   │   │   ├── files/       # Local file scanning
│   │   │   └── ...          # Other API routes
│   │   ├── billing/         # Subscription management page
│   │   ├── browser/         # S3 file browser page
│   │   ├── chat/            # AI data assistant page
│   │   ├── history/         # Transfer history page
│   │   ├── settings/        # Settings & team pages
│   │   └── upload/          # Upload page
│   ├── components/
│   │   ├── chat/            # AI chat components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── graph-viewer-modal.tsx
│   │   ├── metrics-panel.tsx
│   │   └── sidebar.tsx
│   └── lib/
│       ├── aws/s3.ts        # AWS SDK wrappers
│       ├── neo4j.ts         # Neo4j driver
│       ├── graph-usage.ts   # Usage tracking
│       └── prompts/         # AI system prompts
├── docker-compose.yml       # Full stack (Neo4j, Prometheus, Grafana)
└── package.json
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Upload files, manage buckets, configure AWS, add/remove team members |
| **User** | View files, browse buckets, use AI chatbot (read-only) |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/register` | POST | Create new account |
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/buckets` | GET/POST | List & save S3 buckets |
| `/api/browser` | GET/DELETE | Browse & delete S3 objects |
| `/api/browser/download` | GET | Generate download URLs |
| `/api/config` | GET/POST | AWS configuration |
| `/api/history` | GET/DELETE | Transfer history |
| `/api/stats` | GET | Dashboard statistics |
| `/api/team` | GET/POST/PATCH/DELETE | Team management |
| `/api/upload` | POST/PATCH | Upload files |
| `/api/chat` | POST | AI chat completions |
| `/api/chat/stream` | POST | Streaming AI responses |
| `/api/billing` | GET | Current plan & usage |
| `/api/billing/checkout` | POST | Create Stripe checkout |
| `/api/billing/portal` | POST | Customer portal session |
| `/api/billing/webhook` | POST | Stripe webhook handler |
| `/api/graph` | GET/POST | Neo4j graph operations |
| `/api/graph/usage` | GET | Graph node usage stats |
| `/api/agent/auth` | POST | Agent authentication |
| `/api/agent/scan` | POST | Submit scan results |
| `/api/files/scan` | POST | Scan local directories |

## Database Schema

- **Tenant** - Organizations with AWS config and usage limits
- **User** - Users with roles (ADMIN, USER)
- **Bucket** - Saved S3 bucket configurations
- **Transfer** - File transfer records with status
- **AuditLog** - Compliance audit trail

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `D` | Dashboard |
| `U` | Upload |
| `B` | File Browser |
| `H` | Transfer History |
| `C` | AWS Config |
| `T` | Team |
| `S` | Settings |

## Docker Services

The full stack runs with Docker Compose:

| Service | Port | Description |
|---------|------|-------------|
| **App** | 6080 | Next.js application |
| **Neo4j Browser** | 6085 | Graph database UI |
| **Neo4j Bolt** | 6086 | Graph database protocol |
| **Prometheus** | 6090 | Metrics collection |
| **Grafana** | 6091 | Metrics dashboards |
| **YACE** | 6092 | AWS CloudWatch exporter |

```bash
# Start all services
docker compose --profile dev up -d

# View logs
docker compose logs -f dev
```

## Subscription Tiers

| Feature | Free | Business (£79/mo) | Enterprise (£299/mo) |
|---------|------|-------------------|----------------------|
| Graph Nodes | 1,000 | 50,000 | Unlimited |
| Team Members | 3 | 10 | Unlimited |
| AI Chat | Basic | Full | Full + Priority |
| Support | Community | Email | Dedicated |

## Roadmap

- [x] Multi-tenant architecture
- [x] Team management
- [x] File browser
- [x] Transfer history
- [x] Stripe billing integration
- [x] AI chatbot for data queries
- [x] Neo4j knowledge graph
- [x] Grafana monitoring
- [x] Go agent for local scanning
- [x] CloudFlow visual workflow builder
- [x] AI Workflow Agent with chat interface
- [x] Example workflow templates
- [ ] Light/dark theme toggle
- [ ] S3 Transfer Acceleration
- [ ] Glacier archival support
- [ ] Webhook notifications

## License

**Proprietary** - All rights reserved. This software may not be used, copied, modified, or distributed without explicit permission. See [LICENSE](LICENSE) for details.

## Author

Built by [PythonJu80](https://github.com/PythonJu80)
