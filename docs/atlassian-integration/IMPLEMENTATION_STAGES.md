# Implementation Stages - Atlassian Integration

## Stage 1: Configuración de APIs y Servicios (Week 1)

### Objetivos
- Configurar autenticación con Jira Cloud API
- Configurar autenticación con Bitbucket Cloud API
- Crear módulos base siguiendo arquitectura existente
- Validar conectividad

### Tareas

#### 1.1 Setup de Credenciales
```bash
# .env additions
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=PROJ

BITBUCKET_WORKSPACE=your-workspace
BITBUCKET_USERNAME=your-username
BITBUCKET_APP_PASSWORD=your-app-password
# o OAuth 2.0
BITBUCKET_CLIENT_ID=
BITBUCKET_CLIENT_SECRET=
```

#### 1.2 Instalación de Dependencias
```bash
npm install --save jira-client
npm install --save axios  # para Bitbucket API
npm install --save @types/jira-client --save-dev
```

#### 1.3 Crear Módulo Jira Base
```
src/modules/jira/
├── controller/
│   ├── jira.controller.ts          # Slack commands
│   └── jiraWeb.controller.ts       # REST endpoints
├── services/
│   └── jira.services.ts
├── repositories/
│   ├── jiraApi.repository.ts       # Jira API wrapper
│   └── database/
│       └── jiraCache.dataSource.ts # Cache de datos
├── shared/
│   ├── constants/
│   │   └── jira.constants.ts
│   ├── interfaces/
│   │   └── jira.interfaces.ts
│   └── schemas/
│       └── jira.schemas.ts         # Zod validations
└── utils/
    ├── jiraFormatters.ts           # Formatear output
    └── jql.builder.ts              # JQL query builder
```

#### 1.4 Crear Módulo Bitbucket Base
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

#### 1.5 Entidades TypeORM
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

#### 1.6 Primeros Endpoints de Prueba
```typescript
// GET /jira/test - Test connection
// GET /bitbucket/test - Test connection
// GET /jira/projects - List projects
// GET /bitbucket/repositories - List repos
```

### Validación
- [ ] Autenticación funcional con Jira
- [ ] Autenticación funcional con Bitbucket
- [ ] Módulos registrados en app.ts
- [ ] Tests de conectividad pasando
- [ ] Logging configurado

### Tiempo Estimado: 3-5 días

---

## Stage 2: Módulos Base y Funcionalidades Core (Week 2-3)

### Objetivos
- Implementar funcionalidades básicas de lectura
- Comandos Slack fundamentales
- REST API endpoints core
- Cache básico en Redis

### Tareas

#### 2.1 Funcionalidades Jira Core
```typescript
// Comandos Slack
.jira issue PROJ-123           // Ver detalle de issue
.jira list                     // Mis issues asignadas
.jira search "status=Open"     // Búsqueda JQL
.jira sprint                   // Issues del sprint actual
.jira backlog                  // Ver backlog

// REST Endpoints
GET /jira/issues/:issueKey
GET /jira/issues/assigned-to-me
GET /jira/issues/search?jql=...
GET /jira/sprints/active
GET /jira/projects/:projectKey
```

#### 2.2 Funcionalidades Bitbucket Core
```typescript
// Comandos Slack
.bb pr list                    // PRs abiertas
.bb pr REPO-123                // Detalle de PR
.bb commits main               // Últimos commits
.bb branches                   // Ver branches activas

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

#### 2.4 Formatters y Utilities
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

### Validación
- [ ] Comandos básicos funcionando en Slack
- [ ] REST endpoints respondiendo correctamente
- [ ] Cache reduciendo llamadas a APIs
- [ ] Formateo consistente de respuestas
- [ ] Tests unitarios >70%

### Tiempo Estimado: 7-10 días

---

## Stage 3: Creación y Modificación de Recursos (Week 4)

### Objetivos
- Habilitar creación de issues/PRs desde Slack
- Transiciones de estado
- Comentarios y updates
- Validaciones robustas

### Tareas

#### 3.1 Creación de Issues Jira
```typescript
// Comandos
.jira create -t Task -s "Título" -d "Descripción" -a user@company.com
.jira create-from-template bug

// Con AI Assistant
"Crea un bug para el login que falla con Google OAuth"
→ AI classify → jira.create intent
```

#### 3.2 Transiciones y Updates
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

#### 3.4 Schemas de Validación
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

### Validación
- [ ] Creación de recursos validada
- [ ] Transiciones de estado funcionando
- [ ] Error handling robusto
- [ ] Rollback en caso de falla
- [ ] Audit log de cambios

### Tiempo Estimado: 5-7 días

---

## Stage 4: Webhooks y Notificaciones en Tiempo Real (Week 5)

### Objetivos
- Configurar webhooks de Jira y Bitbucket
- Sistema de notificaciones inteligentes
- Filtros personalizables
- Multi-canal (Slack + Web Socket.io)

### Tareas

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
    └── webhookFilters.ts       # Filtrar eventos relevantes
```

#### 4.2 Eventos a Capturar
**Jira:**
- Issue created/updated/deleted
- Issue transitioned (cambio de estado)
- Comment added
- Sprint started/completed
- Release created

**Bitbucket:**
- PR created/updated/merged/declined
- PR approved/unapproved
- Commit pushed
- Build succeeded/failed
- Branch created/deleted

#### 4.3 Sistema de Suscripciones
```typescript
// Entidad de suscripciones
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

#### 4.4 Notificación Manager
```typescript
class NotificationManager {
  async processWebhook(event: WebhookEvent): Promise<void>
  async findSubscribers(event: WebhookEvent): Promise<WebhookSubscription[]>
  async sendSlackNotification(channel: string, message: string): Promise<void>
  async sendWebNotification(userId: number, data: object): Promise<void>
}
```

### Validación
- [ ] Webhooks recibidos correctamente
- [ ] Notificaciones llegando a Slack
- [ ] Notificaciones en web interface
- [ ] Filtros funcionando
- [ ] Rate limiting implementado

### Tiempo Estimado: 5-7 días

---

## Stage 5: AI Enhancements y Clasificadores (Week 6-7)

### Objetivos
- Clasificador de intents específico de PM
- Generación automática de documentación
- Análisis de código con AI
- Sugerencias contextuales

### Tareas

#### 5.1 Intent Classifier Extension
```typescript
// Nuevos intents
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

#### 5.2 Generación de Documentación
```typescript
// Comandos
.docs sprint               // Generar sprint report
.docs release v1.2.0       // Release notes automáticas
.docs api PROJ-123         // API docs de un feature

// AI prompts
"Genera documentación del último sprint"
"Crea release notes basadas en los PRs mergeados esta semana"
```

#### 5.3 Code Review Assistant
```typescript
.bb review PR-123 --ai
→ AI analiza:
  - Complejidad de código
  - Potenciales bugs
  - Security issues
  - Performance concerns
  - Sugerencias de mejora
```

#### 5.4 Análisis Predictivo
```typescript
.jira analyze sprint
→ AI genera:
  - Velocity trend
  - Burndown prediction
  - Risk assessment
  - Bottleneck detection
  - Capacity recommendations

.jira predict deadline PROJ-123
→ Estima fecha de completion basado en:
  - Story points remaining
  - Historical velocity
  - Dependencies
  - Team capacity
```

### Validación
- [ ] Clasificador con >85% accuracy
- [ ] Documentación generada legible
- [ ] Code review insights útiles
- [ ] Predicciones dentro de ±15%
- [ ] Feedback loop implementado

### Tiempo Estimado: 7-10 días

---

## Stage 6: Analytics, Dashboards y Reportes (Week 8-9)

### Objetivos
- Dashboards visuales
- Métricas de equipo
- Custom reports
- Exportación de datos

### Tareas

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

#### 6.2 Métricas Implementadas
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
// Comandos
.analytics velocity --last 6   // Últimos 6 sprints
.analytics pr-metrics REPO --from 2024-01-01
.analytics team-performance --sprint SP-42

// Endpoints
GET /analytics/jira/velocity?sprints=6
GET /analytics/bitbucket/pr-metrics?repo=main&from=2024-01-01
GET /analytics/combined/dora-metrics
POST /analytics/custom-report
  body: { metrics: [], filters: {}, format: 'pdf' }
```

#### 6.4 Visualización
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

### Validación
- [ ] Dashboards cargando <2s
- [ ] Charts renderizando correctamente
- [ ] Exportación PDF/CSV funcional
- [ ] Datos históricos consistentes
- [ ] Mobile-responsive

### Tiempo Estimado: 7-10 días

---

## Stage 7: Advanced Features y Optimización (Week 10+)

### Objetivos
- Features avanzadas
- Optimizaciones de performance
- Auto-healing
- Custom workflows

### Tareas

#### 7.1 Auto-Healing y Bots
```typescript
// Auto-assign based on expertise
class AutoAssigner {
  async suggestAssignee(issue: JiraIssue): Promise<string[]>
  // Analiza:
  // - Componentes del issue
  // - Expertise del equipo (histórico)
  // - Carga actual de trabajo
  // - Availability
}

// Auto-prioritization
class SmartPrioritizer {
  async suggestPriority(issue: JiraIssue): Promise<string>
  // Considera:
  // - Keywords en título/descripción
  // - Reportado por (stakeholder importance)
  // - Dependencies
  // - Business impact
}

// Stale PR detector
class StalePRDetector {
  async findStalePRs(): Promise<BitbucketPR[]>
  async notifyOwners(prs: BitbucketPR[]): Promise<void>
  // Criterios:
  // - Sin actividad >X días
  // - Conflictos no resueltos
  // - Sin reviewers asignados
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

// Ejemplo: Auto-link Jira to PR
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

#### 7.3 Wiki y Knowledge Base
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
.wiki generate project          // Overview del proyecto
.wiki generate architecture     // Diagrama de arquitectura
.wiki generate api             // API documentation
.wiki generate glossary        // Términos técnicos
.wiki search "authentication"  // Full-text search
```

#### 7.4 Optimización de Performance
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
  // Solo sincroniza cambios desde última ejecución
}

// Connection pooling
// Rate limiting con retry + backoff
// GraphQL para reducir over-fetching (si Atlassian soporta)
```

#### 7.5 Testing y Quality
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

### Validación
- [ ] Auto-healing reduciendo manual work >30%
- [ ] Custom workflows ejecutando
- [ ] Wiki auto-generada actualizada
- [ ] Performance benchmarks cumplidos
- [ ] Test coverage >85%

### Tiempo Estimado: 10-15 días

---

## Dependencias entre Stages

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

**Orden recomendado:** 1 → 2 → 3 → 4 → 5 → 6 → 7

**Mínimo viable:** Stage 1, 2, 3 (4 semanas)

**Producción-ready:** Stage 1-6 (9 semanas)

**Full-featured:** Stage 1-7 (12+ semanas)

---

## Resumen

Plan de implementación en 7 etapas cubriendo desde configuración inicial hasta features avanzadas. **Stage 1** setup de APIs y módulos base (3-5 días). **Stage 2** funcionalidades core de lectura (7-10 días). **Stage 3** CRUD operations (5-7 días). **Stage 4** webhooks y notificaciones (5-7 días). **Stage 5** AI enhancements y clasificadores (7-10 días). **Stage 6** analytics y dashboards (7-10 días). **Stage 7** features avanzadas y optimización (10-15 días). Total estimado: 10-12 semanas para implementación completa. MVP viable en 4 semanas (Stages 1-3). Cada stage es independiente y deployable, con validaciones específicas y métricas de éxito. Arquitectura modular permite desarrollo paralelo por múltiples desarrolladores.
