# CloudFabric™ Development Roadmap

> Transform CloudMigrate into a full AWS abstraction layer for non-technical users.

---

## Current State ✅

- [x] Multi-tenant SaaS with RBAC
- [x] S3 transfers via Go agent
- [x] Prometheus/Grafana metrics
- [x] Neo4j knowledge graph + RAG
- [x] BYOK (AWS + OpenAI)
- [x] AI Chat Assistant
- [x] Dockerised microservices

---

## Phase 1: Foundation Hardening (Week 1-2)

### 1.1 Backend Infrastructure
- [ ] Create unified AWS SDK wrapper (`src/lib/aws/client.ts`)
  - Normalize all AWS calls through single interface
  - Add retry logic, error handling, rate limiting
  - Support multi-region operations
- [ ] Add Redis for job queues and caching
  - Add to docker-compose
  - Create queue abstraction layer
- [ ] Create Event Bus system
  - `src/lib/events/bus.ts` - publish/subscribe pattern
  - Event types: `resource.created`, `resource.deleted`, `workflow.triggered`, etc.
- [ ] Expand Neo4j schema for cloud resources
  - Node types: `AWSResource`, `VPC`, `EC2`, `S3Bucket`, `Lambda`, `RDSInstance`
  - Edge types: `DEPENDS_ON`, `CONTAINS`, `COMMUNICATES_WITH`, `LOGS_TO`

### 1.2 Database Schema Updates
- [ ] Add Prisma models:
  ```prisma
  model CloudResource {
    id            String   @id @default(cuid())
    tenantId      String
    type          String   // EC2, S3, Lambda, RDS, VPC, etc.
    arn           String   @unique
    name          String
    region        String
    status        String   // ACTIVE, STOPPED, TERMINATED, PENDING
    config        String   // JSON - service-specific config
    cost          Float    @default(0)
    tags          String?  // JSON
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  }

  model Architecture {
    id            String   @id @default(cuid())
    tenantId      String
    name          String
    description   String?
    canvas        String   // JSON - visual layout
    resources     String   // JSON - resource definitions
    status        String   // DRAFT, DEPLOYED, ARCHIVED
    estimatedCost Float    @default(0)
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  }

  model Workflow {
    id            String   @id @default(cuid())
    tenantId      String
    name          String
    trigger       String   // CRON, WEBHOOK, EVENT
    triggerConfig String   // JSON
    steps         String   // JSON - workflow steps
    enabled       Boolean  @default(true)
    lastRun       DateTime?
    createdAt     DateTime @default(now())
  }
  ```

### 1.3 Navigation Restructure
- [ ] Update sidebar with new sections:
  - Cloud Migrate (existing)
  - Cloud Architecture (new)
  - Cloud Automations (new)
  - Cloud Monitoring (existing, expanded)
  - Cloud AI Advisor (existing chat, enhanced)
  - Knowledge Graph (new visualization)

---

## Phase 2: Cloud Architecture Module (Week 3-5)

### 2.1 Visual Canvas
- [ ] Install React Flow or similar (`npm install reactflow`)
- [ ] Create `/app/architecture/page.tsx`
- [ ] Build canvas component with:
  - Drag-and-drop resource nodes
  - Connection lines between resources
  - Zoom/pan controls
  - Grid snapping
- [ ] Resource palette sidebar:
  - Compute: EC2, Lambda, ECS
  - Storage: S3, EBS, Glacier
  - Database: RDS, DynamoDB, Aurora
  - Network: VPC, Subnet, NAT, ALB
  - Security: IAM Role, Security Group

### 2.2 Resource Modules (Start with 5 core)
Each module needs:
- Frontend component (node on canvas)
- Config form (settings panel)
- AWS API wrapper (create/update/delete)
- Cost estimator
- Validation rules

#### Module: S3 Bucket
- [ ] `src/lib/aws/modules/s3.ts`
- [ ] Config: name, region, versioning, encryption, lifecycle
- [ ] Auto-add: bucket policy, CORS if needed
- [ ] Cost: storage class pricing

#### Module: EC2 Instance
- [ ] `src/lib/aws/modules/ec2.ts`
- [ ] Config: instance type, AMI, key pair, storage
- [ ] Auto-add: security group, IAM role
- [ ] Cost: instance + EBS pricing

#### Module: VPC
- [ ] `src/lib/aws/modules/vpc.ts`
- [ ] Config: CIDR, subnets, NAT, IGW
- [ ] Auto-add: route tables, NACLs
- [ ] Visual: show subnet layout

#### Module: Lambda
- [ ] `src/lib/aws/modules/lambda.ts`
- [ ] Config: runtime, memory, timeout, triggers
- [ ] Auto-add: execution role, CloudWatch logs
- [ ] Cost: invocation + duration pricing

#### Module: RDS
- [ ] `src/lib/aws/modules/rds.ts`
- [ ] Config: engine, instance class, storage, multi-AZ
- [ ] Auto-add: subnet group, security group
- [ ] Cost: instance + storage pricing

### 2.3 Architecture Engine
- [ ] `src/lib/architecture/engine.ts`
  - Validate architecture (dependencies, security)
  - Calculate total estimated cost
  - Generate IAM policies
  - Generate security groups
  - Detect conflicts/issues
- [ ] `src/lib/architecture/deployer.ts`
  - Deploy architecture to AWS (ordered by dependencies)
  - Track deployment status
  - Rollback on failure
- [ ] `src/lib/architecture/terraform.ts` (optional)
  - Export architecture as Terraform HCL
  - Import existing Terraform

### 2.4 Architecture API
- [ ] `POST /api/architecture` - Create new architecture
- [ ] `GET /api/architecture` - List architectures
- [ ] `GET /api/architecture/[id]` - Get architecture details
- [ ] `PUT /api/architecture/[id]` - Update architecture
- [ ] `POST /api/architecture/[id]/deploy` - Deploy to AWS
- [ ] `POST /api/architecture/[id]/validate` - Validate without deploying
- [ ] `GET /api/architecture/[id]/cost` - Get cost estimate
- [ ] `GET /api/architecture/[id]/export` - Export as Terraform/CloudFormation

---

## Phase 3: Cloud Automations (Week 6-7)

### 3.1 Workflow Engine
- [ ] `src/lib/workflows/engine.ts`
  - Parse workflow definitions
  - Execute steps in order
  - Handle conditionals and loops
  - Error handling and retries
- [ ] `src/lib/workflows/triggers.ts`
  - CRON scheduler (node-cron)
  - Webhook endpoints
  - AWS event triggers (via EventBridge)
  - Manual triggers

### 3.2 Workflow Builder UI
- [ ] `/app/automations/page.tsx` - List workflows
- [ ] `/app/automations/new/page.tsx` - Visual workflow builder
- [ ] Step types:
  - AWS Action (any AWS SDK call)
  - HTTP Request
  - Condition (if/else)
  - Delay
  - Notification (Slack, email)
  - AI Decision (ask AI to decide)

### 3.3 Pre-built Templates
- [ ] "Backup EC2 to S3" workflow
- [ ] "S3 to Glacier archival" workflow
- [ ] "CloudWatch alarm → Slack" workflow
- [ ] "Auto-scale on CPU threshold" workflow
- [ ] "Nightly RDS snapshot" workflow

### 3.4 AI Workflow Generation
- [ ] Natural language → workflow
- [ ] "Back up all S3 buckets weekly" → generates workflow JSON
- [ ] User confirms → workflow created

---

## Phase 4: Enhanced Cloud Monitoring (Week 8-9)

### 4.1 Unified Dashboard
- [ ] `/app/monitoring/page.tsx` - Overview dashboard
- [ ] Widgets:
  - Resource health status
  - Cost burn rate
  - Active alerts
  - Recent events
  - Top 5 costly resources

### 4.2 Resource-Specific Monitoring
- [ ] EC2: CPU, Memory, Network, Disk
- [ ] S3: Request count, bytes transferred, errors
- [ ] Lambda: Invocations, errors, duration, throttles
- [ ] RDS: Connections, CPU, storage, IOPS
- [ ] VPC: Flow logs, NAT gateway bytes

### 4.3 Alerting System
- [ ] `src/lib/monitoring/alerts.ts`
- [ ] Alert rules engine
- [ ] Notification channels: Email, Slack, webhook
- [ ] Alert history and acknowledgment

### 4.4 Cost Monitoring
- [ ] AWS Cost Explorer integration
- [ ] Daily/weekly/monthly cost breakdown
- [ ] Cost by service, tag, resource
- [ ] Budget alerts
- [ ] Cost optimization recommendations

---

## Phase 5: Cloud AI Advisor Enhancement (Week 10-11)

### 5.1 Expanded AI Capabilities
- [ ] Architecture generation from description
- [ ] Security posture analysis
- [ ] Cost optimization suggestions
- [ ] Compliance checking (SOC2, HIPAA basics)
- [ ] Incident root cause analysis
- [ ] Documentation generation

### 5.2 AI Context Expansion
Feed AI with:
- [ ] All cloud resources (from Neo4j)
- [ ] CloudWatch metrics
- [ ] Cost data
- [ ] Architecture diagrams
- [ ] Workflow definitions
- [ ] Audit logs
- [ ] Alert history

### 5.3 AI Actions
- [ ] AI can propose architecture changes
- [ ] AI can create workflows
- [ ] AI can generate alerts
- [ ] User confirms before execution

### 5.4 New AI Prompts
- [ ] `src/lib/prompts/architect.ts` - Architecture generation
- [ ] `src/lib/prompts/security.ts` - Security analysis
- [ ] `src/lib/prompts/cost.ts` - Cost optimization
- [ ] `src/lib/prompts/incident.ts` - Incident analysis

---

## Phase 6: Knowledge Graph Visualization (Week 12)

### 6.1 Graph Explorer UI
- [ ] `/app/graph/page.tsx`
- [ ] Interactive Neo4j visualization (neovis.js already in project)
- [ ] Filter by resource type, tenant, status
- [ ] Click node → show details panel
- [ ] Show relationships and dependencies

### 6.2 Impact Analysis
- [ ] "What depends on this resource?"
- [ ] "If this fails, what breaks?"
- [ ] Visual dependency tree
- [ ] Blast radius calculation

### 6.3 Auto-Documentation
- [ ] Generate architecture docs from graph
- [ ] Export as Markdown/PDF
- [ ] Include diagrams, configs, relationships

---

## Phase 7: Polish & Monetization (Week 13-14)

### 7.1 Billing Tiers
```
FREE:
- 5 resources max
- 1 architecture
- 3 workflows
- Basic monitoring
- 100 AI queries/month

PRO ($49/mo):
- 50 resources
- 10 architectures
- Unlimited workflows
- Full monitoring
- 1000 AI queries/month
- Terraform export

ENTERPRISE ($199/mo):
- Unlimited resources
- Unlimited architectures
- Priority support
- Compliance reports
- Custom integrations
- Unlimited AI
- SSO/SAML
```

### 7.2 Usage Metering
- [ ] Track resource count per tenant
- [ ] Track AI query usage
- [ ] Track workflow executions
- [ ] Stripe usage-based billing

### 7.3 Onboarding Flow
- [ ] Guided AWS credential setup
- [ ] Resource discovery wizard
- [ ] First architecture tutorial
- [ ] Sample workflows

---

## Technical Debt & Infrastructure

### Must-Have Before Launch
- [ ] Comprehensive error handling
- [ ] Rate limiting on all APIs
- [ ] Audit logging for all AWS actions
- [ ] Backup strategy for databases
- [ ] CI/CD pipeline
- [ ] Staging environment
- [ ] Load testing

### Security Hardening
- [ ] AWS credential encryption at rest
- [ ] Least-privilege IAM policies
- [ ] API authentication on all endpoints
- [ ] Input validation everywhere
- [ ] SQL injection prevention (Prisma handles)
- [ ] XSS prevention

---

## File Structure (New)

```
src/
├── app/
│   ├── architecture/
│   │   ├── page.tsx           # Canvas view
│   │   ├── [id]/page.tsx      # Edit architecture
│   │   └── new/page.tsx       # New architecture
│   ├── automations/
│   │   ├── page.tsx           # List workflows
│   │   ├── [id]/page.tsx      # Edit workflow
│   │   └── new/page.tsx       # Workflow builder
│   ├── monitoring/
│   │   ├── page.tsx           # Dashboard
│   │   ├── alerts/page.tsx    # Alerts
│   │   └── costs/page.tsx     # Cost analysis
│   ├── graph/
│   │   └── page.tsx           # Knowledge graph explorer
│   └── api/
│       ├── architecture/
│       ├── automations/
│       ├── monitoring/
│       └── resources/
├── lib/
│   ├── aws/
│   │   ├── client.ts          # Unified AWS client
│   │   ├── modules/
│   │   │   ├── s3.ts
│   │   │   ├── ec2.ts
│   │   │   ├── vpc.ts
│   │   │   ├── lambda.ts
│   │   │   └── rds.ts
│   │   └── cost.ts            # Cost estimation
│   ├── architecture/
│   │   ├── engine.ts          # Validation & planning
│   │   ├── deployer.ts        # AWS deployment
│   │   └── terraform.ts       # Export
│   ├── workflows/
│   │   ├── engine.ts          # Execution engine
│   │   ├── triggers.ts        # Trigger handlers
│   │   └── templates.ts       # Pre-built workflows
│   ├── monitoring/
│   │   ├── metrics.ts         # CloudWatch wrapper
│   │   ├── alerts.ts          # Alert engine
│   │   └── costs.ts           # Cost Explorer wrapper
│   └── prompts/
│       ├── architect.ts
│       ├── security.ts
│       ├── cost.ts
│       └── incident.ts
└── components/
    ├── architecture/
    │   ├── canvas.tsx
    │   ├── resource-node.tsx
    │   ├── resource-palette.tsx
    │   └── config-panel.tsx
    ├── automations/
    │   ├── workflow-builder.tsx
    │   └── step-node.tsx
    └── monitoring/
        ├── dashboard-widget.tsx
        └── alert-card.tsx
```

---

## Quick Wins (Do First)

1. **Add Redis to docker-compose** (30 min)
2. **Create CloudResource Prisma model** (15 min)
3. **Build `/app/architecture/page.tsx` skeleton** (1 hr)
4. **Install React Flow** (15 min)
5. **Create S3 module wrapper** (2 hr)

---

## Success Metrics

- [ ] User can design architecture in <5 minutes
- [ ] Deploy architecture to AWS in <2 minutes
- [ ] AI can answer "what's my most expensive resource?"
- [ ] Workflow creation from natural language works 80%+ of time
- [ ] Cost estimates within 10% of actual AWS bill

---

## The Moat

AWS will never build this because:
1. Their revenue depends on complexity
2. They can't favor any service over another
3. They have no incentive to reduce your bill
4. They don't do "opinionated" defaults

You can. That's the moat.
