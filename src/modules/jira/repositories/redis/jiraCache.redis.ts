import { RedisConfig } from '../../../../config/redisConfig'
import { createModuleLogger } from '../../../../config/logger'
import { JIRA_CACHE_PREFIX, JIRA_CACHE_TTL } from '../../shared/constants/jira.constants'
import { IJiraIssue, IJiraSearchResult } from '../../shared/interfaces/jira.interfaces'

const log = createModuleLogger('jira.cache.redis')

const cacheKey = {
  issue: (issueKey: string) => `${JIRA_CACHE_PREFIX}:issue:${issueKey}`,
  activeSprint: (projectKey: string) => `${JIRA_CACHE_PREFIX}:sprint:active:${projectKey}`,
  userIssues: (email: string) => `${JIRA_CACHE_PREFIX}:user:${encodeURIComponent(email)}:issues`,
}

export class JiraCacheRedis {
  private static instance: JiraCacheRedis
  private redisClient: any

  private constructor() {
    this.redisClient = RedisConfig.getClient()
  }

  static getInstance(): JiraCacheRedis {
    if (!this.instance) {
      this.instance = new JiraCacheRedis()
    }
    return this.instance
  }

  async getIssue(issueKey: string): Promise<IJiraIssue | null> {
    try {
      const raw = await this.redisClient.get(cacheKey.issue(issueKey))
      return raw ? (JSON.parse(raw) as IJiraIssue) : null
    } catch (error) {
      log.error({ err: error, issueKey }, 'getIssue cache read failed')
      return null
    }
  }

  async setIssue(issueKey: string, issue: IJiraIssue): Promise<void> {
    try {
      await this.redisClient.set(cacheKey.issue(issueKey), JSON.stringify(issue), {
        EX: JIRA_CACHE_TTL.ISSUE,
      })
    } catch (error) {
      log.error({ err: error, issueKey }, 'setIssue cache write failed')
    }
  }

  async getActiveSprint(projectKey: string): Promise<IJiraSearchResult | null> {
    try {
      const raw = await this.redisClient.get(cacheKey.activeSprint(projectKey))
      return raw ? (JSON.parse(raw) as IJiraSearchResult) : null
    } catch (error) {
      log.error({ err: error, projectKey }, 'getActiveSprint cache read failed')
      return null
    }
  }

  async setActiveSprint(projectKey: string, result: IJiraSearchResult): Promise<void> {
    try {
      await this.redisClient.set(cacheKey.activeSprint(projectKey), JSON.stringify(result), {
        EX: JIRA_CACHE_TTL.SPRINT,
      })
    } catch (error) {
      log.error({ err: error, projectKey }, 'setActiveSprint cache write failed')
    }
  }

  async getUserIssues(email: string): Promise<IJiraSearchResult | null> {
    try {
      const raw = await this.redisClient.get(cacheKey.userIssues(email))
      return raw ? (JSON.parse(raw) as IJiraSearchResult) : null
    } catch (error) {
      log.error({ err: error }, 'getUserIssues cache read failed')
      return null
    }
  }

  async setUserIssues(email: string, result: IJiraSearchResult): Promise<void> {
    try {
      await this.redisClient.set(cacheKey.userIssues(email), JSON.stringify(result), {
        EX: JIRA_CACHE_TTL.USER_ISSUES,
      })
    } catch (error) {
      log.error({ err: error }, 'setUserIssues cache write failed')
    }
  }
}
