# Implementation Stages - Atlassian Integration

## Stage 1: API and Service Configuration (Week 1)

### Objectives
- ~~Configure authentication with Jira Cloud API~~ ✅
- Configure authentication with Bitbucket Cloud API
- ~~Create base modules following existing architecture~~ ✅ (partial — Jira only)
- ~~Validate connectivity~~ ✅ (partial — Jira only)

### Tasks

#### 1.1 Credentials Setup
```bash
# .env additions
JIRA_HOST=your-domain.atlassian.net          # ✅ Added
JIRA_EMAIL=your-email@company.com            # ✅ Added
JIRA_API_TOKEN=your-jira-api-token           # ✅ Added
JIRA_PROJECT_KEY=PROJ                        # ✅ Added

BITBUCKET_WORKSPACE=your-workspace           # ❌ Pending
BITBUCKET_USERNAME=your-username             # ❌ Pending
BITBUCKET_APP_PASSWORD=your-app-password     # ❌ Pending
# or OAuth 2.0
BITBUCKET_CLIENT_ID=                         # ❌ Pending
BITBUCKET_CLIENT_SECRET=                     # ❌ Pending
```

#### 1.2 Dependencies Installation
```bash
npm install --save jira-client               # ✅ Installed
npm install --save axios  # for Bitbucket API  # ❌ Pending
npm install --save @types/jira-client --save-dev # ✅ Installed
```

#### 1.3 Create Jira Base Module
```
src/modules/jira/
├── controller/
│   ├── jira.controller.ts          # Slack commands        ❌ Pending
│   └── jiraWeb.controller.ts       # REST endpoints        ✅ Created
├── services/
│   └── jira.services.ts                                    ✅ Created
├── repositories/
│   ├── jiraApi.repository.ts       # Jira API wrapper      ✅ Created
│   └── database/
│       └── jiraCache.dataSource.ts # Data cache            ❌ Pending
├── shared/
│   ├── constants/
│   │   └── jira.constants.ts                               ✅ Created
│   ├── interfaces/
│   │   └── jira.interfaces.ts                              ✅ Created
│   └── schemas/
│       └── jira.schemas.ts         # Zod validations       ✅ Created
└── utils/
    ├── jiraFormatters.ts           # Format output         ❌ Pending
    └── jql.builder.ts              # JQL query builder     ❌ Pending
```

#### 1.4 Create Bitbucket Base Module — ❌ Not implemented
```
src/modules/bitbucket/
├── controller/
│   ├── bitbucket.controller.ts
│   └── bitbucketWeb.controller.ts
├── services/
│   └── bitbucket.services.ts
├── repositories/
│   ├── bitbucketApi.repository.ts
│   └── database/
│       └── bitbucketCache.dataSource.ts
├── shared/
│   ├── constants/
│   │   └── bitbucket.constants.ts
│   ├── interfaces/
│   │   └── bitbucket.interfaces.ts
│   └── schemas/
│       └── bitbucket.schemas.ts
└── utils/
    └── bitbucketFormatters.ts
```

#### 1.5 TypeORM Entities — ❌ Not implemented
```typescript
// src/entities/JiraIssueCache.ts
@Entity()
export class JiraIssueCache {
  @PrimaryColumn()
  issueKey: string

  @Column('json')
  issueData: object

  @Column()
  lastUpdated: Date

  @Column()
  projectKey: string
}

// src/entities/BitbucketPRCache.ts
@Entity()
export class BitbucketPRCache {
  @PrimaryColumn()
  prId: number

  @Column()
  repoSlug: string

  @Column('json')
  prData: object

  @Column()
  lastUpdated: Date

  @Column()
  status: string // OPEN, MERGED, DECLINED
}
```

#### 1.6 First Test Endpoints
```typescript
// GET /jira/test - Test connection           ✅ Implemented
// GET /bitbucket/test - Test connection       ❌ Pending
// GET /jira/projects - List projects          ✅ Implemented (as /jira/project)
// GET /bitbucket/repositories - List repos    ❌ Pending
```

### Validation
- [x] Functional authentication with Jira
- [ ] Functional authentication with Bitbucket
- [x] Modules registered in app.ts (Jira only)
- [x] Connectivity tests passing (Jira only — 7 tests)
- [x] Logging configured (Pino with createModuleLogger)

### Estimated Time: 3-5 days

---

## Stage 2: Base Modules and Core Functionality (Week 2-3)

### Objectives
- Implement basic read functionality
- Fundamental Slack commands
- Core REST API endpoints
- Basic Redis cache

### Tasks

#### 2.1 Jira Core Functionality
```typescript
// Slack Commands
.jira issue PROJ-123           // View issue details
.jira list                     // My assigned issues
.jira search "status=Open"     // JQL search
.jira sprint                   // Current sprint issues
.jira backlog                  // View backlog

// REST Endpoints
GET /jira/issues/:issueKey
GET /jira/issues/assigned-to-me
GET /jira/issues/search?jql=...
GET /jira/sprints/active
GET /jira/projects/:projectKey
```

#### 2.2 Bitbucket Core Functionality
```typescript
// Slack Commands
.bb pr list                    // Open PRs
.bb pr REPO-123                // PR details
.bb commits main               // Latest commits
.bb branches                   // View active branches

// REST Endpoints
GET /bitbucket/pullrequests
GET /bitbucket/pullrequests/:id
GET /bitbucket/repositories/:slug/commits
GET /bitbucket/repositories/:slug/branches
```

#### 2.3 Cache Strategy
```typescript
// Redis keys pattern
jira:issue:${issueKey}          // TTL: 5 min
jira:sprint:active              // TTL: 10 min
jira:user:${userId}:issues      // TTL: 2 min
bb:pr:${prId}                   // TTL: 3 min
bb:repo:${slug}:branches        // TTL: 15 min
```

#### 2.4 Formatters and Utilities
```typescript
// jiraFormatters.ts
formatIssueForSlack(issue): string
formatIssueForWeb(issue): IssueViewModel
formatSprintSummary(sprint): string

// jql.builder.ts
class JQLBuilder {
  assignedTo(user: string): JQLBuilder
  inStatus(status: string): JQLBuilder
  inSprint(sprint: string): JQLBuilder
  build(): string
}
```

### Validation
- [ ] Basic commands working in Slack
- [ ] REST endpoints responding correctly
- [ ] Cache reducing API calls
- [ ] Consistent response formatting
- [ ] Unit tests >70%

### Estimated Time: 7-10 days

---

## Stage 3: Resource Creation and Modification (Week 4)

### Objectives
- Enable issue/PR creation from Slack
- State transitions
- Comments and updates
- Robust validations

### Tasks

#### 3.1 Jira Issue Creation
```typescript
// Commands
.jira create -t Task -s "Title" -d "Description" -a user@company.com
.jira create-from-template bug

// With AI Assistant
"Create a bug for login failing with Google OAuth"
→ AI classify → jira.create intent
```

#### 3.2 Transitions and Updates
```typescript
.jira move PROJ-123 "In Progress"
.jira assign PROJ-123 @username
.jira comment PROJ-123 "Adding context..."
.jira update PROJ-123 -p High -l backend,urgent
```

#### 3.3 Bitbucket Operations
```typescript
.bb pr create -s feature/new -t develop -title "..." -desc "..."
.bb pr approve PR-123
.bb pr comment PR-123 "LGTM"
.bb pr merge PR-123
```

#### 3.4 Validation Schemas
```typescript
// jira.schemas.ts
export const createIssueSchema = z.object({
  projectKey: z.string().min(1),
  summary: z.string().min(5).max(255),
  description: z.string().optional(),
  issueType: z.enum(['Task', 'Bug', 'Story', 'Epic']),
  priority: z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest']).optional(),
  assignee: z.string().email().optional(),
  labels: z.array(z.string()).optional(),
})
```

### Validation
- [ ] Resource creation validated
- [ ] State transitions working
- [ ] Robust error handling
- [ ] Rollback on failure
- [ ] Change audit log

### Estimated Time: 5-7 days

---

## Stage 4: Webhooks and Real-Time Notifications (Week 5)

### Objectives
- Configure Jira and Bitbucket webhooks
- Smart notification system
- Customizable filters
- Multi-channel (Slack + Web Socket.io)

### Tasks

#### 4.1 Webhook Listeners
```
src/modules/jira/webhooks/
├── jiraWebhook.controller.ts   # POST /webhooks/jira
├── handlers/
│   ├── issueCreated.handler.ts
│   ├── issueUpdated.handler.ts
│   ├── issueTransitioned.handler.ts
│   └── commentAdded.handler.ts
└── filters/
    └── webhookFilters.ts       # Filter relevant events
```

#### 4.2 Events to Capture
**Jira:**
- Issue created/updated/deleted
- Issue transitioned (state change)
- Comment added
- Sprint started/completed
- Release created

**Bitbucket:**
- PR created/updated/merged/declined
- PR approved/unapproved
- Commit pushed
- Build succeeded/failed
- Branch created/deleted

#### 4.3 Subscription System
```typescript
// Subscription entity
@Entity()
export class WebhookSubscription {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column()
  channel: string  // Slack channel or userId

  @Column()
  eventType: string  // 'jira:issue:created', 'bb:pr:opened'

  @Column('json')
  filters: {
    projectKey?: string
    issueType?: string[]
    priority?: string[]
    assignee?: string
    repoSlug?: string
  }

  @Column()
  notifySlack: boolean

  @Column()
  notifyWeb: boolean
}
```

#### 4.4 Notification Manager
```typescript
class NotificationManager {
  async processWebhook(event: WebhookEvent): Promise<void>
  async findSubscribers(event: WebhookEvent): Promise<WebhookSubscription[]>
  async sendSlackNotification(channel: string, message: string): Promise<void>
  async sendWebNotification(userId: number, data: object): Promise<void>
}
```

### Validation
- [ ] Webhooks received correctly
- [ ] Notifications arriving in Slack
- [ ] Notifications in web interface
- [ ] Filters working
- [ ] Rate limiting implemented

### Estimated Time: 5-7 days

---

## Stage 5: AI Enhancements and Classifiers (Week 6-7)

### Objectives
- PM-specific intent classifier
- Automatic documentation generation
- AI code analysis
- Contextual suggestions

### Tasks

#### 5.1 Intent Classifier Extension
```typescript
// New intents
enum ProjectManagementIntent {
  JIRA_CREATE_ISSUE = 'jira.create',
  JIRA_UPDATE_ISSUE = 'jira.update',
  JIRA_SEARCH = 'jira.search',
  BB_CREATE_PR = 'bitbucket.pr.create',
  BB_REVIEW_CODE = 'bitbucket.review',
  GENERATE_DOCS = 'docs.generate',
  ANALYZE_SPRINT = 'sprint.analyze',
  PREDICT_DEADLINE = 'deadline.predict',
}
```

#### 5.2 Documentation Generation
```typescript
// Commands
.docs sprint               // Generate sprint report
.docs release v1.2.0       // Automatic release notes
.docs api PROJ-123         // API docs for a feature

// AI prompts
"Generate documentation for the last sprint"
"Create release notes based on PRs merged this week"
```

#### 5.3 Code Review Assistant
```typescript
.bb review PR-123 --ai
→ AI analyzes:
  - Code complexity
  - Potential bugs
  - Security issues
  - Performance concerns
  - Improvement suggestions
```

#### 5.4 Predictive Analysis
```typescript
.jira analyze sprint
→ AI generates:
  - Velocity trend
  - Burndown prediction
  - Risk assessment
  - Bottleneck detection
  - Capacity recommendations

.jira predict deadline PROJ-123
→ Estimates completion date based on:
  - Story points remaining
  - Historical velocity
  - Dependencies
  - Team capacity
```

### Validation
- [ ] Classifier with >85% accuracy
- [ ] Generated documentation readable
- [ ] Useful code review insights
- [ ] Predictions within ±15%
- [ ] Feedback loop implemented

### Estimated Time: 7-10 days

---

## Stage 6: Analytics, Dashboards and Reports (Week 8-9)

### Objectives
- Visual dashboards
- Team metrics
- Custom reports
- Data export

### Tasks

#### 6.1 Dashboard Module
```
src/modules/analytics/
├── controller/
│   └── analyticsWeb.controller.ts
├── services/
│   ├── jiraAnalytics.service.ts
│   ├── bitbucketAnalytics.service.ts
│   └── combinedAnalytics.service.ts
├── generators/
│   ├── burndownChart.ts
│   ├── velocityChart.ts
│   ├── cycleTimeChart.ts
│   └── codeFrequencyChart.ts
└── exporters/
    ├── pdfExporter.ts
    └── csvExporter.ts
```

#### 6.2 Implemented Metrics
**Jira Metrics:**
- Velocity (story points/sprint)
- Burndown chart
- Cycle time
- Lead time
- Throughput
- WIP limits adherence
- Bug/Feature ratio
- Sprint completion rate

**Bitbucket Metrics:**
- PR merge time
- Review time
- Code frequency
- Commit frequency
- Contributors activity
- Code churn
- Hotspot files

**Combined Metrics:**
- Feature delivery time (Jira → Bitbucket)
- Deployment frequency
- Change failure rate
- MTTR (mean time to recovery)

#### 6.3 Report Generation
```typescript
// Commands
.analytics velocity --last 6   // Last 6 sprints
.analytics pr-metrics REPO --from 2024-01-01
.analytics team-performance --sprint SP-42

// Endpoints
GET /analytics/jira/velocity?sprints=6
GET /analytics/bitbucket/pr-metrics?repo=main&from=2024-01-01
GET /analytics/combined/dora-metrics
POST /analytics/custom-report
  body: { metrics: [], filters: {}, format: 'pdf' }
```

#### 6.4 Visualization
```typescript
// Libraries: chart.js, d3.js
interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter'
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string
    borderColor?: string
  }[]
}
```

### Validation
- [ ] Dashboards loading <2s
- [ ] Charts rendering correctly
- [ ] PDF/CSV export functional
- [ ] Consistent historical data
- [ ] Mobile-responsive

### Estimated Time: 7-10 days

---

## Stage 7: Advanced Features and Optimization (Week 10+)

### Objectives
- Advanced features
- Performance optimizations
- Auto-healing
- Custom workflows

### Tasks

#### 7.1 Auto-Healing and Bots
```typescript
// Auto-assign based on expertise
class AutoAssigner {
  async suggestAssignee(issue: JiraIssue): Promise<string[]>
  // Analyzes:
  // - Issue components
  // - Team expertise (historical)
  // - Current workload
  // - Availability
}

// Auto-prioritization
class SmartPrioritizer {
  async suggestPriority(issue: JiraIssue): Promise<string>
  // Considers:
  // - Keywords in title/description
  // - Reported by (stakeholder importance)
  // - Dependencies
  // - Business impact
}

// Stale PR detector
class StalePRDetector {
  async findStalePRs(): Promise<BitbucketPR[]>
  async notifyOwners(prs: BitbucketPR[]): Promise<void>
  // Criteria:
  // - No activity >X days
  // - Unresolved conflicts
  // - No assigned reviewers
}
```

#### 7.2 Custom Workflows
```typescript
// Workflow DSL
interface Workflow {
  name: string
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
}

// Example: Auto-link Jira to PR
const autoLinkWorkflow: Workflow = {
  name: 'Auto-link Jira Issue to PR',
  trigger: { event: 'bitbucket:pr:created' },
  conditions: [
    { field: 'pr.title', matches: /[A-Z]+-\d+/ }
  ],
  actions: [
    { type: 'extract-issue-key' },
    { type: 'add-jira-comment', template: 'PR created: {{pr.url}}' },
    { type: 'transition-issue', to: 'In Review' },
  ]
}
```

#### 7.3 Wiki and Knowledge Base
```
src/modules/wiki/
├── services/
│   ├── wikiGenerator.service.ts
│   └── wikiSearch.service.ts
├── generators/
│   ├── projectOverview.ts      // Auto-gen from Jira
│   ├── apiDocumentation.ts     // From code + comments
│   ├── architectureDiagram.ts  // From repo structure
│   └── teamRoster.ts           // From Jira users
└── storage/
    └── wikiPages.dataSource.ts
```

```typescript
// Auto-generated wiki pages
.wiki generate project          // Project overview
.wiki generate architecture     // Architecture diagram
.wiki generate api             // API documentation
.wiki generate glossary        // Technical terms
.wiki search "authentication"  // Full-text search
```

#### 7.4 Performance Optimization
```typescript
// Batch operations
class BatchProcessor {
  async fetchMultipleIssues(keys: string[]): Promise<JiraIssue[]>
  async updateMultiplePRs(updates: PRUpdate[]): Promise<void>
}

// Incremental sync
class IncrementalSync {
  async syncJiraIssues(since: Date): Promise<void>
  async syncBitbucketPRs(since: Date): Promise<void>
  // Only syncs changes since last execution
}

// Connection pooling
// Rate limiting with retry + backoff
// GraphQL to reduce over-fetching (if Atlassian supports)
```

#### 7.5 Testing and Quality
```typescript
// Integration tests
describe('Jira Integration', () => {
  it('should create issue with all fields')
  it('should handle API rate limits gracefully')
  it('should cache responses correctly')
  it('should invalidate cache on updates')
})

// E2E tests
describe('PM Workflows', () => {
  it('should create issue from Slack command')
  it('should notify on issue assignment')
  it('should link PR to Jira issue automatically')
})

// Load testing
// - 100 concurrent users
// - 1000 webhook events/min
// - Cache hit ratio >80%
```

### Validation
- [ ] Auto-healing reducing manual work >30%
- [ ] Custom workflows executing
- [ ] Auto-generated wiki updated
- [ ] Performance benchmarks met
- [ ] Test coverage >85%

### Estimated Time: 10-15 days

---

## Dependencies Between Stages

```
Stage 1 (Setup)
    ↓
Stage 2 (Core Features) ← Stage 3 (CRUD)
    ↓                         ↓
Stage 4 (Webhooks)           ↓
    ↓                         ↓
Stage 5 (AI) ←---------------┘
    ↓
Stage 6 (Analytics)
    ↓
Stage 7 (Advanced)
```

**Recommended order:** 1 → 2 → 3 → 4 → 5 → 6 → 7

**Minimum viable:** Stage 1, 2, 3 (4 weeks)

**Production-ready:** Stage 1-6 (9 weeks)

**Full-featured:** Stage 1-7 (12+ weeks)

---

## Summary

7-stage implementation plan covering from initial setup to advanced features. **Stage 1** API and base module setup (3-5 days). **Stage 2** core read functionality (7-10 days). **Stage 3** CRUD operations (5-7 days). **Stage 4** webhooks and notifications (5-7 days). **Stage 5** AI enhancements and classifiers (7-10 days). **Stage 6** analytics and dashboards (7-10 days). **Stage 7** advanced features and optimization (10-15 days). Total estimate: 10-12 weeks for complete implementation. Viable MVP in 4 weeks (Stages 1-3). Each stage is independent and deployable, with specific validations and success metrics. Modular architecture allows parallel development by multiple developers.
