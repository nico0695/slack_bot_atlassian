import { GenericResponse } from '../../../shared/interfaces/services'
import { createModuleLogger } from '../../../config/logger'

import JiraApiRepository from '../repositories/jiraApi.repository'
import { JiraCacheRedis } from '../repositories/redis/jiraCache.redis'
import {
  IJiraConnectionTest,
  IJiraIssue,
  IJiraProject,
  IJiraSearchResult,
} from '../shared/interfaces/jira.interfaces'
import { JQLBuilder } from '../utils/jql.builder'

const log = createModuleLogger('jira.service')

export default class JiraServices {
  private static instance: JiraServices

  private jiraApiRepository: JiraApiRepository
  private jiraCache: JiraCacheRedis

  private constructor() {
    this.jiraApiRepository = JiraApiRepository.getInstance()
    this.jiraCache = JiraCacheRedis.getInstance()
  }

  static getInstance(): JiraServices {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraServices()
    return this.instance
  }

  /**
   * Test connection to Jira API
   */
  async testConnection(): Promise<GenericResponse<IJiraConnectionTest>> {
    try {
      const result = await this.jiraApiRepository.testConnection()

      if (result.success) {
        log.info('Jira connection test successful')
      } else {
        log.warn({ message: result.message }, 'Jira connection test failed')
      }

      return {
        data: result,
      }
    } catch (error: any) {
      log.error({ err: error }, 'testConnection failed')
      return {
        error: error.message || 'Failed to test Jira connection',
      }
    }
  }

  /**
   * Get project information
   */
  async getProject(projectKey?: string): Promise<GenericResponse<IJiraProject>> {
    try {
      const project = await this.jiraApiRepository.getProject(projectKey)

      log.info({ projectKey: project.key }, 'Project retrieved successfully')

      return {
        data: project,
      }
    } catch (error: any) {
      log.error({ err: error, projectKey }, 'getProject failed')
      return {
        error: error.message || 'Failed to get project information',
      }
    }
  }

  /**
   * Get configured project key
   */
  getConfiguredProjectKey(): string | undefined {
    return this.jiraApiRepository.getConfiguredProjectKey()
  }

  /**
   * Get a specific Jira issue by key (e.g. PROJ-123), with Redis cache
   */
  async getIssue(issueKey: string): Promise<GenericResponse<IJiraIssue>> {
    try {
      const cached = await this.jiraCache.getIssue(issueKey)
      if (cached) {
        return { data: cached }
      }

      const issue = await this.jiraApiRepository.getIssue(issueKey)

      await this.jiraCache.setIssue(issueKey, issue)

      log.info({ issueKey }, 'Issue retrieved')

      return { data: issue }
    } catch (error: any) {
      log.error({ err: error, issueKey }, 'getIssue failed')
      return { error: error.message || 'Failed to get issue' }
    }
  }

  /**
   * Search issues with a JQL query
   */
  async searchIssues(
    jql: string,
    maxResults = 50,
    startAt = 0
  ): Promise<GenericResponse<IJiraSearchResult>> {
    try {
      const result = await this.jiraApiRepository.searchIssues(jql, maxResults, startAt)

      log.info({ total: result.total }, 'Issues searched')

      return { data: result }
    } catch (error: any) {
      log.error({ err: error, jql }, 'searchIssues failed')
      return { error: error.message || 'Failed to search issues' }
    }
  }

  /**
   * Full-text search for issues by summary or description
   */
  async searchByText(
    text: string,
    projectKey?: string
  ): Promise<GenericResponse<IJiraSearchResult>> {
    try {
      const builder = new JQLBuilder().textSearch(text)

      const key = projectKey || this.jiraApiRepository.getConfiguredProjectKey()
      if (key) {
        builder.project(key)
      }

      builder.notInStatus('Done').orderBy('updated', 'DESC')

      const jql = builder.build()
      const result = await this.jiraApiRepository.searchIssues(jql, 20, 0)

      log.info({ text, total: result.total }, 'Issues searched by text')

      return { data: result }
    } catch (error: any) {
      log.error({ err: error, text }, 'searchByText failed')
      return { error: error.message || 'Failed to search issues' }
    }
  }

  /**
   * Get issues assigned to the configured Jira user, with Redis cache
   */
  async getAssignedToMe(projectKey?: string): Promise<GenericResponse<IJiraSearchResult>> {
    try {
      const email = this.jiraApiRepository.getConfiguredEmail()

      if (email) {
        const cached = await this.jiraCache.getUserIssues(email)
        if (cached) {
          return { data: cached }
        }
      }

      const result = await this.jiraApiRepository.getAssignedToMe(projectKey)

      if (email) {
        await this.jiraCache.setUserIssues(email, result)
      }

      log.info({ total: result.total }, 'Assigned issues retrieved')

      return { data: result }
    } catch (error: any) {
      log.error({ err: error }, 'getAssignedToMe failed')
      return { error: error.message || 'Failed to get assigned issues' }
    }
  }

  /**
   * Get active sprint issues for a project, with Redis cache
   */
  async getActiveSprint(projectKey?: string): Promise<GenericResponse<IJiraSearchResult>> {
    try {
      const key = projectKey || this.jiraApiRepository.getConfiguredProjectKey()

      if (key) {
        const cached = await this.jiraCache.getActiveSprint(key)
        if (cached) {
          return { data: cached }
        }
      }

      const result = await this.jiraApiRepository.getActiveSprint(projectKey)

      if (key) {
        await this.jiraCache.setActiveSprint(key, result)
      }

      log.info({ total: result.total }, 'Active sprint issues retrieved')

      return { data: result }
    } catch (error: any) {
      log.error({ err: error }, 'getActiveSprint failed')
      return { error: error.message || 'Failed to get active sprint' }
    }
  }

  /**
   * Get backlog issues for a project
   */
  async getBacklog(projectKey?: string): Promise<GenericResponse<IJiraSearchResult>> {
    try {
      const result = await this.jiraApiRepository.getBacklog(projectKey)

      log.info({ total: result.total }, 'Backlog issues retrieved')

      return { data: result }
    } catch (error: any) {
      log.error({ err: error }, 'getBacklog failed')
      return { error: error.message || 'Failed to get backlog' }
    }
  }
}
