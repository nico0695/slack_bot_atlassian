import JiraClient from 'jira-client'
import { createModuleLogger } from '../../../config/logger'
import { IJiraConfig, IJiraConnectionTest, IJiraProject } from '../shared/interfaces/jira.interfaces'

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

      // Get server info to test connection
      const serverInfo = await this.client!.getServerInfo()

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

      const key = projectKey || this.config?.projectKey

      if (!key) {
        throw new Error('Project key is required')
      }

      const project = await this.client!.getProject(key)

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
}
