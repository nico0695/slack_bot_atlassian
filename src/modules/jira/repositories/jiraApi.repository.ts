import JiraClient from 'jira-client'
import { createModuleLogger } from '../../../config/logger'
import {
  IJiraConfig,
  IJiraConnectionTest,
  IJiraIssue,
  IJiraProject,
  IJiraSearchResult,
} from '../shared/interfaces/jira.interfaces'
import { JQLBuilder } from '../utils/jql.builder'

const log = createModuleLogger('jira.api.repository')

export default class JiraApiRepository {
  private static instance: JiraApiRepository
  private client: JiraClient | null = null
  private config: IJiraConfig | null = null

  private constructor() {
    this.initializeClient()
  }

  static getInstance(): JiraApiRepository {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraApiRepository()
    return this.instance
  }

  /**
   * Initialize Jira client with environment variables
   */
  private initializeClient(): void {
    try {
      const host = process.env.JIRA_HOST
      const email = process.env.JIRA_EMAIL
      const apiToken = process.env.JIRA_API_TOKEN
      const projectKey = process.env.JIRA_PROJECT_KEY

      if (!host || !email || !apiToken) {
        log.warn('Jira credentials not configured. API calls will fail.')
        return
      }

      this.config = {
        host,
        email,
        apiToken,
        projectKey,
      }

      this.client = new JiraClient({
        protocol: 'https',
        host,
        username: email,
        password: apiToken,
        apiVersion: '3',
        strictSSL: true,
      })

      log.info({ host }, 'Jira client initialized')
    } catch (error) {
      log.error({ err: error }, 'Failed to initialize Jira client')
    }
  }

  /**
   * Check if Jira client is configured
   */
  private ensureClient(): void {
    if (!this.client) {
      throw new Error('Jira client not configured. Please set JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.')
    }
  }

  /**
   * Test connection to Jira API
   */
  async testConnection(): Promise<IJiraConnectionTest> {
    try {
      this.ensureClient()

      if (!this.client) {
        throw new Error('Jira client not initialized')
      }

      // Get server info to test connection
      const serverInfo = await this.client.getServerInfo()

      log.info({ version: serverInfo.version }, 'Jira connection successful')

      return {
        success: true,
        message: 'Successfully connected to Jira',
        serverInfo: {
          version: serverInfo.version,
          baseUrl: serverInfo.baseUrl,
        },
      }
    } catch (error: any) {
      log.error({ err: error }, 'Jira connection test failed')

      return {
        success: false,
        message: error.message || 'Failed to connect to Jira',
      }
    }
  }

  /**
   * Get project information
   */
  async getProject(projectKey?: string): Promise<IJiraProject> {
    try {
      this.ensureClient()

      if (!this.client) {
        throw new Error('Jira client not initialized')
      }

      const key = projectKey || this.config?.projectKey

      if (!key) {
        throw new Error('Project key is required')
      }

      const project = await this.client.getProject(key)

      log.debug({ projectKey: key }, 'Project retrieved')

      return {
        key: project.key,
        id: project.id,
        name: project.name,
        description: project.description,
        lead: project.lead?.displayName,
        projectTypeKey: project.projectTypeKey,
      }
    } catch (error: any) {
      log.error({ err: error, projectKey }, 'Failed to get project')
      throw error
    }
  }

  /**
   * Get configured project key
   */
  getConfiguredProjectKey(): string | undefined {
    return this.config?.projectKey
  }

  /**
   * Get configured email
   */
  getConfiguredEmail(): string | undefined {
    return this.config?.email
  }

  /**
   * Map a raw Jira API issue object to IJiraIssue
   */
  private mapIssue(issue: any): IJiraIssue {
    return {
      key: issue.key,
      id: issue.id,
      summary: issue.fields?.summary ?? '',
      description:
        issue.fields?.description?.content?.[0]?.content?.[0]?.text ?? issue.fields?.description,
      status: issue.fields?.status?.name ?? '',
      issueType: issue.fields?.issuetype?.name ?? '',
      priority: issue.fields?.priority?.name,
      assignee: issue.fields?.assignee?.displayName,
      reporter: issue.fields?.reporter?.displayName,
      created: new Date(issue.fields?.created),
      updated: new Date(issue.fields?.updated),
      labels: issue.fields?.labels ?? [],
      components: (issue.fields?.components ?? []).map((c: any) => c.name),
      url: this.config?.host ? `https://${this.config.host}/browse/${String(issue.key)}` : undefined,
    }
  }

  /**
   * Get a specific Jira issue by key (e.g. PROJ-123)
   */
  async getIssue(issueKey: string): Promise<IJiraIssue> {
    try {
      this.ensureClient()

      if (!this.client) {
        throw new Error('Jira client not initialized')
      }

      const issue: any = await this.client.findIssue(issueKey)

      log.debug({ issueKey }, 'Issue retrieved')

      return this.mapIssue(issue)
    } catch (error: any) {
      log.error({ err: error, issueKey }, 'Failed to get issue')
      throw error
    }
  }

  /**
   * Search Jira issues with a JQL query
   */
  async searchIssues(jql: string, maxResults = 50, startAt = 0): Promise<IJiraSearchResult> {
    try {
      this.ensureClient()

      if (!this.client) {
        throw new Error('Jira client not initialized')
      }

      const result: any = await this.client.searchJira(jql, { maxResults, startAt })

      log.debug({ jql, total: result.total }, 'Issues searched')

      return {
        issues: (result.issues ?? []).map((i: any) => this.mapIssue(i)),
        total: result.total ?? 0,
        maxResults: result.maxResults ?? maxResults,
        startAt: result.startAt ?? startAt,
      }
    } catch (error: any) {
      log.error({ err: error, jql }, 'Failed to search issues')
      throw error
    }
  }

  /**
   * Get issues assigned to the configured email
   */
  async getAssignedToMe(projectKey?: string): Promise<IJiraSearchResult> {
    const key = projectKey || this.config?.projectKey

    if (!key) {
      throw new Error('Project key is required')
    }

    if (!this.config?.email) {
      throw new Error('Jira email is not configured')
    }

    const jql = new JQLBuilder()
      .project(key)
      .assignedTo(this.config.email)
      .notInStatus('Done')
      .orderBy('updated', 'DESC')
      .build()

    return await this.searchIssues(jql, 50, 0)
  }

  /**
   * Get issues in the active sprint for a project
   */
  async getActiveSprint(projectKey?: string): Promise<IJiraSearchResult> {
    const key = projectKey || this.config?.projectKey

    if (!key) {
      throw new Error('Project key is required')
    }

    const jql = new JQLBuilder()
      .project(key)
      .inOpenSprints()
      .notInStatus('Done')
      .orderBy('priority', 'DESC')
      .build()

    return await this.searchIssues(jql, 100, 0)
  }

  /**
   * Get backlog issues (no sprint assigned) for a project
   */
  async getBacklog(projectKey?: string): Promise<IJiraSearchResult> {
    const key = projectKey || this.config?.projectKey

    if (!key) {
      throw new Error('Project key is required')
    }

    const jql = new JQLBuilder()
      .project(key)
      .noSprint()
      .notInStatus('Done')
      .orderBy('created', 'DESC')
      .build()

    return await this.searchIssues(jql, 50, 0)
  }
}
