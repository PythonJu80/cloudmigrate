# CloudFlow Implementation TODO

> Working document for CloudFlow persistence and multi-user workflow support

---

## 🎯 Current Goal
Enable users to save, load, and edit multiple workflows with full persistence to the database.

---

## Phase 1: Database Schema (Prisma) ✅ DONE

### Changes Made

**`CloudFlow` model updates:**
- [x] Added `userId` + `user` relation (owner of the flow)
- [x] Added `isShared` boolean (visible to all tenant users)
- [x] Added `version` integer (for flow versioning)
- [x] Added `viewport` string (JSON for canvas position)
- [x] Removed `createdBy` string (replaced by proper relation)
- [x] Added `secrets` relation to `FlowSecret`

**`User` model updates:**
- [x] Added `cloudFlows` relation

**New `FlowSecret` model:**
- [x] Junction table linking flows to tenant secrets
- [x] `flowId` → which flow uses the secret
- [x] `secretKey` → reference to tenant secret key (not value!)
- [x] `nodeId` → optional: which specific node uses it
- [x] `configField` → optional: which config field uses it

### Next Step
```bash
npx prisma migrate dev --name add-cloudflow-user-relation
```

---

## Phase 2: API Routes ✅ DONE

### Created Endpoints

**`/api/cloudflow/route.ts`**
- [x] `GET /api/cloudflow` - List user's flows + shared flows
- [x] `POST /api/cloudflow` - Create new flow

**`/api/cloudflow/[flowId]/route.ts`**
- [x] `GET /api/cloudflow/[id]` - Get single flow with parsed JSON
- [x] `PUT /api/cloudflow/[id]` - Full update (auto-increments version)
- [x] `PATCH /api/cloudflow/[id]` - Partial update
- [x] `DELETE /api/cloudflow/[id]` - Delete flow (owner only)

**`/api/cloudflow/[flowId]/run/route.ts`**
- [x] `POST /api/cloudflow/[id]/run` - Execute flow via real executor

**`/api/cloudflow/[flowId]/executions/route.ts`**
- [x] `GET /api/cloudflow/[id]/executions` - Get execution history with pagination

### Access Control
- Users see their own flows + shared flows in tenant
- Only owners can update/delete flows
- Shared flows can be viewed and executed by all tenant users

---

## Phase 3: UI Updates ✅ DONE

### Flow Management
- [x] View mode toggle (list vs editor)
- [x] `loadFlowList()` - fetch all user flows
- [x] `loadFlow(id)` - load single flow into editor
- [x] `createNewFlow()` - create and open new flow
- [x] `deleteFlow(id)` - delete with confirmation
- [x] `backToList()` - return to list with unsaved warning
- [x] URL params support (`?id=xxx`)

### Canvas Page
- [x] Load flow from database on mount
- [x] Manual save button persists to DB via API
- [x] Run button calls real executor API
- [x] Show execution status on nodes (running/success/error)
- [x] Track dirty state for unsaved changes

### Properties Panel
- [x] Config fields use controlled values
- [x] `updateNodeConfig()` helper persists changes
- [x] Select, textarea, and input fields all wired up
- [x] Execution output display section added
- [x] Shows last run outputs with success/error styling

---

## Phase 4: Secrets Integration

### Per-Flow Secrets
- [ ] Flows can reference tenant secrets by key
- [ ] Secret values never sent to client
- [ ] Executor injects secrets at runtime
- [ ] UI shows secret picker (not values)

---

## 📋 Implementation Order

1. **Prisma schema updates** ← CURRENT
2. Run migration
3. Create API routes
4. Update UI to use APIs
5. Wire up config persistence
6. Add secrets integration

---

## Notes

- Flows belong to users, but secrets belong to tenants
- Users can only see their own flows (unless shared)
- Execution history is per-flow, visible to flow owner
