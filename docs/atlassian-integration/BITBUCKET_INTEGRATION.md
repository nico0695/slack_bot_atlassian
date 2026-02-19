# Bitbucket Integration - Detailed Plan

## Autenticación y Setup

### Métodos de Autenticación

#### 1. App Password (Recomendado para desarrollo)
```typescript
// bitbucketApi.repository.ts
import axios, { AxiosInstance } from 'axios'

export class BitbucketApiRepository {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.bitbucket.org/2.0',
      auth: {
        username: process.env.BITBUCKET_USERNAME,
        password: process.env.BITBUCKET_APP_PASSWORD,
      },
      timeout: 10000,
    })
  }
}
```

**Setup:**
1. Ir a Bitbucket Settings → Personal settings → App passwords
2. Crear nuevo app password con permisos necesarios
3. Guardar en .env

#### 2. OAuth 2.0 (Recomendado para producción)
```typescript
interface BitbucketOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// OAuth 2.0 flow implementation
// https://developer.atlassian.com/cloud/bitbucket/oauth-2/
```

### Variables de Entorno
```bash
# App Password method
BITBUCKET_WORKSPACE=your-workspace
BITBUCKET_USERNAME=your-username
BITBUCKET_APP_PASSWORD=your-app-password

# OAuth 2.0 method
BITBUCKET_OAUTH_CLIENT_ID=
BITBUCKET_OAUTH_CLIENT_SECRET=
BITBUCKET_OAUTH_REDIRECT_URI=https://yourapp.com/auth/bitbucket/callback

# Configuration
BITBUCKET_DEFAULT_REPO=main-repo
BITBUCKET_CACHE_TTL=180  # 3 minutes
BITBUCKET_RATE_LIMIT_PER_HOUR=1000
```

---

## Estructura del Módulo Bitbucket

### Arquitectura de Archivos
```
src/modules/bitbucket/
├── controller/
│   ├── bitbucket.controller.ts          # Slack handlers
│   ├── bitbucketWeb.controller.ts       # REST API + Socket.io
│   └── __tests__/
│       └── bitbucket.controller.test.ts
├── services/
│   ├── bitbucket.service.ts             # Business logic
│   ├── codeReview.service.ts            # AI code review
│   ├── pipeline.service.ts              # CI/CD monitoring
│   └── __tests__/
├── repositories/
│   ├── bitbucketApi.repository.ts       # Bitbucket API wrapper
│   ├── database/
│   │   ├── pullRequest.dataSource.ts
│   │   ├── repository.dataSource.ts
│   │   └── pipeline.dataSource.ts
│   ├── redis/
│   │   └── bitbucketRedis.repository.ts
│   └── __tests__/
├── webhooks/
│   ├── bitbucketWebhook.controller.ts   # POST /webhooks/bitbucket
│   ├── handlers/
│   │   ├── prCreated.handler.ts
│   │   ├── prUpdated.handler.ts
│   │   ├── prMerged.handler.ts
│   │   ├── prDeclined.handler.ts
│   │   ├── prApproved.handler.ts
│   │   ├── commitPushed.handler.ts
│   │   ├── buildStatusChanged.handler.ts
│   │   └── branchCreated.handler.ts
│   └── validators/
│       └── webhookValidator.ts
├── shared/
│   ├── constants/
│   │   └── bitbucket.constants.ts
│   ├── interfaces/
│   │   ├── bitbucket.interfaces.ts
│   │   ├── pullRequest.interface.ts
│   │   └── pipeline.interface.ts
│   └── schemas/
│       ├── createPR.schema.ts
│       ├── updatePR.schema.ts
│       └── searchCommits.schema.ts
└── utils/
    ├── bitbucketFormatters.ts
    ├── diffParser.ts                     # Parse git diffs
    ├── codeAnalyzer.ts                   # Static analysis
    └── branchNaming.ts                   # Branch naming conventions
```

---

## Funcionalidades por Complejidad

### Complejidad: SIMPLE (1-2 días cada una)

#### 1. Listar Repositorios
```typescript
// Comando Slack
.bb repos
.bb repositories

// REST
GET /bitbucket/repositories

// Implementación
async listRepositories(): Promise<BitbucketRepository[]> {
  const response = await this.client.get(
    `/repositories/${this.workspace}`
  )
  return response.data.values
}

interface BitbucketRepository {
  slug: string
  name: string
  description: string
  isPrivate: boolean
  mainBranch: string
  size: number
  language: string
  updatedOn: Date
}
```

#### 2. Ver Detalle de Repositorio
```typescript
// Comando
.bb repo main-repo

// REST
GET /bitbucket/repositories/:slug

interface RepositoryDetails {
  slug: string
  name: string
  description: string
  owner: string
  isPrivate: boolean
  mainBranch: string
  forkPolicy: string
  hasIssues: boolean
  hasWiki: boolean
  size: number
  language: string
  createdOn: Date
  updatedOn: Date
}
```

#### 3. Listar Branches
```typescript
// Comando
.bb branches
.bb branches REPO

// REST
GET /bitbucket/repositories/:slug/branches

interface Branch {
  name: string
  target: {
    hash: string
    date: Date
    message: string
    author: string
  }
}
```

#### 4. Ver Últimos Commits
```typescript
// Comando
.bb commits
.bb commits REPO
.bb commits REPO --branch develop

// REST
GET /bitbucket/repositories/:slug/commits?branch=...

// Implementación
async listCommits(
  repoSlug: string,
  branch?: string,
  limit: number = 10
): Promise<Commit[]> {
  const params = {
    ...(branch && { include: branch }),
    pagelen: limit,
  }
  
  const response = await this.client.get(
    `/repositories/${this.workspace}/${repoSlug}/commits`,
    { params }
  )
  
  return response.data.values
}

interface Commit {
  hash: string
  message: string
  author: {
    user: string
    raw: string
  }
  date: Date
  parents: { hash: string }[]
}
```

#### 5. Listar Pull Requests
```typescript
// Comando
.bb pr list
.bb prs
.bb pr list --state OPEN

// REST
GET /bitbucket/pullrequests?state=OPEN

enum PRState {
  OPEN = 'OPEN',
  MERGED = 'MERGED',
  DECLINED = 'DECLINED',
  SUPERSEDED = 'SUPERSEDED',
}

interface PullRequest {
  id: number
  title: string
  description: string
  state: PRState
  author: string
  sourceBranch: string
  destinationBranch: string
  createdOn: Date
  updatedOn: Date
  commentCount: number
  taskCount: number
  reviewers: Reviewer[]
}
```

### Complejidad: MEDIA (2-4 días cada una)

#### 6. Ver Detalle de Pull Request
```typescript
// Comando
.bb pr 123
.bb pr REPO/123

// REST
GET /bitbucket/pullrequests/:id

interface PRDetails extends PullRequest {
  mergeCommit: string | null
  closeSourceBranch: boolean
  participants: Participant[]
  buildStatuses: BuildStatus[]
  diffstat: {
    linesAdded: number
    linesRemoved: number
    filesChanged: number
  }
}

interface Participant {
  user: string
  role: 'PARTICIPANT' | 'REVIEWER'
  approved: boolean
  participated_on: Date
}
```

#### 7. Crear Pull Request
```typescript
// Comando
.bb pr create -s feature/login -t develop -title "Add OAuth login" -desc "..."

// REST
POST /bitbucket/pullrequests
Body: {
  repoSlug: string
  title: string
  description?: string
  sourceBranch: string
  destinationBranch: string
  closeSourceBranch?: boolean
  reviewers?: string[]
}

// Schema validation
export const createPRSchema = z.object({
  repoSlug: z.string().min(1),
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  sourceBranch: z.string().min(1),
  destinationBranch: z.string().min(1),
  closeSourceBranch: z.boolean().default(true),
  reviewers: z.array(z.string()).optional(),
})
```

#### 8. Aprobar/Rechazar PR
```typescript
// Comandos
.bb pr approve 123
.bb pr unapprove 123
.bb pr decline 123

// REST
POST /bitbucket/pullrequests/:id/approve
DELETE /bitbucket/pullrequests/:id/approve
POST /bitbucket/pullrequests/:id/decline
```

#### 9. Mergear Pull Request
```typescript
// Comando
.bb pr merge 123
.bb pr merge 123 --strategy squash
.bb pr merge 123 --message "Custom merge message"

// REST
POST /bitbucket/pullrequests/:id/merge
Body: {
  mergeStrategy?: 'merge_commit' | 'squash' | 'fast_forward'
  message?: string
  closeSourceBranch?: boolean
}

// Implementación con validaciones
async mergePR(
  prId: number,
  options: MergePROptions
): Promise<MergeResult> {
  // 1. Verificar estado del PR
  const pr = await this.getPR(prId)
  if (pr.state !== 'OPEN') {
    throw new BadRequestError('PR is not open')
  }
  
  // 2. Verificar builds
  const builds = await this.getBuildStatuses(prId)
  const failedBuilds = builds.filter(b => b.state === 'FAILED')
  if (failedBuilds.length > 0) {
    throw new BadRequestError('PR has failed builds')
  }
  
  // 3. Verificar approvals
  if (!this.hasRequiredApprovals(pr)) {
    throw new BadRequestError('PR needs more approvals')
  }
  
  // 4. Merge
  const result = await this.client.post(
    `/repositories/${this.workspace}/${pr.repoSlug}/pullrequests/${prId}/merge`,
    {
      merge_strategy: options.strategy,
      message: options.message,
      close_source_branch: options.closeSourceBranch,
    }
  )
  
  return result.data
}
```

#### 10. Agregar Comentario a PR
```typescript
// Comando
.bb pr comment 123 "This looks good!"
.bb pr comment 123 --inline --file src/app.ts --line 42 "Consider using const here"

// REST
POST /bitbucket/pullrequests/:id/comments
Body: {
  content: string
  inline?: {
    path: string
    from?: number
    to: number
  }
}
```

### Complejidad: COMPLEJA (4-7 días cada una)

#### 11. Code Diff Viewer
```typescript
// Comando
.bb pr diff 123
.bb pr diff 123 --file src/app.ts

// REST
GET /bitbucket/pullrequests/:id/diff
GET /bitbucket/pullrequests/:id/diff?path=src/app.ts

// Implementación
async getPRDiff(prId: number, filepath?: string): Promise<DiffResult> {
  const response = await this.client.get(
    `/repositories/${this.workspace}/${repo}/pullrequests/${prId}/diff`,
    { params: { path: filepath } }
  )
  
  // Parse diff
  const parsed = this.diffParser.parse(response.data)
  
  return {
    raw: response.data,
    files: parsed.files,
    stats: {
      filesChanged: parsed.files.length,
      additions: parsed.additions,
      deletions: parsed.deletions,
    }
  }
}

// Diff parser
class DiffParser {
  parse(diffText: string): ParsedDiff {
    // Parse unified diff format
    // https://www.gnu.org/software/diffutils/manual/html_node/Detailed-Unified.html
  }
}

interface ParsedDiff {
  files: DiffFile[]
  additions: number
  deletions: number
}

interface DiffFile {
  path: string
  oldPath: string
  additions: number
  deletions: number
  chunks: DiffChunk[]
}

interface DiffChunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

interface DiffLine {
  type: 'add' | 'delete' | 'context'
  lineNumber: number
  content: string
}
```

#### 12. Pipeline/Build Monitoring
```typescript
// Comandos
.bb pipelines
.bb pipelines REPO
.bb pipeline 123

// REST
GET /bitbucket/pipelines
GET /bitbucket/repositories/:slug/pipelines
GET /bitbucket/pipelines/:uuid

interface Pipeline {
  uuid: string
  buildNumber: number
  state: {
    name: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
    type: 'pipeline_state_pending' | 'pipeline_state_in_progress' | 'pipeline_state_completed'
    result?: {
      name: 'SUCCESSFUL' | 'FAILED' | 'ERROR' | 'STOPPED'
    }
  }
  createdOn: Date
  completedOn?: Date
  target: {
    ref_name: string
    ref_type: 'branch' | 'tag'
    commit: {
      hash: string
    }
  }
  creator: string
  durationInSeconds?: number
}

// Pipeline logs
.bb pipeline logs 123
GET /bitbucket/pipelines/:uuid/steps/:stepUuid/logs
```

#### 13. Branch Management
```typescript
// Comandos
.bb branch create feature/new-feature --from develop
.bb branch delete feature/old-feature
.bb branch compare feature/login develop

// REST
POST /bitbucket/repositories/:slug/refs/branches
DELETE /bitbucket/repositories/:slug/refs/branches/:name
GET /bitbucket/repositories/:slug/diff/:spec

// Branch comparison
interface BranchComparison {
  sourceBranch: string
  targetBranch: string
  ahead: number      // Commits ahead
  behind: number     // Commits behind
  commits: Commit[]
  diffstat: {
    linesAdded: number
    linesRemoved: number
    filesChanged: number
  }
}
```

#### 14. File Browser
```typescript
// Comandos
.bb files
.bb files REPO
.bb files REPO --path src/
.bb files REPO --path src/app.ts --branch develop

// REST
GET /bitbucket/repositories/:slug/src/:commit/:path

// Implementación
async browseFiles(
  repoSlug: string,
  path: string = '/',
  branch: string = 'main'
): Promise<FileEntry[]> {
  const response = await this.client.get(
    `/repositories/${this.workspace}/${repoSlug}/src/${branch}/${path}`
  )
  
  return response.data.values
}

interface FileEntry {
  type: 'commit_file' | 'commit_directory'
  path: string
  size?: number
  commit: {
    hash: string
    date: Date
  }
}

// File content
async getFileContent(
  repoSlug: string,
  filepath: string,
  branch: string = 'main'
): Promise<string> {
  const response = await this.client.get(
    `/repositories/${this.workspace}/${repoSlug}/src/${branch}/${filepath}`,
    { responseType: 'text' }
  )
  
  return response.data
}
```

#### 15. Code Search
```typescript
// Comando
.bb search "TODO" --repo main-repo
.bb search "function login" --language typescript

// REST (usando Bitbucket Cloud API)
GET /bitbucket/repositories/:slug/search/code?search_query=...

// Custom implementation
class CodeSearchService {
  async search(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // 1. Get file tree
    const files = await this.listAllFiles(options.repoSlug, options.branch)
    
    // 2. Filter by language if specified
    const filteredFiles = this.filterByLanguage(files, options.language)
    
    // 3. Search in each file
    const results: SearchResult[] = []
    for (const file of filteredFiles) {
      const content = await this.getFileContent(options.repoSlug, file.path)
      const matches = this.findMatches(content, query)
      
      if (matches.length > 0) {
        results.push({
          path: file.path,
          matches,
        })
      }
    }
    
    return results
  }
}

interface SearchResult {
  path: string
  matches: SearchMatch[]
}

interface SearchMatch {
  line: number
  content: string
  start: number
  end: number
}
```

### Complejidad: MUY COMPLEJA (7-14 días cada una)

#### 16. AI Code Review
```typescript
// Comando
.bb review 123
.bb review 123 --deep

// Implementación
class AICodeReviewService {
  async reviewPR(prId: number, deep: boolean = false): Promise<ReviewResult> {
    // 1. Get PR diff
    const diff = await this.bitbucketService.getPRDiff(prId)
    
    // 2. Analyze each file
    const fileReviews: FileReview[] = []
    for (const file of diff.files) {
      const review = await this.analyzeFile(file, deep)
      fileReviews.push(review)
    }
    
    // 3. Generate summary
    const summary = await this.generateSummary(fileReviews)
    
    // 4. Post as comment
    await this.bitbucketService.addComment(prId, this.formatReview(summary))
    
    return {
      summary,
      fileReviews,
      overallScore: this.calculateScore(fileReviews),
    }
  }
  
  private async analyzeFile(file: DiffFile, deep: boolean): Promise<FileReview> {
    const issues: CodeIssue[] = []
    
    // Static analysis
    issues.push(...await this.detectBugs(file))
    issues.push(...await this.detectSecurityIssues(file))
    issues.push(...await this.detectPerformanceIssues(file))
    issues.push(...await this.detectStyleIssues(file))
    
    if (deep) {
      // AI analysis with OpenAI
      const aiAnalysis = await this.openaiAnalysis(file)
      issues.push(...aiAnalysis.issues)
    }
    
    return {
      path: file.path,
      issues,
      complexity: this.calculateComplexity(file),
      suggestions: this.generateSuggestions(issues),
    }
  }
  
  private async openaiAnalysis(file: DiffFile): Promise<AIAnalysis> {
    const prompt = `
Review this code change:

File: ${file.path}
Changes:
${this.formatDiff(file)}

Analyze for:
1. Potential bugs
2. Security vulnerabilities
3. Performance issues
4. Code quality
5. Best practices violations

Provide specific line numbers and suggestions.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert code reviewer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    })
    
    // Parse response
    return this.parseAIResponse(response.choices[0].message.content)
  }
}

interface CodeIssue {
  type: 'bug' | 'security' | 'performance' | 'style' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  line: number
  message: string
  suggestion?: string
}

interface FileReview {
  path: string
  issues: CodeIssue[]
  complexity: number
  suggestions: string[]
}

interface ReviewResult {
  summary: ReviewSummary
  fileReviews: FileReview[]
  overallScore: number
}
```

#### 17. Merge Conflict Resolver
```typescript
// Comando
.bb conflicts 123
.bb resolve-conflict 123 --file src/app.ts --strategy ours

// Implementación
class MergeConflictResolver {
  async detectConflicts(prId: number): Promise<ConflictReport> {
    const pr = await this.bitbucketService.getPR(prId)
    
    // Simulate merge
    const conflicts = await this.simulateMerge(
      pr.sourceBranch,
      pr.destinationBranch
    )
    
    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      autoResolvable: this.checkAutoResolvable(conflicts),
    }
  }
  
  async autoResolveConflicts(
    prId: number,
    strategy: 'ours' | 'theirs' | 'smart'
  ): Promise<ResolutionResult> {
    const conflicts = await this.detectConflicts(prId)
    
    if (!conflicts.autoResolvable) {
      throw new BadRequestError('Conflicts require manual resolution')
    }
    
    for (const conflict of conflicts.conflicts) {
      await this.resolveConflict(conflict, strategy)
    }
    
    return {
      resolved: true,
      filesResolved: conflicts.conflicts.length,
    }
  }
}
```

#### 18. Repository Analytics
```typescript
// Comandos
.bb analytics REPO
.bb analytics REPO --since "2024-01-01"
.bb hotspots REPO

// Implementación
class RepositoryAnalytics {
  async generateAnalytics(
    repoSlug: string,
    since: Date
  ): Promise<RepositoryReport> {
    const [commits, prs, contributors, fileChanges] = await Promise.all([
      this.getCommits(repoSlug, since),
      this.getPRs(repoSlug, since),
      this.getContributors(repoSlug, since),
      this.getFileChanges(repoSlug, since),
    ])
    
    return {
      period: { start: since, end: new Date() },
      commitMetrics: this.analyzeCommits(commits),
      prMetrics: this.analyzePRs(prs),
      contributors: this.analyzeContributors(contributors),
      hotspots: this.identifyHotspots(fileChanges),
      codeChurn: this.calculateChurn(fileChanges),
    }
  }
  
  private identifyHotspots(fileChanges: FileChange[]): Hotspot[] {
    // Files changed most frequently
    const changeFrequency = new Map<string, number>()
    
    for (const change of fileChanges) {
      const count = changeFrequency.get(change.path) || 0
      changeFrequency.set(change.path, count + 1)
    }
    
    // Sort by frequency
    const hotspots = Array.from(changeFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([path, changes]) => ({
        path,
        changes,
        risk: this.calculateRisk(path, changes),
      }))
    
    return hotspots
  }
}

interface RepositoryReport {
  period: { start: Date; end: Date }
  commitMetrics: {
    total: number
    avgPerDay: number
    frequency: { [date: string]: number }
  }
  prMetrics: {
    total: number
    merged: number
    declined: number
    avgMergeTime: number  // hours
    avgReviewTime: number
  }
  contributors: {
    total: number
    topContributors: { name: string; commits: number }[]
  }
  hotspots: Hotspot[]
  codeChurn: {
    additions: number
    deletions: number
    churnRate: number
  }
}
```

#### 19. Automated PR Templates
```typescript
// Feature: Auto-generate PR description based on commits
.bb pr create-smart -s feature/login -t develop

class SmartPRCreator {
  async createSmartPR(
    sourceBranch: string,
    targetBranch: string
  ): Promise<PullRequest> {
    // 1. Get commits between branches
    const commits = await this.getCommits(sourceBranch, targetBranch)
    
    // 2. Analyze commits
    const analysis = await this.analyzeCommits(commits)
    
    // 3. Generate description with AI
    const description = await this.generateDescription(commits, analysis)
    
    // 4. Extract Jira issues
    const jiraIssues = this.extractJiraIssues(commits)
    
    // 5. Create PR
    return await this.bitbucketService.createPR({
      sourceBranch,
      destinationBranch: targetBranch,
      title: this.generateTitle(commits),
      description: description,
      reviewers: await this.suggestReviewers(analysis),
    })
  }
  
  private async generateDescription(
    commits: Commit[],
    analysis: CommitAnalysis
  ): Promise<string> {
    const prompt = `
Generate a PR description based on these commits:

${commits.map(c => `- ${c.message}`).join('\n')}

Files changed: ${analysis.filesChanged.join(', ')}

Format:
## Summary
<brief summary>

## Changes
- <change 1>
- <change 2>

## Testing
<testing notes>

## Jira Issues
${analysis.jiraIssues.join(', ')}
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    })
    
    return response.choices[0].message.content
  }
}
```

#### 20. Deployment Tracking
```typescript
// Link commits/PRs to deployments
interface Deployment {
  id: string
  environment: 'dev' | 'staging' | 'production'
  version: string
  commitHash: string
  deployedAt: Date
  deployedBy: string
  status: 'success' | 'failed' | 'in_progress'
}

class DeploymentTracker {
  async trackDeployment(deployment: Deployment): Promise<void> {
    // 1. Save deployment record
    await this.deploymentRepo.save(deployment)
    
    // 2. Find associated PRs
    const prs = await this.findPRsInCommit(deployment.commitHash)
    
    // 3. Update PR metadata
    for (const pr of prs) {
      await this.addDeploymentComment(pr.id, deployment)
    }
    
    // 4. Notify stakeholders
    await this.notifyDeployment(deployment)
  }
  
  async getDeploymentHistory(
    environment: string
  ): Promise<Deployment[]> {
    return this.deploymentRepo.find({
      where: { environment },
      order: { deployedAt: 'DESC' },
      take: 50,
    })
  }
}

// Comando
.bb deployments
.bb deployments --env production
```

---

## Webhooks Bitbucket

### Configuración en Bitbucket
1. Repository Settings → Webhooks → Add webhook
2. URL: `https://your-app.com/webhooks/bitbucket`
3. Triggers: Seleccionar eventos
4. Status: Active

### Eventos Soportados

```typescript
enum BitbucketWebhookEvent {
  // Repository events
  REPO_PUSH = 'repo:push',
  REPO_FORK = 'repo:fork',
  REPO_UPDATED = 'repo:updated',
  
  // PR events
  PR_CREATED = 'pullrequest:created',
  PR_UPDATED = 'pullrequest:updated',
  PR_APPROVED = 'pullrequest:approved',
  PR_UNAPPROVED = 'pullrequest:unapproval_removed',
  PR_MERGED = 'pullrequest:fulfilled',
  PR_DECLINED = 'pullrequest:rejected',
  PR_COMMENT_CREATED = 'pullrequest:comment_created',
  
  // Build events
  BUILD_STATUS_CREATED = 'build:status_created',
  BUILD_STATUS_UPDATED = 'build:status_updated',
  
  // Issue events (if enabled)
  ISSUE_CREATED = 'issue:created',
  ISSUE_UPDATED = 'issue:updated',
  ISSUE_COMMENT_CREATED = 'issue:comment_created',
}
```

### Webhook Verification
```typescript
import crypto from 'crypto'

class BitbucketWebhookValidator {
  verify(payload: string, signature: string): boolean {
    // Bitbucket uses HMAC-SHA256
    const secret = process.env.BITBUCKET_WEBHOOK_SECRET
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    )
  }
}
```

---

## Rate Limiting

### Rate Limits Bitbucket Cloud
- 1000 requests per hour per user
- Headers: `X-RateLimit-*`

### Implementación
```typescript
import Bottleneck from 'bottleneck'

class BitbucketApiRepository {
  private limiter: Bottleneck

  constructor() {
    this.limiter = new Bottleneck({
      minTime: 3600,  // 1 hour in ms
      maxConcurrent: 5,
      reservoir: 1000,  // 1000 requests
      reservoirRefreshAmount: 1000,
      reservoirRefreshInterval: 60 * 60 * 1000,  // 1 hour
    })
  }
}
```

---

## Testing

### Unit Tests
```typescript
describe('BitbucketService', () => {
  describe('createPR', () => {
    it('should create PR with valid data', async () => {
      const prData = {
        repoSlug: 'main-repo',
        title: 'Test PR',
        sourceBranch: 'feature/test',
        destinationBranch: 'develop',
      }
      
      const result = await service.createPR(prData)
      
      expect(result).toHaveProperty('id')
      expect(result.title).toBe('Test PR')
    })
  })
})
```

---

## Resumen

Plan detallado de integración Bitbucket cubriendo autenticación (App Password y OAuth 2.0), estructura modular completa, y 20 funcionalidades clasificadas por complejidad. **Simples** (1-2 días): listar repos, ver repo, branches, commits, PRs. **Medias** (2-4 días): detalle de PR, crear PR, aprobar/rechazar, merge, comentarios. **Complejas** (4-7 días): code diff viewer, pipeline monitoring, branch management, file browser, code search. **Muy complejas** (7-14 días): AI code review con GPT-4, merge conflict resolver, repository analytics con hotspots, automated PR templates, deployment tracking. Incluye webhooks para 15+ eventos, rate limiting (1000 req/hora), validación de signatures con HMAC-SHA256, y testing comprehensivo. Total estimado: 15-20 funcionalidades en 6-8 semanas.
