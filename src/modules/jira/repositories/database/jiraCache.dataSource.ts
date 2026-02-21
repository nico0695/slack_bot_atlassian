import { Repository } from 'typeorm'
import connectionSource from '../../../../config/ormconfig'
import { JiraIssueCache } from '../../../../entities/JiraIssueCache'
import { createModuleLogger } from '../../../../config/logger'

const log = createModuleLogger('jira.cache.dataSource')

export default class JiraCacheDataSource {
  private static instance: JiraCacheDataSource
  private repository: Repository<JiraIssueCache>

  private constructor() {
    this.repository = connectionSource.getRepository(JiraIssueCache)
  }

  static getInstance(): JiraCacheDataSource {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraCacheDataSource()
    return this.instance
  }

  async save(issueKey: string, projectKey: string, issueData: object): Promise<void> {
    try {
      await this.repository.save({
        issueKey,
        projectKey,
        issueData,
        lastUpdated: new Date(),
      })
    } catch (error) {
      log.error({ err: error, issueKey }, 'Failed to cache Jira issue')
    }
  }

  async findByKey(issueKey: string): Promise<JiraIssueCache | null> {
    try {
      return await this.repository.findOneBy({ issueKey })
    } catch (error) {
      log.error({ err: error, issueKey }, 'Failed to find cached Jira issue')
      return null
    }
  }

  async deleteByKey(issueKey: string): Promise<void> {
    try {
      await this.repository.delete({ issueKey })
    } catch (error) {
      log.error({ err: error, issueKey }, 'Failed to delete cached Jira issue')
    }
  }
}
