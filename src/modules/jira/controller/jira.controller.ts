import { createModuleLogger } from '../../../config/logger'
import JiraServices from '../services/jira.services'
import { formatIssueForSlack, formatIssueListForSlack } from '../utils/jiraFormatters'

const log = createModuleLogger('jira.controller')

export default class JiraController {
  private static instance: JiraController

  private jiraServices: JiraServices

  private constructor() {
    this.jiraServices = JiraServices.getInstance()

    this.testConnection = this.testConnection.bind(this)
    this.getProject = this.getProject.bind(this)
    this.getIssue = this.getIssue.bind(this)
    this.getAssignedToMe = this.getAssignedToMe.bind(this)
    this.getActiveSprint = this.getActiveSprint.bind(this)
    this.getBacklog = this.getBacklog.bind(this)
    this.searchByText = this.searchByText.bind(this)
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

  /**
   * Slack command: .jira issue PROJ-123
   * Show details for a specific issue
   */
  public async getIssue(data: any): Promise<void> {
    const { payload, say } = data

    try {
      const issueKey = payload.text.replace(/^\.jira\s+issue\s*/i, '').trim().toUpperCase()

      if (!issueKey || !/^[A-Z]+-\d+$/.test(issueKey)) {
        say('Usage: `.jira issue PROJ-123`')
        return
      }

      const response = await this.jiraServices.getIssue(issueKey)

      if (response.error) {
        say(`Error fetching issue: ${response.error}`)
        return
      }

      say(formatIssueForSlack(response.data))
    } catch (error) {
      log.error({ err: error }, 'getIssue Slack command failed')
      say('Ups! Error fetching issue.')
    }
  }

  /**
   * Slack command: .jira list
   * Show issues assigned to me
   */
  public async getAssignedToMe(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.jiraServices.getAssignedToMe()

      if (response.error) {
        say(`Error fetching assigned issues: ${response.error}`)
        return
      }

      const result = response.data
      const header = `*My Issues (${result.total}):*\n`
      say(header + formatIssueListForSlack(result.issues))
    } catch (error) {
      log.error({ err: error }, 'getAssignedToMe Slack command failed')
      say('Ups! Error fetching assigned issues.')
    }
  }

  /**
   * Slack command: .jira sprint
   * Show active sprint issues
   */
  public async getActiveSprint(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.jiraServices.getActiveSprint()

      if (response.error) {
        say(`Error fetching active sprint: ${response.error}`)
        return
      }

      const result = response.data
      const header = `*Active Sprint (${result.total} issues):*\n`
      say(header + formatIssueListForSlack(result.issues))
    } catch (error) {
      log.error({ err: error }, 'getActiveSprint Slack command failed')
      say('Ups! Error fetching active sprint.')
    }
  }

  /**
   * Slack command: .jira backlog
   * Show backlog issues
   */
  public async getBacklog(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.jiraServices.getBacklog()

      if (response.error) {
        say(`Error fetching backlog: ${response.error}`)
        return
      }

      const result = response.data
      const header = `*Backlog (${result.total} issues):*\n`
      say(header + formatIssueListForSlack(result.issues))
    } catch (error) {
      log.error({ err: error }, 'getBacklog Slack command failed')
      say('Ups! Error fetching backlog.')
    }
  }

  /**
   * Slack command: .jira search <text>
   * Full-text search by summary or description
   */
  public async searchByText(data: any): Promise<void> {
    const { payload, say } = data

    try {
      const raw: string = payload.text.replace(/^\.jira\s+search\s*/i, '').trim()
      const text: string = raw.replace(/^["'](.+)["']$/, '$1').trim()

      if (!text) {
        say('Usage: `.jira search <text>` — e.g. `.jira search login oauth`')
        return
      }

      const response = await this.jiraServices.searchByText(text)

      if (response.error) {
        say(`Error searching issues: ${response.error}`)
        return
      }

      const result = response.data
      if (result.total === 0) {
        say(`No issues found matching \`${text}\`.`)
        return
      }

      const header = `*Search results for \`${text}\` (${result.total}):*\n`
      say(header + formatIssueListForSlack(result.issues))
    } catch (error) {
      log.error({ err: error }, 'searchByText Slack command failed')
      say('Ups! Error searching issues.')
    }
  }
}
