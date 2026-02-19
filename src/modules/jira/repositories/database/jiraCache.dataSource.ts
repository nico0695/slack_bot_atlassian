import { JiraIssueCache } from '../../../../entities/JiraIssueCache'
import { createModuleLogger } from '../../../../config/logger'

const log = createModuleLogger('jira.cache.dataSource')

/**
 * Local SQLite cache for Jira issues.
 * Reduces redundant API calls for recently fetched issues.
 */
export default class JiraCacheDataSource {
  private static instance: JiraCacheDataSource

  private constructor() {}

  static getInstance(): JiraCacheDataSource {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraCacheDataSource()
    return this.instance
  }

  async upsertIssue(issueKey: string, projectKey: string, issueData: object): Promise<void> {
    try {
      await JiraIssueCache.getRepository().save({
        issueKey,
        projectKey,
        issueData,
        lastUpdated: new Date(),
      })
    } catch (error) {
      log.error({ err: error, issueKey }, 'upsertIssue failed')
    }
  }

  async getIssue(issueKey: string): Promise<JiraIssueCache | null> {
    try {
      return await JiraIssueCache.findOne({ where: { issueKey } })
    } catch (error) {
      log.error({ err: error, issueKey }, 'getIssue cache lookup failed')
      return null
    }
  }
}
