# AI Enhancements - Project Management Assistant

## Intent Classification Extensions

### Project Management Intent Classifier

```typescript
enum PMIntent {
  // Jira intents
  JIRA_CREATE_ISSUE = 'jira.create',
  JIRA_UPDATE_ISSUE = 'jira.update',
  JIRA_SEARCH_ISSUES = 'jira.search',
  JIRA_TRANSITION = 'jira.transition',
  JIRA_ASSIGN = 'jira.assign',
  JIRA_COMMENT = 'jira.comment',
  JIRA_SPRINT_INFO = 'jira.sprint.info',
  JIRA_SPRINT_ANALYZE = 'jira.sprint.analyze',
  
  // Bitbucket intents
  BB_CREATE_PR = 'bitbucket.pr.create',
  BB_REVIEW_PR = 'bitbucket.pr.review',
  BB_MERGE_PR = 'bitbucket.pr.merge',
  BB_REVIEW_CODE = 'bitbucket.code.review',
  BB_SEARCH_CODE = 'bitbucket.code.search',
  
  // Documentation intents
  DOCS_GENERATE = 'docs.generate',
  DOCS_SPRINT_REPORT = 'docs.sprint',
  DOCS_RELEASE_NOTES = 'docs.release',
  DOCS_API = 'docs.api',
  
  // Analytics intents
  ANALYTICS_SPRINT = 'analytics.sprint',
  ANALYTICS_VELOCITY = 'analytics.velocity',
  ANALYTICS_PR_METRICS = 'analytics.pr',
  
  // Prediction intents
  PREDICT_DEADLINE = 'predict.deadline',
  PREDICT_VELOCITY = 'predict.velocity',
  SUGGEST_ASSIGNEE = 'suggest.assignee',
  SUGGEST_PRIORITY = 'suggest.priority',
}

class PMIntentClassifier {
  private examples: Array<{ text: string; intent: PMIntent }> = [
    // Jira create
    { text: 'create a bug for the login that fails', intent: PMIntent.JIRA_CREATE_ISSUE },
    { text: 'I need to create a high priority task', intent: PMIntent.JIRA_CREATE_ISSUE },
    { text: 'report an issue in the payments module', intent: PMIntent.JIRA_CREATE_ISSUE },
    
    // Jira update
    { text: 'change the priority of PROJ-123 to critical', intent: PMIntent.JIRA_UPDATE_ISSUE },
    { text: 'assign PROJ-456 to maria', intent: PMIntent.JIRA_ASSIGN },
    { text: 'move PROJ-789 to in progress', intent: PMIntent.JIRA_TRANSITION },
    
    // Jira search
    { text: 'show me all open bugs', intent: PMIntent.JIRA_SEARCH_ISSUES },
    { text: 'what issues are assigned to me', intent: PMIntent.JIRA_SEARCH_ISSUES },
    { text: 'search for high priority tasks from the current sprint', intent: PMIntent.JIRA_SEARCH_ISSUES },
    
    // Sprint analysis
    { text: 'how is the current sprint going', intent: PMIntent.JIRA_SPRINT_INFO },
    { text: 'analyze the sprint progress', intent: PMIntent.JIRA_SPRINT_ANALYZE },
    { text: 'are we going to complete everything planned?', intent: PMIntent.JIRA_SPRINT_ANALYZE },
    
    // PR management
    { text: 'create a PR from feature/login to develop', intent: PMIntent.BB_CREATE_PR },
    { text: 'review PR 123', intent: PMIntent.BB_REVIEW_PR },
    { text: 'merge pull request 456', intent: PMIntent.BB_MERGE_PR },
    
    // Code review
    { text: 'analyze the code from PR 789', intent: PMIntent.BB_REVIEW_CODE },
    { text: 'are there bugs in this pull request?', intent: PMIntent.BB_REVIEW_CODE },
    
    // Documentation
    { text: 'generate release notes for version 1.2.0', intent: PMIntent.DOCS_RELEASE_NOTES },
    { text: 'create documentation for the last sprint', intent: PMIntent.DOCS_SPRINT_REPORT },
    
    // Predictions
    { text: 'when are we going to finish PROJ-123?', intent: PMIntent.PREDICT_DEADLINE },
    { text: 'who should I assign this bug to?', intent: PMIntent.SUGGEST_ASSIGNEE },
  ]

  async classify(message: string): Promise<PMIntent | null> {
    const prompt = this.buildClassificationPrompt(message)
    
    // Using OpenAI SDK v3 (existing in the project)
    const response = await this.openai.createChatCompletion({
      model: 'gpt-4o-mini', // Cheaper for classification
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 50,
    })

    return this.parseIntent(response.data.choices[0].message?.content || '')
  }

  private buildClassificationPrompt(message: string): string {
    return `
Classify this user message into one of the project management intents.

Message: "${message}"

Examples:
${this.examples.map(e => `"${e.text}" → ${e.intent}`).join('\n')}

Respond with only the intent name, e.g., "jira.create"
If no match, respond with "unknown"
    `.trim()
  }

  private getSystemPrompt(): string {
    return `
You are a project management assistant intent classifier.
Analyze user messages and determine what action they want to perform.
Focus on Jira (issue tracking), Bitbucket (code/PRs), documentation, and analytics.
Be accurate and conservative - if unsure, return "unknown".
    `.trim()
  }
}
```

### Entity Extraction with AI

```typescript
interface ExtractedEntities {
  issueKeys?: string[]           // PROJ-123, PROJ-456
  prNumbers?: number[]           // 123, 456
  userMentions?: string[]        // @maria, @john
  priority?: string              // High, Critical
  status?: string                // Open, In Progress
  branches?: string[]            // feature/login, develop
  versions?: string[]            // v1.2.0
  dates?: Date[]                 // tomorrow, next week
}

class EntityExtractor {
  async extract(message: string): Promise<ExtractedEntities> {
    const entities: ExtractedEntities = {}

    // Regex extractors (fast)
    entities.issueKeys = this.extractIssueKeys(message)
    entities.prNumbers = this.extractPRNumbers(message)
    entities.userMentions = this.extractUserMentions(message)

    // AI-based extraction (for complex cases)
    if (this.needsAIExtraction(message)) {
      const aiExtracted = await this.extractWithAI(message)
      Object.assign(entities, aiExtracted)
    }

    return entities
  }

  private extractIssueKeys(text: string): string[] {
    const regex = /\b[A-Z]+-\d+\b/g
    return text.match(regex) || []
  }

  private extractPRNumbers(text: string): number[] {
    const regex = /\b(?:PR|pr|#)\s*(\d+)\b/g
    const matches = []
    let match
    while ((match = regex.exec(text)) !== null) {
      matches.push(parseInt(match[1]))
    }
    return matches
  }

  private async extractWithAI(message: string): Promise<Partial<ExtractedEntities>> {
    const prompt = `
Extract entities from this message:
"${message}"

Return JSON with:
- priority: string (Lowest, Low, Medium, High, Highest) or null
- status: string (Open, In Progress, Done, etc.) or null
- branches: array of branch names or empty
- versions: array of version strings or empty
- dates: array of date strings or empty

Example:
{
  "priority": "High",
  "status": "In Progress",
  "branches": ["feature/login"],
  "versions": ["v1.2.0"],
  "dates": ["2024-06-30"]
}
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })

    return JSON.parse(response.data.choices[0].message?.content || '')
  }
}
```

---

## Documentation Generation with AI

### Sprint Report Generator

```typescript
class SprintReportGenerator {
  async generate(sprintId: number): Promise<string> {
    // 1. Fetch sprint data
    const sprint = await this.jiraService.getSprint(sprintId)
    const issues = await this.jiraService.getSprintIssues(sprintId)
    const velocity = await this.analyticsService.getSprintVelocity(sprintId)

    // 2. Organize data
    const completed = issues.filter(i => i.status === 'Done')
    const incomplete = issues.filter(i => i.status !== 'Done')
    const addedMidSprint = issues.filter(i => this.wasAddedMidSprint(i, sprint))

    // 3. Generate with AI
    const report = await this.generateWithAI({
      sprint,
      completed,
      incomplete,
      addedMidSprint,
      velocity,
    })

    return report
  }

  private async generateWithAI(data: SprintData): Promise<string> {
    const prompt = `
Generate a comprehensive sprint report in markdown format.

Sprint: ${data.sprint.name}
Period: ${data.sprint.startDate} to ${data.sprint.endDate}
Goal: ${data.sprint.goal}

Completed Issues (${data.completed.length}):
${data.completed.map(i => `- ${i.key}: ${i.summary} (${i.storyPoints} points)`).join('\n')}

Incomplete Issues (${data.incomplete.length}):
${data.incomplete.map(i => `- ${i.key}: ${i.summary} (${i.storyPoints} points)`).join('\n')}

Velocity:
- Planned: ${data.velocity.planned} points
- Completed: ${data.velocity.completed} points
- Completion: ${data.velocity.percentage}%

Issues added mid-sprint: ${data.addedMidSprint.length}

Generate a report with:
1. Executive Summary (2-3 paragraphs)
2. Achievements (what went well)
3. Challenges (what didn't go well)
4. Metrics (velocity, completion rate, etc.)
5. Action Items for next sprint
6. Detailed issue breakdown by category

Use clear, professional language. Be data-driven but also provide insights.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Scrum Master writing sprint retrospective reports.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2000,
    })

    return response.data.choices[0].message?.content || ''
  }
}
```

### Release Notes Generator

```typescript
class ReleaseNotesGenerator {
  async generate(version: string): Promise<string> {
    // 1. Get all PRs merged since last release
    const prs = await this.bitbucketService.getPRsSinceLastRelease(version)
    
    // 2. Get associated Jira issues
    const issues = await this.getIssuesFromPRs(prs)

    // 3. Categorize
    const features = issues.filter(i => i.type === 'Story')
    const bugs = issues.filter(i => i.type === 'Bug')
    const breakingChanges = this.identifyBreakingChanges(prs, issues)

    // 4. Generate with AI
    const notes = await this.generateWithAI({
      version,
      features,
      bugs,
      breakingChanges,
      prs,
    })

    return notes
  }

  private async generateWithAI(data: ReleaseData): Promise<string> {
    const prompt = `
Generate release notes for version ${data.version}.

Features (${data.features.length}):
${data.features.map(f => `- ${f.key}: ${f.summary}`).join('\n')}

Bug Fixes (${data.bugs.length}):
${data.bugs.map(b => `- ${b.key}: ${b.summary}`).join('\n')}

Breaking Changes (${data.breakingChanges.length}):
${data.breakingChanges.map(c => `- ${c.description}`).join('\n')}

Total PRs merged: ${data.prs.length}

Generate professional release notes with:
1. Overview (what's new in this release)
2. ✨ New Features
3. 🐛 Bug Fixes
4. ⚠️ Breaking Changes (if any)
5. 📦 Dependencies Updated
6. 👏 Contributors

Use emojis, keep it concise but informative.
Format in markdown for GitHub releases.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer creating release notes for developers.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 1500,
    })

    return response.data.choices[0].message?.content || ''
  }

  private identifyBreakingChanges(
    prs: PullRequest[],
    issues: JiraIssue[]
  ): BreakingChange[] {
    const breaking: BreakingChange[] = []

    // Check PR titles/descriptions for breaking change markers
    for (const pr of prs) {
      if (
        pr.title.includes('BREAKING') ||
        pr.description?.includes('BREAKING CHANGE')
      ) {
        breaking.push({
          prId: pr.id,
          description: this.extractBreakingChangeDescription(pr),
        })
      }
    }

    // Check Jira labels
    for (const issue of issues) {
      if (issue.labels.includes('breaking-change')) {
        breaking.push({
          issueKey: issue.key,
          description: issue.summary,
        })
      }
    }

    return breaking
  }
}
```

### API Documentation Generator

```typescript
class APIDocGenerator {
  async generateFromCode(repoSlug: string, branch: string = 'main'): Promise<string> {
    // 1. Get relevant files
    const files = await this.bitbucketService.searchFiles(repoSlug, {
      path: 'src',
      extensions: ['.ts', '.js'],
      pattern: /controller|route|api/i,
    })

    // 2. Extract code
    const codeSnippets = await Promise.all(
      files.map(async file => ({
        path: file.path,
        content: await this.bitbucketService.getFileContent(repoSlug, file.path, branch)
      }))
    )

    // 3. Generate docs with AI
    const docs = await this.generateWithAI(codeSnippets)

    return docs
  }

  private async generateWithAI(snippets: CodeSnippet[]): Promise<string> {
    const prompt = `
Generate API documentation from these code files.

${snippets.map(s => `
File: ${s.path}
\`\`\`typescript
${s.content}
\`\`\`
`).join('\n\n')}

Generate comprehensive API docs with:
1. API Overview
2. Authentication
3. Endpoints (grouped by resource)
   - Method + Path
   - Description
   - Request parameters
   - Request body (if any)
   - Response format
   - Example request/response
4. Error codes
5. Rate limiting

Format in markdown, suitable for a README or wiki.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer creating API documentation from source code.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
    })

    return response.data.choices[0].message?.content || ''
  }
}
```

---

## Code Analysis with AI

### Code Quality Analyzer

```typescript
class CodeQualityAnalyzer {
  async analyze(file: DiffFile): Promise<QualityReport> {
    const issues: CodeIssue[] = []

    // 1. Static analysis (fast, deterministic)
    issues.push(...this.detectComplexity(file))
    issues.push(...this.detectCodeSmells(file))
    issues.push(...this.detectDuplication(file))

    // 2. AI analysis (slow, contextual)
    const aiIssues = await this.analyzeWithAI(file)
    issues.push(...aiIssues)

    return {
      file: file.path,
      issues,
      score: this.calculateQualityScore(issues),
      suggestions: this.generateSuggestions(issues),
    }
  }

  private detectComplexity(file: DiffFile): CodeIssue[] {
    const issues: CodeIssue[] = []
    
    // Cyclomatic complexity
    const functions = this.extractFunctions(file)
    for (const func of functions) {
      const complexity = this.calculateCyclomaticComplexity(func)
      if (complexity > 10) {
        issues.push({
          type: 'quality',
          severity: complexity > 15 ? 'high' : 'medium',
          line: func.startLine,
          message: `Function has high cyclomatic complexity (${complexity})`,
          suggestion: 'Consider breaking this function into smaller functions',
        })
      }
    }

    return issues
  }

  private async analyzeWithAI(file: DiffFile): Promise<CodeIssue[]> {
    const prompt = `
Analyze this code change for quality issues:

File: ${file.path}
\`\`\`${this.getFileExtension(file.path)}
${this.formatDiff(file)}
\`\`\`

Look for:
1. Code smells (long methods, god classes, etc.)
2. Anti-patterns
3. Potential performance issues
4. Missing error handling
5. Hard-coded values that should be constants
6. Inconsistent naming
7. Missing or poor comments for complex logic

For each issue found, provide:
- Line number
- Issue type (code_smell, performance, error_handling, etc.)
- Severity (low, medium, high)
- Description
- Suggested fix

Return as JSON array.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer focused on code quality and best practices.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    })

    const result = JSON.parse(response.data.choices[0].message?.content || '')
    return result.issues || []
  }
}
```

### Security Vulnerability Scanner

```typescript
class SecurityScanner {
  async scan(file: DiffFile): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = []

    // 1. Pattern-based detection (fast)
    issues.push(...this.detectCommonVulnerabilities(file))

    // 2. AI-based detection (deep)
    const aiIssues = await this.scanWithAI(file)
    issues.push(...aiIssues)

    return issues
  }

  private detectCommonVulnerabilities(file: DiffFile): SecurityIssue[] {
    const issues: SecurityIssue[] = []
    const content = this.getFileContent(file)

    // SQL Injection
    if (content.match(/execute\s*\(\s*["'`].*\$\{.*\}.*["'`]/)) {
      issues.push({
        type: 'sql_injection',
        severity: 'critical',
        message: 'Potential SQL injection vulnerability',
        recommendation: 'Use parameterized queries',
      })
    }

    // XSS
    if (content.match(/innerHTML\s*=|dangerouslySetInnerHTML/)) {
      issues.push({
        type: 'xss',
        severity: 'high',
        message: 'Potential XSS vulnerability',
        recommendation: 'Sanitize user input before rendering',
      })
    }

    // Hardcoded secrets
    if (content.match(/api[_-]?key|password|secret.*=\s*["'][^"']{20,}["']/i)) {
      issues.push({
        type: 'hardcoded_secret',
        severity: 'critical',
        message: 'Potential hardcoded secret',
        recommendation: 'Use environment variables',
      })
    }

    return issues
  }

  private async scanWithAI(file: DiffFile): Promise<SecurityIssue[]> {
    const prompt = `
Perform a security audit on this code:

\`\`\`${this.getFileExtension(file.path)}
${this.formatDiff(file)}
\`\`\`

Check for:
1. Injection vulnerabilities (SQL, NoSQL, Command, LDAP)
2. XSS vulnerabilities
3. CSRF issues
4. Insecure authentication/authorization
5. Sensitive data exposure
6. XML external entities (XXE)
7. Broken access control
8. Security misconfiguration
9. Insecure deserialization
10. Using components with known vulnerabilities

For each issue:
- Line number
- Vulnerability type
- Severity (low, medium, high, critical)
- Explanation
- Remediation steps

Return as JSON.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a security expert performing code security audits based on OWASP Top 10.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
    })

    const result = JSON.parse(response.data.choices[0].message?.content || '')
    return result.issues || []
  }
}
```

---

## Predictive Analysis

### Deadline Predictor

```typescript
class DeadlinePredictor {
  async predict(issueKey: string): Promise<DeadlinePrediction> {
    // 1. Get issue data
    const issue = await this.jiraService.getIssue(issueKey)
    
    // 2. Get historical data
    const historicalData = await this.getHistoricalData(issue)
    
    // 3. Calculate features
    const features = this.extractFeatures(issue, historicalData)
    
    // 4. Predict with AI
    const prediction = await this.predictWithAI(features)
    
    return prediction
  }

  private async getHistoricalData(issue: JiraIssue): Promise<HistoricalData> {
    // Get similar completed issues
    const similar = await this.jiraService.searchIssues(
      `project = ${issue.projectKey} AND type = "${issue.type}" AND status = Done`
    )

    // Calculate statistics
    const completionTimes = similar.map(i => 
      this.calculateCompletionTime(i.created, i.resolutionDate!)
    )

    return {
      averageCompletionTime: this.average(completionTimes),
      medianCompletionTime: this.median(completionTimes),
      similarIssuesCount: similar.length,
      teamVelocity: await this.analyticsService.getTeamVelocity(),
      currentSprint: await this.jiraService.getActiveSprint(),
    }
  }

  private extractFeatures(issue: JiraIssue, historical: HistoricalData): PredictionFeatures {
    return {
      storyPoints: issue.storyPoints || this.estimateStoryPoints(issue),
      priority: this.priorityToNumber(issue.priority),
      complexity: this.estimateComplexity(issue),
      dependencies: issue.links.length,
      teamCapacity: historical.teamVelocity,
      historicalAverage: historical.averageCompletionTime,
      sprintDaysRemaining: this.calculateSprintDaysRemaining(historical.currentSprint),
    }
  }

  private async predictWithAI(features: PredictionFeatures): Promise<DeadlinePrediction> {
    const prompt = `
Predict the completion date for a Jira issue based on these factors:

Story Points: ${features.storyPoints}
Priority: ${features.priority} (1=Lowest, 5=Highest)
Estimated Complexity: ${features.complexity}
Number of Dependencies: ${features.dependencies}
Team Velocity: ${features.teamCapacity} points/sprint
Historical Average: ${features.historicalAverage} days
Sprint Days Remaining: ${features.sprintDaysRemaining}

Based on this data:
1. Estimate the number of days to completion
2. Calculate confidence level (0-100%)
3. Identify main risk factors
4. Suggest actions to meet deadline

Consider:
- Higher priority items get more attention
- Dependencies can cause delays
- Team capacity fluctuates
- Complex issues take longer than story points suggest

Return JSON with:
{
  "estimatedDays": number,
  "estimatedDate": "YYYY-MM-DD",
  "confidence": number (0-100),
  "risks": ["risk1", "risk2"],
  "recommendations": ["action1", "action2"]
}
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a project management expert specializing in deadline estimation.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    })

    return JSON.parse(response.data.choices[0].message?.content || '')
  }
}
```

### Smart Assignee Suggester

```typescript
class SmartAssigneeSuggester {
  async suggest(issue: JiraIssue): Promise<AssigneeSuggestion[]> {
    // 1. Analyze issue content
    const analysis = await this.analyzeIssue(issue)
    
    // 2. Get team expertise
    const teamExpertise = await this.getTeamExpertise()
    
    // 3. Get current workload
    const workloads = await this.getTeamWorkload()
    
    // 4. Score candidates
    const suggestions = this.scoreAssignees(analysis, teamExpertise, workloads)
    
    return suggestions.slice(0, 3) // Top 3
  }

  private async analyzeIssue(issue: JiraIssue): Promise<IssueAnalysis> {
    const prompt = `
Analyze this Jira issue and extract technical context:

Title: ${issue.summary}
Description: ${issue.description}
Type: ${issue.type}
Components: ${issue.components.join(', ')}
Labels: ${issue.labels.join(', ')}

Identify:
1. Primary technical domain (frontend, backend, database, devops, etc.)
2. Required skills (languages, frameworks, tools)
3. Complexity level (1-5)
4. Estimated expertise level needed (junior, mid, senior)

Return as JSON.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    })

    return JSON.parse(response.data.choices[0].message?.content || '')
  }

  private async getTeamExpertise(): Promise<Map<string, UserExpertise>> {
    // Get historical data
    const users = await this.jiraService.getProjectUsers()
    const expertise = new Map<string, UserExpertise>()

    for (const user of users) {
      const history = await this.getUserIssueHistory(user.email)
      
      expertise.set(user.email, {
        domains: this.extractDomains(history),
        skills: this.extractSkills(history),
        successRate: this.calculateSuccessRate(history),
        avgCompletionTime: this.calculateAvgCompletionTime(history),
      })
    }

    return expertise
  }

  private scoreAssignees(
    analysis: IssueAnalysis,
    expertise: Map<string, UserExpertise>,
    workloads: Map<string, number>
  ): AssigneeSuggestion[] {
    const suggestions: AssigneeSuggestion[] = []

    for (const [email, exp] of expertise.entries()) {
      let score = 0

      // Expertise match
      const domainMatch = exp.domains.includes(analysis.primaryDomain)
      score += domainMatch ? 40 : 0

      const skillMatch = analysis.requiredSkills.filter(s => 
        exp.skills.includes(s)
      ).length
      score += skillMatch * 10

      // Success rate
      score += exp.successRate * 20

      // Workload (inverse - lower is better)
      const workload = workloads.get(email) || 0
      score += (10 - Math.min(workload, 10)) * 3

      suggestions.push({
        email,
        score,
        reason: this.generateReason(exp, analysis, domainMatch),
        confidence: this.calculateConfidence(score),
      })
    }

    return suggestions.sort((a, b) => b.score - a.score)
  }
}
```

---

## Contextual Suggestions

### Context-Aware Assistant

```typescript
class ContextAwareAssistant {
  async handleMessage(message: string, context: ConversationContext): Promise<string> {
    // 1. Enrich context
    const enriched = await this.enrichContext(context)
    
    // 2. Get user's recent activity
    const activity = await this.getUserActivity(context.userId)
    
    // 3. Get project state
    const projectState = await this.getProjectState()
    
    // 4. Generate contextual response
    const response = await this.generateResponse(message, {
      ...enriched,
      activity,
      projectState,
    })
    
    return response
  }

  private async enrichContext(context: ConversationContext): Promise<EnrichedContext> {
    return {
      ...context,
      currentSprint: await this.jiraService.getActiveSprint(),
      myOpenIssues: await this.jiraService.getMyIssues(context.userId),
      myOpenPRs: await this.bitbucketService.getMyPRs(context.userId),
      recentNotifications: await this.getRecentNotifications(context.userId),
    }
  }

  private async generateResponse(
    message: string,
    context: EnrichedContext
  ): Promise<string> {
    const prompt = `
You are a project management assistant helping a developer.

User message: "${message}"

Context:
- Current sprint: ${context.currentSprint?.name} (${context.currentSprint?.daysRemaining} days left)
- User's open issues: ${context.myOpenIssues.length} (${context.myOpenIssues.map(i => i.key).join(', ')})
- User's open PRs: ${context.myOpenPRs.length}
- Recent activity: ${this.summarizeActivity(context.activity)}

Recent notifications:
${context.recentNotifications.slice(0, 5).map(n => `- ${n.message}`).join('\n')}

Project state:
- Sprint progress: ${context.projectState.sprintProgress}%
- Open bugs: ${context.projectState.openBugs}
- PRs awaiting review: ${context.projectState.prsAwaitingReview}

Based on this context, provide a helpful, actionable response.
Suggest specific next steps if relevant.
Mention any blockers or urgent items.
Be concise but thorough.
    `

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful project management assistant with access to project context.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    return response.data.choices[0].message?.content || ''
  }
}
```

---

## Summary

Complete AI enhancements plan for project management. **Intent Classification**: 20+ specific intents (jira.create, bb.pr.review, docs.generate, predict.deadline) with classifier trained with examples, entity extraction with regex + AI for complex cases. **Automatic Documentation**: sprint reports with GPT-4 (executive summary, achievements, challenges, metrics, action items), release notes from PRs/issues (features, bugs, breaking changes, contributors), API docs generated from source code. **Code Analysis**: quality analyzer detects cyclomatic complexity, code smells, anti-patterns with static + AI analysis; security scanner searches for SQL injection, XSS, hardcoded secrets, OWASP Top 10 with patterns + GPT-4 audit. **Predictive Analytics**: deadline predictor uses historical data + team velocity + dependencies to estimate completion date with confidence level and risk factors; smart assignee suggester analyzes issue content, historical team expertise, current workload to recommend top 3 assignees with scoring. **Context-Aware Assistant**: enriches context with current sprint, user's open issues/PRs, recent notifications, project state to provide contextual and actionable responses. Implementation uses GPT-4 for deep analysis, GPT-4o-mini for classification (cheaper), temperature 0.1-0.3 for deterministic tasks, 0.5-0.7 for creative tasks.
