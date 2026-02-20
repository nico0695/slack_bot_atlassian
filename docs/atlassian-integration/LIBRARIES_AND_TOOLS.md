# Libraries and Tools - Atlassian Integration

## Core SDK y APIs

### Jira Client

```bash
npm install --save jira-client
npm install --save @types/jira-client --save-dev
```

**Uso:**
```typescript
import JiraClient from 'jira-client'

const client = new JiraClient({
  protocol: 'https',
  host: process.env.JIRA_HOST,
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN,
  apiVersion: '3',
  strictSSL: true,
})

// Methods disponibles
await client.findIssue(issueKey)
await client.addNewIssue(issue)
await client.updateIssue(issueKey, update)
await client.searchJira(jql, options)
await client.listTransitions(issueKey)
await client.transitionIssue(issueKey, transition)
await client.addComment(issueKey, comment)
await client.getProject(projectKey)
```

**Alternativa: Jira.js (más moderno)**
```bash
npm install --save jira.js
```

```typescript
import { Version3Client } from 'jira.js'

const client = new Version3Client({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
})
```

### Bitbucket API (axios)

```bash
npm install --save axios
```

```typescript
import axios, { AxiosInstance } from 'axios'

const bitbucket: AxiosInstance = axios.create({
  baseURL: 'https://api.bitbucket.org/2.0',
  auth: {
    username: process.env.BITBUCKET_USERNAME,
    password: process.env.BITBUCKET_APP_PASSWORD,
  },
  timeout: 10000,
})

// Uso
const repos = await bitbucket.get('/repositories/workspace')
const prs = await bitbucket.get('/repositories/workspace/repo/pullrequests')
const commits = await bitbucket.get('/repositories/workspace/repo/commits')
```

**Alternativa: bitbucket-rest-api**
```bash
npm install --save bitbucket-rest-api
```

---

## Rate Limiting & Request Management

### Bottleneck (Rate Limiter)

```bash
npm install --save bottleneck
npm install --save @types/bottleneck --save-dev
```

```typescript
import Bottleneck from 'bottleneck'

// Jira: 5 requests/sec
const jiraLimiter = new Bottleneck({
  minTime: 200,  // 200ms between requests
  maxConcurrent: 3,
  reservoir: 10,
  reservoirRefreshAmount: 10,
  reservoirRefreshInterval: 1000,
})

// Wrap API calls
const getIssue = jiraLimiter.wrap(async (key: string) => {
  return client.findIssue(key)
})

// Bitbucket: 1000 requests/hour
const bbLimiter = new Bottleneck({
  reservoir: 1000,
  reservoirRefreshAmount: 1000,
  reservoirRefreshInterval: 60 * 60 * 1000,
  maxConcurrent: 5,
})
```

### p-retry (Retry con Backoff)

```bash
npm install --save p-retry
```

```typescript
import pRetry from 'p-retry'

const issue = await pRetry(
  async () => {
    return client.findIssue(issueKey)
  },
  {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 5000,
    onFailedAttempt: error => {
      log.warn({ err: error, attempt: error.attemptNumber }, 'Retry attempt')
    },
  }
)
```

### p-limit (Concurrency Control)

```bash
npm install --save p-limit
```

```typescript
import pLimit from 'p-limit'

const limit = pLimit(5) // Max 5 concurrent

const promises = issueKeys.map(key => 
  limit(() => jiraService.getIssue(key))
)

const issues = await Promise.all(promises)
```

---

## Parsing & Formatting

### markdown-it (Markdown Rendering)

```bash
npm install --save markdown-it
npm install --save @types/markdown-it --save-dev
```

```typescript
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})

const html = md.render(jiraIssue.description)
```

### sanitize-html (XSS Protection)

```bash
npm install --save sanitize-html
npm install --save @types/sanitize-html --save-dev
```

```typescript
import sanitizeHtml from 'sanitize-html'

const clean = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
  allowedAttributes: {
    'a': ['href']
  },
})
```

### diff (Git Diff Parser)

```bash
npm install --save diff
npm install --save @types/diff --save-dev
```

```typescript
import * as Diff from 'diff'

const patch = Diff.parsePatch(diffString)
const changes = Diff.diffLines(oldContent, newContent)

// `log` represents your module logger (e.g. a Pino logger instance)
for (const change of changes) {
  if (change.added) {
    log.info({ value: change.value }, 'Line added')
  } else if (change.removed) {
    log.info({ value: change.value }, 'Line removed')
  }
}
```

### parse-diff (Alternative)

```bash
npm install --save parse-diff
```

```typescript
import parseDiff from 'parse-diff'

const files = parseDiff(diffString)

// `log` represents your module logger (e.g. a Pino logger instance)
files.forEach(file => {
  log.info({ file: file.to, additions: file.additions, deletions: file.deletions }, 'Parsed diff file')
  
  file.chunks.forEach(chunk => {
    chunk.changes.forEach(change => {
      if (change.type === 'add') {
        log.debug({ line: change.ln, content: change.content }, 'Line added')
      }
    })
  })
})
```

---

## Visualización de Datos

### chart.js (Charts para Analytics)

```bash
npm install --save chart.js
npm install --save chartjs-node-canvas
```

```typescript
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
  width: 800, 
  height: 600 
})

// Velocity chart
const configuration = {
  type: 'line',
  data: {
    labels: sprints.map(s => s.name),
    datasets: [{
      label: 'Velocity',
      data: sprints.map(s => s.completedPoints),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
}

const buffer = await chartJSNodeCanvas.renderToBuffer(configuration)
// Upload buffer to external storage or send inline
```

### d3 (Advanced Visualizations)

```bash
npm install --save d3
npm install --save @types/d3 --save-dev
npm install --save jsdom  # For server-side rendering
```

```typescript
import * as d3 from 'd3'
import { JSDOM } from 'jsdom'

// Create virtual DOM
const dom = new JSDOM('<!DOCTYPE html><body></body>')
const body = d3.select(dom.window.document.querySelector('body'))

// Create burndown chart
const svg = body.append('svg')
  .attr('width', 800)
  .attr('height', 600)

// ... d3 visualization code

const svgString = body.html()
```

---

## Exportación de Reportes

### pdfkit (PDF Generation)

```bash
npm install --save pdfkit
npm install --save @types/pdfkit --save-dev
```

```typescript
import PDFDocument from 'pdfkit'
import fs from 'fs'

const doc = new PDFDocument()
doc.pipe(fs.createWriteStream('sprint-report.pdf'))

// Title
doc.fontSize(25).text('Sprint Report', 100, 80)

// Content
doc.fontSize(12)
  .text(`Sprint: ${sprint.name}`, 100, 120)
  .text(`Velocity: ${velocity.completed} points`, 100, 140)

// Table
doc.moveDown()
issues.forEach((issue, i) => {
  doc.text(`${i + 1}. ${issue.key}: ${issue.summary}`, 100, 160 + i * 20)
})

doc.end()
```

### json2csv (CSV Export)

```bash
npm install --save json2csv
npm install --save @types/json2csv --save-dev
```

```typescript
import { parse } from 'json2csv'

const fields = ['key', 'summary', 'status', 'assignee', 'storyPoints']
const opts = { fields }

const csv = parse(issues, opts)

fs.writeFileSync('issues.csv', csv)
```

---

## Code Analysis

### esprima (JavaScript Parser)

```bash
npm install --save esprima
npm install --save @types/esprima --save-dev
```

```typescript
import * as esprima from 'esprima'

const code = await bitbucketService.getFileContent(repo, 'src/app.js')
const ast = esprima.parseScript(code)

// Analyze AST
const functions = []
esprima.traverse(ast, {
  enter: (node) => {
    if (node.type === 'FunctionDeclaration') {
      functions.push(node.id.name)
    }
  }
})
```

### typescript (TypeScript Compiler API)

```bash
npm install --save typescript
```

```typescript
import * as ts from 'typescript'

const sourceFile = ts.createSourceFile(
  'temp.ts',
  fileContent,
  ts.ScriptTarget.Latest,
  true
)

// Find all function declarations
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node)) {
    console.log(node.name?.text)
  }
  ts.forEachChild(node, visit)
}

visit(sourceFile)
```

### eslint (Linting)

```bash
npm install --save eslint
```

```typescript
import { ESLint } from 'eslint'

const eslint = new ESLint()

const results = await eslint.lintText(code)

results.forEach(result => {
  result.messages.forEach(msg => {
    console.log(`${msg.line}:${msg.column} ${msg.message}`)
  })
})
```

---

## Utilidades de Fecha/Tiempo

### date-fns (Date Utilities)

```bash
npm install --save date-fns
```

```typescript
import { 
  addDays, 
  differenceInDays, 
  format, 
  parseISO,
  isWeekend,
  addBusinessDays
} from 'date-fns'

// Calculate sprint duration
const duration = differenceInDays(sprint.endDate, sprint.startDate)

// Add business days (skip weekends)
const deadline = addBusinessDays(new Date(), 10)

// Format for display
const formatted = format(new Date(), 'yyyy-MM-dd HH:mm:ss')

// Parse ISO dates from Jira/Bitbucket
const date = parseISO('2024-06-30T10:00:00.000Z')
```

### cron-parser (Parse Cron Expressions)

```bash
npm install --save cron-parser
```

```typescript
import parser from 'cron-parser'

const interval = parser.parseExpression('0 9 * * 1-5')

// Next 5 weekday mornings at 9am
for (let i = 0; i < 5; i++) {
  console.log(interval.next().toString())
}
```

---

## Testing

### nock (HTTP Mocking)

```bash
npm install --save-dev nock
```

```typescript
import nock from 'nock'

describe('JiraService', () => {
  it('should fetch issue from API', async () => {
    // Mock Jira API
    nock('https://your-domain.atlassian.net')
      .get('/rest/api/3/issue/PROJ-123')
      .reply(200, {
        key: 'PROJ-123',
        fields: {
          summary: 'Test issue',
          status: { name: 'Open' }
        }
      })

    const issue = await jiraService.getIssue('PROJ-123')
    expect(issue.key).toBe('PROJ-123')
  })
})
```

### supertest (API Testing)

```bash
npm install --save-dev supertest
npm install --save-dev @types/supertest
```

```typescript
import request from 'supertest'
import { app } from '../app'

describe('Jira API', () => {
  it('GET /jira/issues/:key should return issue', async () => {
    const response = await request(app)
      .get('/jira/issues/PROJ-123')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body).toHaveProperty('key', 'PROJ-123')
  })
})
```

---

## DevOps & Monitoring

### prom-client (Prometheus Metrics)

```bash
npm install --save prom-client
```

```typescript
import { Registry, Counter, Histogram } from 'prom-client'

const register = new Registry()

// Metrics
const jiraApiCalls = new Counter({
  name: 'jira_api_calls_total',
  help: 'Total number of Jira API calls',
  labelNames: ['method', 'status'],
  registers: [register]
})

const apiDuration = new Histogram({
  name: 'jira_api_duration_seconds',
  help: 'Duration of Jira API calls',
  labelNames: ['method'],
  registers: [register]
})

// Usage
const end = apiDuration.startTimer({ method: 'getIssue' })
try {
  const issue = await client.findIssue(issueKey)
  jiraApiCalls.inc({ method: 'getIssue', status: 'success' })
  return issue
} catch (error) {
  jiraApiCalls.inc({ method: 'getIssue', status: 'error' })
  throw error
} finally {
  end()
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

### Logging (Pino - logger del proyecto)

La integración con Atlassian **no debe introducir nuevas librerías de logging** como `winston`.
En su lugar, reutiliza el logger estándar del proyecto basado en **Pino** a través de
`createModuleLogger()` (ver `src/config/logger.ts`).

```typescript
import { createModuleLogger } from '../../src/config/logger'

const log = createModuleLogger('atlassian.jira')

// Ejemplos de uso
log.info({ issueKey }, 'Jira issue fetched')
log.error({ err }, 'Failed to fetch Jira issue')
```

---

## Cache & Storage

### ioredis (Redis Client - ya existe en el proyecto)

```bash
npm install --save ioredis
npm install --save @types/ioredis --save-dev
```

```typescript
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000)
  }
})

// Advanced features
await redis.setex('key', 300, JSON.stringify(data))  // With TTL
await redis.expire('key', 600)  // Update TTL
await redis.keys('jira:issue:*')  // Pattern matching
await redis.scan(0, 'MATCH', 'jira:*', 'COUNT', 100)  // Efficient iteration
```

### node-cache (In-Memory Cache)

```bash
npm install --save node-cache
```

```typescript
import NodeCache from 'node-cache'

const cache = new NodeCache({
  stdTTL: 60,  // 60 seconds default
  checkperiod: 120,
  useClones: false,
})

cache.set('key', value, 300)  // 5 minutes
const cached = cache.get<JiraIssue>('key')
cache.del('key')
cache.flushAll()
```

---

## Workflow & Automation

### bull (Job Queue)

```bash
npm install --save bull
npm install --save @types/bull --save-dev
```

```typescript
import Queue from 'bull'

const syncQueue = new Queue('jira-sync', {
  redis: {
    host: process.env.REDIS_HOST,
    port: 6379
  }
})

// Add job
await syncQueue.add('sync-sprint', {
  sprintId: 42
}, {
  delay: 5000,  // Wait 5 seconds
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
})

// Process job
syncQueue.process('sync-sprint', async (job) => {
  await jiraSyncService.syncSprint(job.data.sprintId)
})

// Events
syncQueue.on('completed', (job) => {
  log.info({ jobId: job.id }, 'Job completed')
})

syncQueue.on('failed', (job, err) => {
  log.error({ jobId: job.id, err }, 'Job failed')
})
```

### node-cron (ya existe en el proyecto para alerts)

```typescript
import cron from 'node-cron'

// Sync Jira data every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await jiraSyncService.incrementalSync()
})

// Generate daily report at 9am weekdays
cron.schedule('0 9 * * 1-5', async () => {
  await reportGenerator.generateDailyReport()
})

// Sprint retrospective on last day
cron.schedule('0 17 * * 5', async () => {
  const sprint = await jiraService.getActiveSprint()
  if (sprint.isLastDay) {
    await reportGenerator.generateSprintReport(sprint.id)
  }
})
```

---

## Recomendaciones Adicionales

### Natural Language Processing

**compromise** (NLP para JS)
```bash
npm install --save compromise
```

```typescript
import nlp from 'compromise'

const doc = nlp('Create a high priority bug for the login module')

const verbs = doc.verbs().out('array')  // ['Create']
const nouns = doc.nouns().out('array')  // ['bug', 'login', 'module']

// Extract entities
if (doc.match('create').found) {
  // User wants to create something
}
```

### Template Engines

**handlebars** (para templates de mensajes/reportes)
```bash
npm install --save handlebars
```

```typescript
import Handlebars from 'handlebars'

const template = Handlebars.compile(`
# Sprint Report: {{sprint.name}}

## Completed
{{#each completed}}
- {{key}}: {{summary}} ({{storyPoints}} points)
{{/each}}

Total: {{totalPoints}} points
`)

const report = template({
  sprint: { name: 'Sprint 42' },
  completed: issues,
  totalPoints: 34
})
```

### Validation

> **⚠️ Note:** This project uses **Zod** as the standard validation library (see `src/shared/utils/validation.ts`). The `class-validator` example below is shown as reference only. **Use Zod schemas** for all new endpoints to maintain consistency.

**class-validator** (reference only — NOT recommended for this project)
```bash
npm install --save class-validator
npm install --save class-transformer
```

```typescript
import { IsString, IsEmail, IsEnum, MinLength } from 'class-validator'

class CreateIssueDTO {
  @IsString()
  @MinLength(5)
  summary: string

  @IsEnum(['Bug', 'Task', 'Story'])
  issueType: string

  @IsEmail()
  assignee?: string
}
```

---

## Package.json Additions

```json
{
  "dependencies": {
    "jira-client": "^8.2.2",
    "bottleneck": "^2.19.5",
    "p-retry": "^6.1.0",
    "p-limit": "^4.0.0",
    "markdown-it": "^13.0.2",
    "sanitize-html": "^2.11.0",
    "parse-diff": "^0.11.1",
    "chart.js": "^4.4.0",
    "chartjs-node-canvas": "^4.1.6",
    "pdfkit": "^0.14.0",
    "json2csv": "^6.0.0",
    "date-fns": "^2.30.0",
    "cron-parser": "^4.9.0",
    "node-cache": "^5.1.2",
    "bull": "^4.11.5",
    "compromise": "^14.10.0",
    "handlebars": "^4.7.8",
    "prom-client": "^15.1.0"
  },
  "devDependencies": {
    "@types/jira-client": "^7.1.9",
    "@types/bottleneck": "^2.19.5",
    "@types/markdown-it": "^13.0.7",
    "@types/sanitize-html": "^2.9.5",
    "@types/pdfkit": "^0.13.3",
    "@types/json2csv": "^5.0.7",
    "@types/bull": "^4.10.0",
    "nock": "^13.4.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2"
  }
}
```

---

## Instalación Completa

```bash
# Core SDKs
npm install --save jira-client axios

# Rate limiting & retry
npm install --save bottleneck p-retry p-limit

# Parsing & formatting
npm install --save markdown-it sanitize-html parse-diff

# Visualization
npm install --save chart.js chartjs-node-canvas

# Export
npm install --save pdfkit json2csv

# Utilities
npm install --save date-fns cron-parser node-cache

# Job queue
npm install --save bull

# NLP & templates
npm install --save compromise handlebars

# Monitoring
npm install --save prom-client

# Testing
npm install --save-dev nock supertest @types/supertest

# Type definitions
npm install --save-dev @types/jira-client @types/bottleneck @types/markdown-it @types/sanitize-html @types/pdfkit @types/json2csv @types/bull
```

---

## Resumen

Conjunto completo de librerías para integración Atlassian. **Core**: jira-client (SDK oficial), axios (Bitbucket API), bottleneck (rate limiting 5 req/sec Jira, 1000/hora BB), p-retry (retry con exponential backoff). **Parsing**: markdown-it (render descriptions), sanitize-html (XSS protection), parse-diff (git diff parser). **Visualization**: chart.js + chartjs-node-canvas (velocity/burndown charts), d3 + jsdom (advanced charts server-side). **Export**: pdfkit (sprint reports PDF), json2csv (export issues). **Analysis**: esprima/typescript compiler API (parse code), eslint (linting). **Utilities**: date-fns (business days, sprint duration), node-cache (in-memory hot cache), bull (job queue para sync jobs). **Testing**: nock (mock HTTP), supertest (API testing). **Monitoring**: prom-client (Prometheus metrics). **NLP**: compromise (entity extraction), handlebars (templates). Total ~30 librerías cubriendo todas necesidades. Instalación completa ~50MB dependencies. Compatibilidad: TypeScript + ESM/CommonJS, Node.js >=18.
