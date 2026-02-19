# Technical Architecture - Atlassian Integration

## Patrones de Diseño

### 1. Repository Pattern (Existente - Mantener)

Separación clara entre lógica de negocio y acceso a datos.

```typescript
// Estructura por módulo
src/modules/jira/repositories/
├── jiraApi.repository.ts           // API calls a Jira
├── database/
│   └── jiraIssue.dataSource.ts     // TypeORM entity access
└── redis/
    └── jiraRedis.repository.ts     // Cache layer
```

**Beneficios**:
- Testeable (mock fácil)
- Swap de implementación (Jira Cloud → Jira Server)
- Cache transparente

### 2. Service Layer Pattern (Existente - Mantener)

Business logic centralizada en services.

```typescript
class JiraService {
  constructor(
    private jiraApiRepo: JiraApiRepository,
    private jiraCacheRepo: JiraRedisRepository,
    private jiraDbRepo: JiraIssueDataSource
  ) {}

  async getIssue(issueKey: string): Promise<JiraIssue> {
    // 1. Check cache
    const cached = await this.jiraCacheRepo.get(issueKey)
    if (cached) return cached

    // 2. Fetch from API
    const issue = await this.jiraApiRepo.getIssue(issueKey)

    // 3. Cache result
    await this.jiraCacheRepo.set(issueKey, issue, 300)

    // 4. Optional: Persist to DB for analytics
    await this.jiraDbRepo.upsert(issue)

    return issue
  }
}
```

### 3. Singleton Pattern (Existente - Mantener)

Controllers y services como singletons.

```typescript
export class JiraService {
  private static instance: JiraService

  private constructor() {
    // Initialize repositories
  }

  public static getInstance(): JiraService {
    if (!JiraService.instance) {
      JiraService.instance = new JiraService()
    }
    return JiraService.instance
  }
}
```

### 4. Factory Pattern (Para Múltiples Providers)

Similar a imagen generation (OpenAI/Gemini/Leap).

```typescript
// Para futuro: múltiples issue trackers
enum IssueTrackerType {
  JIRA = 'jira',
  LINEAR = 'linear',
  GITHUB = 'github',
}

interface IIssueTrackerRepository {
  getIssue(id: string): Promise<Issue>
  createIssue(data: CreateIssueDTO): Promise<Issue>
  updateIssue(id: string, data: UpdateIssueDTO): Promise<Issue>
  searchIssues(query: string): Promise<Issue[]>
}

class IssueTrackerFactory {
  static create(type: IssueTrackerType): IIssueTrackerRepository {
    switch (type) {
      case IssueTrackerType.JIRA:
        return new JiraApiRepository()
      case IssueTrackerType.LINEAR:
        return new LinearApiRepository()
      default:
        throw new Error(`Unsupported tracker: ${type}`)
    }
  }
}
```

### 5. Observer Pattern (Para Webhooks)

Event-driven architecture para webhooks.

```typescript
interface WebhookEvent {
  type: string
  source: 'jira' | 'bitbucket'
  payload: any
  timestamp: Date
}

interface IWebhookHandler {
  canHandle(event: WebhookEvent): boolean
  handle(event: WebhookEvent): Promise<void>
}

class WebhookEventBus {
  private handlers: IWebhookHandler[] = []

  registerHandler(handler: IWebhookHandler): void {
    this.handlers.push(handler)
  }

  async emit(event: WebhookEvent): Promise<void> {
    for (const handler of this.handlers) {
      if (handler.canHandle(event)) {
        await handler.handle(event)
      }
    }
  }
}

// Uso
const eventBus = WebhookEventBus.getInstance()

eventBus.registerHandler(new IssueCreatedHandler())
eventBus.registerHandler(new PRMergedHandler())
eventBus.registerHandler(new CacheInvalidationHandler())
eventBus.registerHandler(new NotificationHandler())
```

### 6. Chain of Responsibility (Para AI Classification)

Clasificación de intents en cadena.

```typescript
interface IntentClassifier {
  classify(message: string): Promise<Intent | null>
  setNext(classifier: IntentClassifier): void
}

class ExplicitCommandClassifier implements IntentClassifier {
  private next: IntentClassifier | null = null

  setNext(classifier: IntentClassifier): void {
    this.next = classifier
  }

  async classify(message: string): Promise<Intent | null> {
    // Check for explicit commands: .jira, .bb
    if (message.startsWith('.jira')) {
      return this.parseJiraCommand(message)
    }
    if (message.startsWith('.bb')) {
      return this.parseBitbucketCommand(message)
    }

    // Pass to next classifier
    return this.next?.classify(message) || null
  }
}

class AIIntentClassifier implements IntentClassifier {
  private next: IntentClassifier | null = null

  async classify(message: string): Promise<Intent | null> {
    // Use OpenAI to classify
    const intent = await this.classifyWithAI(message)
    return intent || this.next?.classify(message) || null
  }
}

// Setup chain
const explicitClassifier = new ExplicitCommandClassifier()
const aiClassifier = new AIIntentClassifier()
const fallbackClassifier = new FallbackClassifier()

explicitClassifier.setNext(aiClassifier)
aiClassifier.setNext(fallbackClassifier)

// Use
const intent = await explicitClassifier.classify(userMessage)
```

### 7. Strategy Pattern (Para Merge Strategies)

```typescript
interface MergeStrategy {
  merge(pr: PullRequest): Promise<MergeResult>
}

class MergeCommitStrategy implements MergeStrategy {
  async merge(pr: PullRequest): Promise<MergeResult> {
    // Create merge commit
  }
}

class SquashMergeStrategy implements MergeStrategy {
  async merge(pr: PullRequest): Promise<MergeResult> {
    // Squash and merge
  }
}

class FastForwardStrategy implements MergeStrategy {
  async merge(pr: PullRequest): Promise<MergeResult> {
    // Fast-forward merge
  }
}

class MergeContext {
  constructor(private strategy: MergeStrategy) {}

  setStrategy(strategy: MergeStrategy): void {
    this.strategy = strategy
  }

  async executeMerge(pr: PullRequest): Promise<MergeResult> {
    return this.strategy.merge(pr)
  }
}
```

---

## Estructura de Módulos

### Módulo Completo (Jira Example)

```
src/modules/jira/
├── controller/
│   ├── jira.controller.ts              # Slack message handlers
│   │   - @SlackAuth decorator
│   │   - handleMessage()
│   │   - handleAction() for buttons
│   ├── jiraWeb.controller.ts           # REST + Socket.io
│   │   - @HttpAuth decorator
│   │   - @Permission decorators
│   │   - GET/POST/PUT/DELETE routes
│   │   - Socket.io event handlers
│   └── __tests__/
│       ├── jira.controller.test.ts
│       └── jiraWeb.controller.test.ts
│
├── services/
│   ├── jira.service.ts                 # Core business logic
│   │   - getIssue(), createIssue(), etc.
│   │   - Cache-first approach
│   │   - Error handling
│   ├── jiraWebhook.service.ts          # Process webhook events
│   │   - processEvent()
│   │   - Route to specific handlers
│   ├── jiraSync.service.ts             # Background sync
│   │   - incrementalSync()
│   │   - fullSync()
│   └── __tests__/
│
├── repositories/
│   ├── jiraApi.repository.ts           # Jira Cloud API wrapper
│   │   - Authentication
│   │   - Rate limiting
│   │   - Request/response mapping
│   ├── database/
│   │   ├── jiraIssue.dataSource.ts     # TypeORM operations
│   │   ├── jiraSprint.dataSource.ts
│   │   └── jiraProject.dataSource.ts
│   ├── redis/
│   │   └── jiraRedis.repository.ts     # Cache operations
│   └── __tests__/
│
├── webhooks/
│   ├── jiraWebhook.controller.ts       # POST /webhooks/jira
│   │   - Signature verification
│   │   - Event validation
│   │   - Async processing
│   ├── handlers/
│   │   ├── issueCreated.handler.ts     # Implements IWebhookHandler
│   │   ├── issueUpdated.handler.ts
│   │   ├── issueTransitioned.handler.ts
│   │   ├── commentAdded.handler.ts
│   │   ├── sprintStarted.handler.ts
│   │   └── sprintCompleted.handler.ts
│   ├── filters/
│   │   └── eventFilter.ts              # Filter relevant events
│   └── __tests__/
│
├── shared/
│   ├── constants/
│   │   └── jira.constants.ts
│   │       - API endpoints
│   │       - Issue types
│   │       - Priority levels
│   │       - Status names
│   │       - Redis key prefixes
│   │       - Cache TTLs
│   ├── interfaces/
│   │   ├── jira.interfaces.ts          # Common interfaces
│   │   ├── jiraIssue.interface.ts
│   │   ├── jiraSprint.interface.ts
│   │   ├── jiraProject.interface.ts
│   │   └── webhooks.interface.ts
│   └── schemas/
│       ├── createIssue.schema.ts       # Zod schemas
│       ├── updateIssue.schema.ts
│       ├── searchIssues.schema.ts
│       └── transitionIssue.schema.ts
│
└── utils/
    ├── jiraFormatters.ts               # Format for Slack/Web
    │   - formatIssueForSlack()
    │   - formatIssueForWeb()
    │   - formatSprintSummary()
    ├── jql.builder.ts                  # JQL query builder
    │   - Fluent interface
    │   - Type-safe
    ├── issueParser.ts                  # Parse text to issue
    │   - Extract data from natural language
    ├── fieldMapper.ts                  # Map custom fields
    │   - Dynamic field discovery
    │   - Field name → ID mapping
    └── __tests__/
```

### Registro en App

```typescript
// src/app.ts
export class App {
  private jiraController: JiraController
  private jiraWebController: JiraWebController
  private bitbucketController: BitbucketController
  private bitbucketWebController: BitbucketWebController
  
  // Webhook controllers
  private jiraWebhookController: JiraWebhookController
  private bitbucketWebhookController: BitbucketWebhookController

  constructor() {
    // Initialize controllers (singletons)
    this.jiraController = JiraController.getInstance()
    this.jiraWebController = JiraWebController.getInstance()
    this.bitbucketController = BitbucketController.getInstance()
    this.bitbucketWebController = BitbucketWebController.getInstance()
    
    this.jiraWebhookController = JiraWebhookController.getInstance()
    this.bitbucketWebhookController = BitbucketWebhookController.getInstance()

    // Register routes
    this.setupRoutes()
    
    // Register Slack listeners
    this.setupSlackListeners()
    
    // Register webhook handlers
    this.setupWebhookHandlers()
  }

  private setupRoutes(): void {
    // Jira routes
    this.app.get('/jira/issues/:issueKey', 
      this.jiraWebController.getIssue.bind(this.jiraWebController))
    this.app.post('/jira/issues', 
      this.jiraWebController.createIssue.bind(this.jiraWebController))
    // ... más routes

    // Bitbucket routes
    this.app.get('/bitbucket/pullrequests', 
      this.bitbucketWebController.listPRs.bind(this.bitbucketWebController))
    // ... más routes

    // Webhook endpoints
    this.app.post('/webhooks/jira',
      this.jiraWebhookController.handleWebhook.bind(this.jiraWebhookController))
    this.app.post('/webhooks/bitbucket',
      this.bitbucketWebhookController.handleWebhook.bind(this.bitbucketWebhookController))
  }

  private setupSlackListeners(): void {
    // Jira commands
    this.slackApp.message(/^\.jira/, 
      this.jiraController.handleMessage.bind(this.jiraController))
    
    // Bitbucket commands
    this.slackApp.message(/^\.bb/, 
      this.bitbucketController.handleMessage.bind(this.bitbucketController))
  }
}
```

---

## Cacheo y Optimización

### Estrategia de Cache Multi-Layer

```typescript
// 1. In-memory cache (opcional, para datos muy hot)
class MemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>()

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    return item.value
  }

  set(key: string, value: any, ttlSeconds: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    })
  }
}

// 2. Redis cache (principal)
class JiraRedisRepository {
  async getIssue(issueKey: string): Promise<JiraIssue | null> {
    const key = `jira:issue:${issueKey}`
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async setIssue(issue: JiraIssue, ttl: number = 300): Promise<void> {
    const key = `jira:issue:${issue.key}`
    await this.redis.setex(key, ttl, JSON.stringify(issue))
  }
}

// 3. Database (para analytics e histórico)
class JiraIssueDataSource {
  async upsert(issue: JiraIssue): Promise<void> {
    await this.repo.upsert(issue, ['issueKey'])
  }
}

// Service with multi-layer cache
class JiraService {
  async getIssue(issueKey: string): Promise<JiraIssue> {
    // Layer 1: Memory (optional)
    let issue = this.memoryCache.get(issueKey)
    if (issue) {
      this.log.debug({ issueKey }, 'Cache hit: memory')
      return issue
    }

    // Layer 2: Redis
    issue = await this.redisRepo.getIssue(issueKey)
    if (issue) {
      this.log.debug({ issueKey }, 'Cache hit: Redis')
      this.memoryCache.set(issueKey, issue, 60) // 1 min in memory
      return issue
    }

    // Layer 3: Database (recent data)
    issue = await this.dbRepo.findByKey(issueKey)
    if (issue && this.isRecentEnough(issue)) {
      this.log.debug({ issueKey }, 'Cache hit: DB')
      await this.redisRepo.setIssue(issue)
      this.memoryCache.set(issueKey, issue, 60)
      return issue
    }

    // Miss: Fetch from API
    this.log.debug({ issueKey }, 'Cache miss: fetching from API')
    issue = await this.apiRepo.getIssue(issueKey)
    
    // Populate caches
    await this.redisRepo.setIssue(issue)
    await this.dbRepo.upsert(issue)
    this.memoryCache.set(issueKey, issue, 60)
    
    return issue
  }

  private isRecentEnough(issue: JiraIssue): boolean {
    const ageMinutes = (Date.now() - issue.lastUpdated.getTime()) / 60000
    return ageMinutes < 5
  }
}
```

### Cache Invalidation Strategy

```typescript
class CacheInvalidationService {
  async invalidateIssue(issueKey: string): Promise<void> {
    // Invalidate all related caches
    await Promise.all([
      this.redis.del(`jira:issue:${issueKey}`),
      this.redis.del(`jira:issue:${issueKey}:comments`),
      this.invalidateUserIssues(issueKey),
      this.invalidateSprintIssues(issueKey),
    ])
    
    this.memoryCache.delete(issueKey)
  }

  private async invalidateUserIssues(issueKey: string): Promise<void> {
    // Get assignee from issue
    const issue = await this.dbRepo.findByKey(issueKey)
    if (issue?.assignee) {
      await this.redis.del(`jira:user:${issue.assignee}:issues`)
    }
  }
}

// Webhook handler triggers invalidation
class IssueUpdatedHandler implements IWebhookHandler {
  async handle(event: WebhookEvent): Promise<void> {
    const issueKey = event.payload.issue.key
    
    // Invalidate caches
    await this.cacheInvalidationService.invalidateIssue(issueKey)
    
    // Send notifications
    await this.notificationService.notifyIssueUpdated(issueKey)
  }
}
```

### Batch Processing & Prefetching

```typescript
class BatchProcessor {
  async fetchMultipleIssues(keys: string[]): Promise<Map<string, JiraIssue>> {
    const results = new Map<string, JiraIssue>()
    const misses: string[] = []

    // Check cache first
    for (const key of keys) {
      const cached = await this.redisRepo.getIssue(key)
      if (cached) {
        results.set(key, cached)
      } else {
        misses.push(key)
      }
    }

    // Batch fetch misses
    if (misses.length > 0) {
      const issues = await this.apiRepo.batchGetIssues(misses)
      
      // Cache results
      await Promise.all(
        issues.map(issue => this.redisRepo.setIssue(issue))
      )
      
      issues.forEach(issue => results.set(issue.key, issue))
    }

    return results
  }
}

// Prefetch related data
class SmartPrefetcher {
  async prefetchRelatedData(issueKey: string): Promise<void> {
    const issue = await this.jiraService.getIssue(issueKey)
    
    // Prefetch in background
    Promise.all([
      this.prefetchComments(issueKey),
      this.prefetchSubtasks(issue.subtasks),
      this.prefetchLinkedIssues(issue.links),
      this.prefetchAttachments(issueKey),
    ]).catch(error => {
      this.log.warn({ err: error }, 'Prefetch failed')
    })
  }
}
```

---

## Seguridad y Validaciones

### Input Validation con Zod

```typescript
// createIssue.schema.ts
import { z } from 'zod'

export const createIssueSchema = z.object({
  projectKey: z.string()
    .min(1)
    .max(10)
    .regex(/^[A-Z]+$/, 'Project key must be uppercase letters'),
  
  issueType: z.enum(['Bug', 'Task', 'Story', 'Epic', 'Subtask']),
  
  summary: z.string()
    .min(5, 'Summary must be at least 5 characters')
    .max(255, 'Summary must be less than 255 characters')
    .refine(val => !val.includes('<script>'), 'No script tags allowed'),
  
  description: z.string()
    .max(32000)
    .optional()
    .transform(val => (typeof val === 'string' ? sanitizeHtml(val) : val)),
  
  priority: z.enum(['Lowest', 'Low', 'Medium', 'High', 'Highest'])
    .optional()
    .default('Medium'),
  
  assignee: z.string()
    .email()
    .optional(),
  
  labels: z.array(z.string().max(255))
    .max(20)
    .optional(),
  
  components: z.array(z.string())
    .max(10)
    .optional(),
  
  parentKey: z.string()
    .regex(/^[A-Z]+-\d+$/)
    .optional(),
})

export type CreateIssueDTO = z.infer<typeof createIssueSchema>

// Controller usage
@Post('/issues')
async createIssue(@Req() req: Request, @Res() res: Response) {
  const data = validateBody(createIssueSchema, req.body)
  const issue = await this.jiraService.createIssue(data)
  return res.json(issue)
}
```

### Authentication & Authorization

```typescript
// Existing @HttpAuth decorator
// Extend for Atlassian-specific permissions

enum AtlassianPermission {
  JIRA_READ = 'jira:read',
  JIRA_WRITE = 'jira:write',
  JIRA_ADMIN = 'jira:admin',
  BB_READ = 'bitbucket:read',
  BB_WRITE = 'bitbucket:write',
  BB_ADMIN = 'bitbucket:admin',
}

@Controller('/jira')
export class JiraWebController {
  @Get('/issues/:issueKey')
  @HttpAuth()
  @Permission(AtlassianPermission.JIRA_READ)
  async getIssue(@Req() req: Request) {
    // ...
  }

  @Post('/issues')
  @HttpAuth()
  @Permission(AtlassianPermission.JIRA_WRITE)
  async createIssue(@Req() req: Request) {
    // ...
  }

  @Delete('/projects/:key')
  @HttpAuth()
  @Permission(AtlassianPermission.JIRA_ADMIN)
  async deleteProject(@Req() req: Request) {
    // ...
  }
}
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

// Per-user rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: res.getHeader('Retry-After')
    })
  },
  keyGenerator: (req) => {
    // Use user ID instead of IP
    return req.user?.id.toString() || req.ip
  }
})

this.app.use('/jira', apiLimiter)
this.app.use('/bitbucket', apiLimiter)

// Webhook endpoint: separate, higher limits
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 webhooks per minute
})

this.app.use('/webhooks', webhookLimiter)
```

### XSS & Injection Prevention

```typescript
import sanitizeHtml from 'sanitize-html'

class SecurityUtils {
  static sanitizeMarkdown(input: string): string {
    return sanitizeHtml(input, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'ul', 'ol', 'li'],
      allowedAttributes: {
        'a': ['href']
      },
      allowedSchemes: ['http', 'https', 'mailto']
    })
  }

  static sanitizeJQL(jql: string): string {
    // Prevent JQL injection
    const dangerous = [';', '--', '/*', '*/', 'xp_', 'sp_']
    for (const pattern of dangerous) {
      if (jql.includes(pattern)) {
        throw new BadRequestError('Invalid JQL query')
      }
    }
    return jql
  }

  static validateIssueKey(key: string): boolean {
    return /^[A-Z]+-\d+$/.test(key)
  }
}
```

---

## Testing Strategy

### Pirámide de Testing

```
        /\
       /E2E\         (10%) - Critical paths
      /------\
     /Integr.\      (20%) - API integration
    /----------\
   /   Unit     \   (70%) - Business logic
  /--------------\
```

### Unit Tests

```typescript
// jira.service.test.ts
describe('JiraService', () => {
  let service: JiraService
  let mockApiRepo: jest.Mocked<JiraApiRepository>
  let mockRedisRepo: jest.Mocked<JiraRedisRepository>
  let mockDbRepo: jest.Mocked<JiraIssueDataSource>

  beforeEach(() => {
    mockApiRepo = createMock<JiraApiRepository>()
    mockRedisRepo = createMock<JiraRedisRepository>()
    mockDbRepo = createMock<JiraIssueDataSource>()
    
    service = new JiraService(mockApiRepo, mockRedisRepo, mockDbRepo)
  })

  describe('getIssue', () => {
    it('should return from cache if available', async () => {
      const cachedIssue = createMockIssue('PROJ-123')
      mockRedisRepo.getIssue.mockResolvedValue(cachedIssue)

      const result = await service.getIssue('PROJ-123')

      expect(result).toEqual(cachedIssue)
      expect(mockApiRepo.getIssue).not.toHaveBeenCalled()
    })

    it('should fetch from API on cache miss', async () => {
      const apiIssue = createMockIssue('PROJ-123')
      mockRedisRepo.getIssue.mockResolvedValue(null)
      mockApiRepo.getIssue.mockResolvedValue(apiIssue)

      const result = await service.getIssue('PROJ-123')

      expect(result).toEqual(apiIssue)
      expect(mockRedisRepo.setIssue).toHaveBeenCalledWith(apiIssue, 300)
      expect(mockDbRepo.upsert).toHaveBeenCalledWith(apiIssue)
    })

    it('should handle API errors gracefully', async () => {
      mockRedisRepo.getIssue.mockResolvedValue(null)
      mockApiRepo.getIssue.mockRejectedValue(new Error('API error'))

      await expect(service.getIssue('PROJ-123'))
        .rejects.toThrow('API error')
    })
  })

  describe('createIssue', () => {
    it('should validate input before creating', async () => {
      const invalidData = { summary: '' } // Invalid

      await expect(service.createIssue(invalidData as any))
        .rejects.toThrow(BadRequestError)
    })

    it('should create issue and invalidate caches', async () => {
      const data = createValidIssueData()
      const createdIssue = createMockIssue('PROJ-124')
      mockApiRepo.createIssue.mockResolvedValue(createdIssue)

      const result = await service.createIssue(data)

      expect(result).toEqual(createdIssue)
      expect(mockRedisRepo.delete).toHaveBeenCalledWith(expect.stringContaining('user'))
    })
  })
})
```

### Integration Tests

```typescript
// jira.integration.test.ts
describe('Jira Integration', () => {
  let app: Express
  let jiraService: JiraService

  beforeAll(async () => {
    // Setup test app with real services but mocked Jira API
    app = await createTestApp()
    jiraService = JiraService.getInstance()
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  describe('POST /jira/issues', () => {
    it('should create issue via REST endpoint', async () => {
      const issueData = {
        projectKey: 'TEST',
        issueType: 'Task',
        summary: 'Test issue',
        priority: 'High',
      }

      const response = await request(app)
        .post('/jira/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .send(issueData)
        .expect(201)

      expect(response.body).toHaveProperty('key')
      expect(response.body.summary).toBe('Test issue')
    })

    it('should validate input and return 400 on invalid data', async () => {
      const invalidData = {
        projectKey: 'TEST',
        // Missing required fields
      }

      const response = await request(app)
        .post('/jira/issues')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('summary')
    })
  })
})
```

### E2E Tests

```typescript
// e2e/jira-workflow.test.ts
describe('Jira Workflow E2E', () => {
  it('should complete full issue lifecycle', async () => {
    // 1. Create issue via Slack command
    const issueKey = await sendSlackMessage('.jira create -t Task -s "E2E test"')
    expect(issueKey).toMatch(/^TEST-\d+$/)

    // 2. Verify webhook received
    await waitFor(() => {
      expect(mockWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookEvent: 'jira:issue_created',
          issue: expect.objectContaining({ key: issueKey })
        })
      )
    })

    // 3. Transition via REST API
    await request(app)
      .post(`/jira/issues/${issueKey}/transitions`)
      .send({ transitionName: 'In Progress' })
      .expect(200)

    // 4. Verify notification sent
    expect(mockSlackNotification).toHaveBeenCalledWith(
      expect.stringContaining('moved to In Progress')
    )

    // 5. Add comment via Slack
    await sendSlackMessage(`.jira comment ${issueKey} "Test comment"`)

    // 6. Verify issue state
    const issue = await jiraService.getIssue(issueKey)
    expect(issue.status).toBe('In Progress')
    expect(issue.comments).toHaveLength(1)
  })
})
```

---

## Resumen

Arquitectura técnica detallada manteniendo patrones existentes del proyecto: Repository, Service Layer, Singleton. Se añaden Factory (multi-provider support), Observer (webhooks), Chain of Responsibility (AI intent classification), y Strategy (merge strategies). Estructura modular completa por feature con controllers (Slack + Web), services, repositories (API + DB + Redis), webhooks con handlers, shared (constants/interfaces/schemas Zod), y utils. Cache multi-layer: memory (1 min) → Redis (5 min) → DB (histórico) → API, con invalidación event-driven vía webhooks. Seguridad: validación Zod en todos los endpoints, sanitización HTML, rate limiting (100 req/15min users, 1000/min webhooks), permisos granulares con decorators @Permission. Testing: pirámide 70% unit / 20% integration / 10% E2E, mocking completo de APIs externas, coverage >85% target. Optimización: batch processing, prefetching inteligente, connection pooling, retry con exponential backoff.
