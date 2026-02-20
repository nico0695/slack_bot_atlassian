# Jira Integration - Detailed Plan

## Authentication y Setup

### Methods de Authentication

#### 1. API Token (Recomendado para desarrollo)
```typescript
// jiraApi.repository.ts
import JiraClient from 'jira-client'

export class JiraApiRepository {
  private client: JiraClient

  constructor() {
    this.client = new JiraClient({
      protocol: 'https',
      host: process.env.JIRA_HOST,
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN,
      apiVersion: '3',
      strictSSL: true
    })
  }
}
```

**Setup:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Crear nuevo API token
3. Guardar en .env

#### 2. OAuth 2.0 (Recomendado para producción)
```typescript
interface JiraOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

// Implementar flujo OAuth 3LO
// https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
```

### Environment Variables
```bash
# API Token method
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=PROJ
JIRA_DEFAULT_ASSIGNEE=user@company.com

# OAuth 2.0 method
JIRA_OAUTH_CLIENT_ID=
JIRA_OAUTH_CLIENT_SECRET=
JIRA_OAUTH_REDIRECT_URI=https://yourapp.com/auth/jira/callback
JIRA_OAUTH_SCOPES=read:jira-work,write:jira-work,read:jira-user

# Configuration
JIRA_CACHE_TTL=300  # 5 minutes
JIRA_RATE_LIMIT_PER_MINUTE=100
```

---

## Structure ofl Módulo Jira

### Arquitectura de Archivos
```
src/modules/jira/
├── controller/
│   ├── jira.controller.ts              # Slack handlers
│   ├── jiraWeb.controller.ts           # REST API + Socket.io
│   └── __tests__/
│       └── jira.controller.test.ts
├── services/
│   ├── jira.service.ts                 # Business logic
│   ├── jiraWebhook.service.ts          # Webhook processing
│   ├── jiraSync.service.ts             # Background sync
│   └── __tests__/
│       └── jira.service.test.ts
├── repositories/
│   ├── jiraApi.repository.ts           # Jira API wrapper
│   ├── database/
│   │   ├── jiraIssue.dataSource.ts     # Issue cache
│   │   ├── jiraSprint.dataSource.ts    # Sprint cache
│   │   └── jiraProject.dataSource.ts   # Project cache
│   ├── redis/
│   │   └── jiraRedis.repository.ts     # Redis caching
│   └── __tests__/
├── webhooks/
│   ├── jiraWebhook.controller.ts       # POST /webhooks/jira
│   ├── handlers/
│   │   ├── issueCreated.handler.ts
│   │   ├── issueUpdated.handler.ts
│   │   ├── issueTransitioned.handler.ts
│   │   ├── commentAdded.handler.ts
│   │   ├── sprintStarted.handler.ts
│   │   └── sprintCompleted.handler.ts
│   └── filters/
│       └── eventFilter.ts
├── shared/
│   ├── constants/
│   │   └── jira.constants.ts           # Enums, constants
│   ├── interfaces/
│   │   ├── jira.interfaces.ts
│   │   ├── jiraIssue.interface.ts
│   │   └── jiraSprint.interface.ts
│   └── schemas/
│       ├── createIssue.schema.ts
│       ├── updateIssue.schema.ts
│       └── searchIssues.schema.ts
└── utils/
    ├── jiraFormatters.ts               # Slack & Web formatters
    ├── jql.builder.ts                  # JQL query builder
    ├── issueParser.ts                  # Parse text to issue
    └── fieldMapper.ts                  # Map custom fields
```

---

## Features by Complejidad

### Complejidad: SIMPLE (1-2 days cada una)

#### 1. Ver Issue Individual
```typescript
// Comando Slack
.jira PROJ-123
.jira issue PROJ-123
.jira show PROJ-123

// REST
GET /jira/issues/:issueKey

// Retorna
interface IssueDetails {
  key: string
  summary: string
  description: string
  status: string
  assignee: string
  priority: string
  created: Date
  updated: Date
  labels: string[]
  components: string[]
  fixVersions: string[]
}
```

#### 2. Listar Mis Issues
```typescript
// Comando Slack
.jira myissues
.jira mine
.jira me

// REST
GET /jira/issues/assigned-to-me

// Implementación
async getMyIssues(userId: number): Promise<JiraIssue[]> {
  const jiraUser = await this.getUserMapping(userId)
  const jql = `assignee = "${jiraUser}" AND resolution = Unresolved ORDER BY priority DESC`
  return this.searchIssues(jql)
}
```

#### 3. Ver Proyecto
```typescript
// Comando
.jira project PROJ

// REST
GET /jira/projects/:projectKey

// Retorna
interface ProjectInfo {
  key: string
  name: string
  description: string
  lead: string
  issueTypes: string[]
  components: string[]
  versions: string[]
  url: string
}
```

#### 4. Issues del Sprint Actual
```typescript
// Comando
.jira sprint
.jira sprint current

// REST
GET /jira/sprints/active

// JQL
const jql = `project = "${projectKey}" AND sprint in openSprints() ORDER BY rank ASC`
```

#### 5. Ver Backlog
```typescript
// Comando
.jira backlog

// REST
GET /jira/backlog

// JQL
const jql = `project = "${projectKey}" AND sprint is EMPTY AND status != Done ORDER BY rank ASC`
```

### Complejidad: MEDIA (2-4 days cada una)

#### 6. Búsqueda con JQL
```typescript
// Comando
.jira search "status = Open AND priority = High"
.jira find assignee = john@company.com

// REST
GET /jira/issues/search?jql=...

// JQL Builder
class JQLBuilder {
  private conditions: string[] = []

  project(key: string): this {
    this.conditions.push(`project = "${key}"`)
    return this
  }

  assignedTo(user: string): this {
    this.conditions.push(`assignee = "${user}"`)
    return this
  }

  inStatus(...statuses: string[]): this {
    const statusList = statuses.map(s => `"${s}"`).join(', ')
    this.conditions.push(`status IN (${statusList})`)
    return this
  }

  withPriority(...priorities: string[]): this {
    const priorityList = priorities.map(p => `"${p}"`).join(', ')
    this.conditions.push(`priority IN (${priorityList})`)
    return this
  }

  inSprint(sprintName: string): this {
    this.conditions.push(`sprint = "${sprintName}"`)
    return this
  }

  createdAfter(date: Date): this {
    this.conditions.push(`created >= "${date.toISOString().split('T')[0]}"`)
    return this
  }

  hasLabel(...labels: string[]): this {
    labels.forEach(label => {
      this.conditions.push(`labels = "${label}"`)
    })
    return this
  }

  build(): string {
    return this.conditions.join(' AND ')
  }
}

// Uso
const jql = new JQLBuilder()
  .project('PROJ')
  .inStatus('Open', 'In Progress')
  .withPriority('High', 'Highest')
  .createdAfter(new Date('2024-01-01'))
  .build()
```

#### 7. Crear Issue
```typescript
// Comando
.jira create -t Bug -s "Login fails with OAuth" -d "Description here" -p High -a john@company.com

// REST
POST /jira/issues
Body: {
  projectKey: string
  issueType: 'Bug' | 'Task' | 'Story' | 'Epic'
  summary: string
  description?: string
  priority?: 'Lowest' | 'Low' | 'Medium' | 'High' | 'Highest'
  assignee?: string
  labels?: string[]
  components?: string[]
  parentKey?: string  // For subtasks
}

// Schema validation
export const createIssueSchema = z.object({
  projectKey: z.string().min(1),
  issueType: z.enum(['Bug', 'Task', 'Story', 'Epic', 'Subtask']),
  summary: z.string().min(5).max(255),
  description: z.string().optional(),
  priority: z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest']).optional(),
  assignee: z.string().email().optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  parentKey: z.string().optional(),
})
```

#### 8. Actualizar Issue
```typescript
// Comando
.jira update PROJ-123 -s "New summary" -p Critical -a maria@company.com

// REST
PUT /jira/issues/:issueKey
Body: {
  summary?: string
  description?: string
  priority?: string
  assignee?: string
  labels?: string[]
  components?: string[]
}
```

#### 9. Transición de Estado
```typescript
// Comando
.jira move PROJ-123 "In Progress"
.jira transition PROJ-123 "Done"

// REST
POST /jira/issues/:issueKey/transitions
Body: {
  transitionName: string
}

// Implementación
async transitionIssue(issueKey: string, transitionName: string): Promise<void> {
  // 1. Obtener transiciones disponibles
  const transitions = await this.client.listTransitions(issueKey)
  
  // 2. Encontrar transición por nombre
  const transition = transitions.transitions.find(t => 
    t.name.toLowerCase() === transitionName.toLowerCase()
  )
  
  if (!transition) {
    throw new BadRequestError(`Transition "${transitionName}" not available`)
  }
  
  // 3. Ejecutar transición
  await this.client.transitionIssue(issueKey, {
    transition: { id: transition.id }
  })
}
```

#### 10. Add Comentario
```typescript
// Comando
.jira comment PROJ-123 "This is my comment with *markdown*"

// REST
POST /jira/issues/:issueKey/comments
Body: {
  body: string
  visibility?: {
    type: 'role' | 'group'
    value: string
  }
}
```

### Complejidad: COMPLEJA (4-7 days cada una)

#### 11. Sprint Management
```typescript
// Comandos
.jira sprint create "Sprint 42" --start "2024-06-01" --end "2024-06-14"
.jira sprint start "Sprint 42"
.jira sprint complete "Sprint 42"
.jira sprint add PROJ-123,PROJ-124 "Sprint 42"
.jira sprint remove PROJ-123 "Sprint 42"

// REST
POST /jira/sprints
PUT /jira/sprints/:sprintId/start
PUT /jira/sprints/:sprintId/complete
POST /jira/sprints/:sprintId/issues

// Service
class JiraSprintService {
  async createSprint(data: CreateSprintDTO): Promise<Sprint>
  async startSprint(sprintId: number): Promise<void>
  async completeSprint(sprintId: number): Promise<void>
  async addIssuesToSprint(sprintId: number, issueKeys: string[]): Promise<void>
  async getSprintReport(sprintId: number): Promise<SprintReport>
}

interface SprintReport {
  sprint: Sprint
  completedIssues: number
  incompletedIssues: number
  completedStoryPoints: number
  totalStoryPoints: number
  velocityAchieved: number
  issuesAddedMidSprint: number
  issuesRemovedMidSprint: number
}
```

#### 12. Bulk Operations
```typescript
// Comando
.jira bulk assign PROJ-123,PROJ-124,PROJ-125 maria@company.com
.jira bulk label PROJ-123,PROJ-124 backend,urgent
.jira bulk transition PROJ-123,PROJ-124,PROJ-125 "In Progress"

// REST
POST /jira/issues/bulk
Body: {
  issueKeys: string[]
  operation: 'assign' | 'label' | 'transition' | 'update'
  data: object
}

// Implementación con batch processing
async bulkOperation(issueKeys: string[], operation: BulkOperation): Promise<BulkResult> {
  const results = {
    successful: [] as string[],
    failed: [] as { issueKey: string, error: string }[]
  }

  // Process in batches of 10
  const batches = chunk(issueKeys, 10)
  
  for (const batch of batches) {
    const promises = batch.map(async (issueKey) => {
      try {
        await this.executeOperation(issueKey, operation)
        results.successful.push(issueKey)
      } catch (error) {
        results.failed.push({
          issueKey,
          error: error.message
        })
      }
    })
    
    await Promise.allSettled(promises)
  }
  
  return results
}
```

#### 13. Issue Templates
```typescript
// Templates predefinidos
interface IssueTemplate {
  name: string
  issueType: string
  summary: string
  description: string
  priority?: string
  labels?: string[]
  components?: string[]
}

const templates: IssueTemplate[] = [
  {
    name: 'bug',
    issueType: 'Bug',
    summary: 'Bug: {{title}}',
    description: `
## Descripción
{{description}}

## Pasos para Reproducir
1. 
2. 
3. 

## Comportamiento Esperado


## Comportamiento Actual


## Screenshots/Logs


## Entorno
- Browser/OS: 
- Version: 
    `,
    priority: 'High',
    labels: ['bug']
  },
  {
    name: 'feature',
    issueType: 'Story',
    summary: 'Feature: {{title}}',
    description: `
## User Story
As a {{role}}
I want {{feature}}
So that {{benefit}}

## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## Technical Notes


## Dependencies

    `,
    labels: ['feature']
  }
]

// Comando
.jira create-from-template bug "Login OAuth fails"
```

#### 14. Advanced Search con Filters
```typescript
// Saved filters
interface SavedFilter {
  id: number
  name: string
  jql: string
  userId: number
  isPublic: boolean
}

// Comando
.jira filter save "My High Priority" "assignee = currentUser() AND priority = High"
.jira filter list
.jira filter apply "My High Priority"

// REST
GET /jira/filters
POST /jira/filters
GET /jira/filters/:id/execute
```

#### 15. Watchers Management
```typescript
// Comandos
.jira watch PROJ-123              // Add me as watcher
.jira unwatch PROJ-123            // Remove me
.jira watchers PROJ-123           // List watchers
.jira watchers add PROJ-123 user@company.com

// REST
POST /jira/issues/:issueKey/watchers
DELETE /jira/issues/:issueKey/watchers/:username
GET /jira/issues/:issueKey/watchers
```

### Complejidad: MUY COMPLEJA (7-14 days cada una)

#### 16. Custom Fields Management
```typescript
// Manejo de custom fields
interface CustomFieldMapping {
  jiraFieldId: string    // customfield_10001
  fieldName: string      // "Story Points"
  fieldType: string      // number, string, option, etc.
  projectKey: string
}

// Service para mapear custom fields
class CustomFieldMapper {
  async discoverCustomFields(projectKey: string): Promise<CustomFieldMapping[]>
  async getFieldValue(issueKey: string, fieldName: string): Promise<any>
  async setFieldValue(issueKey: string, fieldName: string, value: any): Promise<void>
}

// Comando
.jira field get PROJ-123 "Story Points"
.jira field set PROJ-123 "Story Points" 8
```

#### 17. Issue Linking
```typescript
// Tipos de links
enum IssueLinkType {
  BLOCKS = 'Blocks',
  IS_BLOCKED_BY = 'is blocked by',
  RELATES_TO = 'Relates',
  DUPLICATES = 'Duplicates',
  IS_DUPLICATED_BY = 'is duplicated by',
  CLONES = 'Clones',
  IS_CLONED_BY = 'is cloned by',
}

// Comandos
.jira link PROJ-123 blocks PROJ-124
.jira link PROJ-123 relates PROJ-125
.jira unlink PROJ-123 PROJ-124

// REST
POST /jira/issues/:issueKey/links
Body: {
  type: IssueLinkType
  inwardIssue?: string
  outwardIssue?: string
  comment?: string
}

// Visualización de dependencies
.jira dependencies PROJ-123
→ Muestra árbol de dependencies
```

#### 18. Epic Management
```typescript
// Comandos
.jira epic create "User Authentication Epic" -d "All auth-related stories"
.jira epic add PROJ-123 EPIC-1
.jira epic remove PROJ-123 EPIC-1
.jira epic issues EPIC-1
.jira epic progress EPIC-1

// REST
POST /jira/epics
POST /jira/epics/:epicKey/issues
GET /jira/epics/:epicKey/issues

// Epic progress report
interface EpicProgress {
  epic: JiraIssue
  totalStories: number
  completedStories: number
  inProgressStories: number
  todoStories: number
  totalStoryPoints: number
  completedStoryPoints: number
  completionPercentage: number
  estimatedCompletionDate: Date
}
```

#### 19. Version/Release Management
```typescript
// Comandos
.jira version create "v1.2.0" --release "2024-06-30"
.jira version list
.jira version release "v1.2.0"
.jira version issues "v1.2.0"

// REST
POST /jira/versions
GET /jira/versions
PUT /jira/versions/:versionId/release
GET /jira/versions/:versionId/issues

// Release notes generation
.jira release-notes "v1.2.0"
→ Genera markdown con:
  - Features (Stories)
  - Bug Fixes
  - Breaking Changes
  - Contributors
```

#### 20. Components Management
```typescript
// Comandos
.jira component create "Authentication" --lead maria@company.com
.jira component list
.jira component issues "Authentication"

// REST
POST /jira/components
GET /jira/components
GET /jira/components/:componentId/issues
```

---

## Webhooks Jira

### Configuration en Jira
1. Go to Jira Settings → System → Webhooks
2. Crear nuevo webhook
3. URL: `https://your-app.com/webhooks/jira`
4. Events: Seleccionar eventos relevantes
5. JQL Filter (optional): `project = PROJ`

### Eventos Soportados

```typescript
enum JiraWebhookEvent {
  // Issue events
  ISSUE_CREATED = 'jira:issue_created',
  ISSUE_UPDATED = 'jira:issue_updated',
  ISSUE_DELETED = 'jira:issue_deleted',
  
  // Comment events
  COMMENT_CREATED = 'comment_created',
  COMMENT_UPDATED = 'comment_updated',
  COMMENT_DELETED = 'comment_deleted',
  
  // Sprint events
  SPRINT_CREATED = 'sprint_created',
  SPRINT_STARTED = 'sprint_started',
  SPRINT_CLOSED = 'sprint_closed',
  
  // Version events
  VERSION_RELEASED = 'jira:version_released',
  VERSION_UNRELEASED = 'jira:version_unreleased',
  
  // Worklog events
  WORKLOG_CREATED = 'worklog_created',
  WORKLOG_UPDATED = 'worklog_updated',
}
```

### Webhook Handler
```typescript
// jiraWebhook.router.ts
import { Router, Request, Response } from 'express'
import { JiraWebhookService } from './jiraWebhook.service'

const webhookService = new JiraWebhookService()
export const jiraWebhookRouter = Router()

jiraWebhookRouter.post('/jira', async (req: Request, res: Response) => {
  const event = req.body

  // Verify webhook signature (si está configurado)
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature')
  }

  // Process async
  webhookService.processEvent(event).catch(error => {
    // TODO: log error using createModuleLogger('jira.webhook')
  })

  // Respond immediately
  return res.status(200).send('OK')
})

function verifySignature(req: Request): boolean {
  // Implementar verificación si Jira lo soporta
  return true
}
```

### Event Processing
```typescript
// jiraWebhook.service.ts

interface JiraWebhookPayload {
  webhookEvent: string
  issue?: any
  comment?: any
  user?: any
  timestamp?: number
}

class JiraWebhookService {
  async processEvent(event: JiraWebhookPayload): Promise<void> {
    const eventType = event.webhookEvent
    
    // Route to appropriate handler
    switch (eventType) {
      case JiraWebhookEvent.ISSUE_CREATED:
        await this.handleIssueCreated(event)
        break
      case JiraWebhookEvent.ISSUE_UPDATED:
        await this.handleIssueUpdated(event)
        break
      case JiraWebhookEvent.COMMENT_CREATED:
        await this.handleCommentAdded(event)
        break
      // ... más handlers
    }
  }
  
  private async handleIssueCreated(event: any): Promise<void> {
    const issue = event.issue
    
    // 1. Invalidar cache
    await this.cacheService.invalidate(`jira:issue:${issue.key}`)
    
    // 2. Encontrar suscriptores
    const subscribers = await this.notificationService.findSubscribers({
      eventType: 'jira:issue:created',
      projectKey: issue.fields.project.key,
    })
    
    // 3. Notificar
    for (const sub of subscribers) {
      if (sub.notifySlack) {
        await this.slackService.sendMessage(sub.channel, 
          this.formatIssueCreated(issue)
        )
      }
      if (sub.notifyWeb) {
        await this.socketService.emit(sub.userId, 'jira:issue:created', issue)
      }
    }
  }
}
```

---

## Rate Limiting y Optimización

### Rate Limits de Jira Cloud
- 5 requests por segundo por IP
- Burst de hasta 10 requests
- Headers: `X-RateLimit-*`

### Estrategia de Rate Limiting
```typescript
import Bottleneck from 'bottleneck'

class JiraApiRepository {
  private limiter: Bottleneck

  constructor() {
    this.limiter = new Bottleneck({
      minTime: 200,  // 200ms entre requests (5/sec)
      maxConcurrent: 3,
      reservoir: 10,  // Burst capacity
      reservoirRefreshAmount: 10,
      reservoirRefreshInterval: 1000,
    })
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.limiter.schedule(() => this.client.findIssue(issueKey))
  }
}
```

### Caching Strategy
```typescript
interface CacheStrategy {
  key: string
  ttl: number  // seconds
  invalidateOn: string[]  // Events that invalidate
}

const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  issue: {
    key: 'jira:issue:{issueKey}',
    ttl: 300,  // 5 minutes
    invalidateOn: ['issue:updated', 'issue:deleted']
  },
  sprint: {
    key: 'jira:sprint:{sprintId}',
    ttl: 600,  // 10 minutes
    invalidateOn: ['sprint:started', 'sprint:completed']
  },
  userIssues: {
    key: 'jira:user:{userId}:issues',
    ttl: 120,  // 2 minutes
    invalidateOn: ['issue:created', 'issue:updated', 'issue:assigned']
  }
}
```

---

## Testing

### Unit Tests
```typescript
describe('JiraService', () => {
  describe('getIssue', () => {
    it('should return issue from cache if available', async () => {
      // Setup
      const cachedIssue = { key: 'PROJ-123', summary: 'Test' }
      jest.spyOn(redisRepo, 'get').mockResolvedValue(cachedIssue)
      
      // Execute
      const result = await service.getIssue('PROJ-123')
      
      // Assert
      expect(result).toEqual(cachedIssue)
      expect(jiraApiRepo.getIssue).not.toHaveBeenCalled()
    })

    it('should fetch from API and cache if not in cache', async () => {
      // Setup
      const apiIssue = { key: 'PROJ-123', summary: 'Test' }
      jest.spyOn(redisRepo, 'get').mockResolvedValue(null)
      jest.spyOn(jiraApiRepo, 'getIssue').mockResolvedValue(apiIssue)
      
      // Execute
      const result = await service.getIssue('PROJ-123')
      
      // Assert
      expect(result).toEqual(apiIssue)
      expect(redisRepo.set).toHaveBeenCalledWith(
        'jira:issue:PROJ-123',
        apiIssue,
        300
      )
    })
  })
})
```

### Integration Tests
```typescript
describe('Jira Integration', () => {
  it('should create issue via Slack command', async () => {
    // Simular comando Slack
    const event = {
      text: '.jira create -t Bug -s "Test bug" -p High',
      user: 'U123',
      channel: 'C456'
    }
    
    // Execute
    await jiraController.handleMessage(event)
    
    // Assert
    expect(jiraApiRepo.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        issueType: 'Bug',
        summary: 'Test bug',
        priority: 'High'
      })
    )
  })
})
```

---

## Resumen

Plan detallado de integración Jira cubriendo autenticación (API token y OAuth 2.0), estructura modular completa (controllers, services, repositories, webhooks), y 20 funcionalidades clasificadas por complejidad. **Simples** (1-2 days): ver issue, listar asignadas, ver proyecto, sprint actual, backlog. **Medias** (2-4 days): búsqueda JQL con builder, CRUD de issues, transiciones, comentarios. **Complejas** (4-7 days): sprint management, bulk operations, templates, saved filters, watchers. **Muy complejas** (7-14 days): custom fields, issue linking, epic management, version/release, components. Incluye webhooks para 10+ eventos con notificaciones multi-canal, rate limiting con Bottleneck (5 req/sec), caching strategy en Redis con TTL específicos, y testing comprehensivo. Total estimado: 15-20 funcionalidades implementables en 6-8 weeks con equipo de 2-3 desarrolladores.
