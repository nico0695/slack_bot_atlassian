import { GenericResponse } from '../../../shared/interfaces/services'
import { createModuleLogger } from '../../../config/logger'

import JiraApiRepository from '../repositories/jiraApi.repository'
import { IJiraConnectionTest, IJiraProject } from '../shared/interfaces/jira.interfaces'

const log = createModuleLogger('jira.service')

export default class JiraServices {
  private static instance: JiraServices

  private jiraApiRepository: JiraApiRepository

  private constructor() {
    this.jiraApiRepository = JiraApiRepository.getInstance()
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
}
