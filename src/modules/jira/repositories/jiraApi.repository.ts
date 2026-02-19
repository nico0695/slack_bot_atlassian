import JiraClient from 'jira-client'

import { createModuleLogger } from '../../../config/logger'
import { IJiraConnectionConfig, IJiraIssue, IJiraProject } from '../shared/interfaces/jira.interfaces'

const log = createModuleLogger('jira.api.repository')

/**
 * Wrapper around the Jira Cloud REST API.
 * Provides typed methods for connectivity tests and future operations.
 */
export default class JiraApiRepository {
  private static instance: JiraApiRepository

  private client: JiraClient | null = null

  private constructor() {
    this.initClient()
  }

  static getInstance(): JiraApiRepository {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraApiRepository()
    return this.instance
  }

  private initClient(): void {
    const host = process.env.JIRA_HOST
    const email = process.env.JIRA_EMAIL
    const apiToken = process.env.JIRA_API_TOKEN

    if (!host || !email || !apiToken) {
      log.warn('Jira credentials not configured — JIRA_HOST, JIRA_EMAIL, JIRA_API_TOKEN required')
      return
    }

    const config: IJiraConnectionConfig = { host, email, apiToken }

    this.client = new JiraClient({
      protocol: 'https',
      host: config.host,
      username: config.email,
      password: config.apiToken,
      apiVersion: '3',
      strictSSL: true,
    })

    log.info({ host: config.host }, 'Jira client initialised')
  }

  /**
   * Test connectivity to Jira by fetching the server info.
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      await this.client.getServerInfo()
      return true
    } catch (error) {
      log.error({ err: error }, 'Jira connection test failed')
      return false
    }
  }

  /**
   * List all accessible projects.
   */
  async getProjects(): Promise<IJiraProject[]> {
    if (!this.client) {
      return []
    }

    try {
      const projects = await this.client.listProjects()
      return (projects as any[]).map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
      }))
    } catch (error) {
      log.error({ err: error }, 'getProjects failed')
      return []
    }
  }

  /**
   * Fetch a single issue by key (e.g. PROJ-123).
   */
  async getIssue(issueKey: string): Promise<IJiraIssue | null> {
    if (!this.client) {
      return null
    }

    try {
      const issue = await this.client.findIssue(issueKey)
      return this.mapIssue(issue)
    } catch (error) {
      log.error({ err: error, issueKey }, 'getIssue failed')
      return null
    }
  }

  private mapIssue(raw: any): IJiraIssue {
    return {
      id: raw.id,
      key: raw.key,
      summary: raw.fields?.summary,
      description: raw.fields?.description ?? undefined,
      status: raw.fields?.status?.name,
      issueType: raw.fields?.issuetype?.name,
      priority: raw.fields?.priority?.name ?? undefined,
      assignee: raw.fields?.assignee?.emailAddress ?? undefined,
      reporter: raw.fields?.reporter?.emailAddress ?? undefined,
      projectKey: raw.fields?.project?.key,
      labels: raw.fields?.labels ?? [],
      created: raw.fields?.created,
      updated: raw.fields?.updated,
    }
  }
}
