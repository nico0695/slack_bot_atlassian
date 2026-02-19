import { createModuleLogger } from '../../../config/logger'
import { GenericResponse } from '../../../shared/interfaces/services'

import JiraApiRepository from '../repositories/jiraApi.repository'
import JiraCacheDataSource from '../repositories/database/jiraCache.dataSource'

import { IJiraIssue, IJiraProject } from '../shared/interfaces/jira.interfaces'

const log = createModuleLogger('jira.services')

export default class JiraServices {
  private static instance: JiraServices

  private jiraApiRepository: JiraApiRepository
  private jiraCacheDataSource: JiraCacheDataSource

  private constructor() {
    this.jiraApiRepository = JiraApiRepository.getInstance()
    this.jiraCacheDataSource = JiraCacheDataSource.getInstance()
  }

  static getInstance(): JiraServices {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraServices()
    return this.instance
  }

  /**
   * Verify that the Jira API credentials are valid and the service is reachable.
   */
  async testConnection(): Promise<GenericResponse<boolean>> {
    try {
      const ok = await this.jiraApiRepository.testConnection()
      return { data: ok }
    } catch (error) {
      log.error({ err: error }, 'testConnection failed')
      return { error: 'Jira connection test failed' }
    }
  }

  /**
   * Return all accessible Jira projects.
   */
  async getProjects(): Promise<GenericResponse<IJiraProject[]>> {
    try {
      const projects = await this.jiraApiRepository.getProjects()
      return { data: projects }
    } catch (error) {
      log.error({ err: error }, 'getProjects failed')
      return { error: 'Error fetching Jira projects' }
    }
  }

  /**
   * Fetch a single Jira issue, using the local cache when available.
   */
  async getIssue(issueKey: string): Promise<GenericResponse<IJiraIssue | null>> {
    try {
      const issue = await this.jiraApiRepository.getIssue(issueKey)

      if (issue) {
        await this.jiraCacheDataSource.upsertIssue(issueKey, issue.projectKey, issue as object)
      }

      return { data: issue }
    } catch (error) {
      log.error({ err: error, issueKey }, 'getIssue failed')
      return { error: 'Error fetching Jira issue' }
    }
  }
}
