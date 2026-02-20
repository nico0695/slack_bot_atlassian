import { createModuleLogger } from '../../../config/logger'
import JiraServices from '../services/jira.services'

const log = createModuleLogger('jira.controller')

export default class JiraController {
  private static instance: JiraController

  private jiraServices: JiraServices

  private constructor() {
    this.jiraServices = JiraServices.getInstance()

    this.testConnection = this.testConnection.bind(this)
    this.getProject = this.getProject.bind(this)
  }

  static getInstance(): JiraController {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraController()
    return this.instance
  }

  /**
   * Slack command: .jira test
   * Test Jira API connectivity
   */
  public async testConnection(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.jiraServices.testConnection()

      if (response.error) {
        say(`Error connecting to Jira: ${response.error}`)
        return
      }

      const info = response.data
      if (info?.success) {
        say(`✅ Jira connected — version ${info.serverInfo?.version ?? 'unknown'}`)
      } else {
        say(`⚠️ Jira connection failed: ${info?.message ?? 'unknown error'}`)
      }
    } catch (error) {
      log.error({ err: error }, 'testConnection Slack command failed')
      say('Ups! Error testing Jira connection.')
    }
  }

  /**
   * Slack command: .jira project
   * Show configured Jira project info
   */
  public async getProject(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.jiraServices.getProject()

      if (response.error) {
        say(`Error fetching Jira project: ${response.error}`)
        return
      }

      const project = response.data
      const lines = [
        `*Project: ${project?.name}* (${project?.key})`,
        project?.description ? `Description: ${project.description}` : null,
        project?.lead ? `Lead: ${project.lead}` : null,
      ].filter(Boolean)

      say(lines.join('\n'))
    } catch (error) {
      log.error({ err: error }, 'getProject Slack command failed')
      say('Ups! Error fetching Jira project.')
    }
  }
}
