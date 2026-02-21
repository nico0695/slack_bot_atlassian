import { GenericResponse } from '../../../shared/interfaces/services'
import { createModuleLogger } from '../../../config/logger'

import BitbucketApiRepository from '../repositories/bitbucketApi.repository'
import { BitbucketCacheRedis } from '../repositories/redis/bitbucketCache.redis'
import {
  IBitbucketConnectionTest,
  IBitbucketRepository,
  IBitbucketPR,
  ICreateBitbucketPR,
  IBitbucketBranch,
  IBitbucketCommit,
} from '../shared/interfaces/bitbucket.interfaces'
import { PRState } from '../shared/constants/bitbucket.constants'

const log = createModuleLogger('bitbucket.service')

export default class BitbucketServices {
  private static instance: BitbucketServices

  private bitbucketApiRepository: BitbucketApiRepository
  private bitbucketCache: BitbucketCacheRedis

  private constructor() {
    this.bitbucketApiRepository = BitbucketApiRepository.getInstance()
    this.bitbucketCache = BitbucketCacheRedis.getInstance()
  }

  static getInstance(): BitbucketServices {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketServices()
    return this.instance
  }

  /**
   * Test connection to Bitbucket API
   */
  async testConnection(): Promise<GenericResponse<IBitbucketConnectionTest>> {
    try {
      const result = await this.bitbucketApiRepository.testConnection()

      if (result.success) {
        log.info('Bitbucket connection test successful')
      } else {
        log.warn({ message: result.message }, 'Bitbucket connection test failed')
      }

      return { data: result }
    } catch (error: any) {
      log.error({ err: error }, 'testConnection failed')
      return { error: error.message || 'Failed to test Bitbucket connection' }
    }
  }

  /**
   * List repositories in the configured workspace
   */
  async listRepositories(): Promise<GenericResponse<IBitbucketRepository[]>> {
    try {
      const repos = await this.bitbucketApiRepository.listRepositories()

      log.info({ count: repos.length }, 'Repositories listed')

      return { data: repos }
    } catch (error: any) {
      log.error({ err: error }, 'listRepositories failed')
      return { error: error.message || 'Failed to list repositories' }
    }
  }

  /**
   * List pull requests for a repository
   */
  async listPullRequests(
    repoSlug: string,
    state: PRState = PRState.OPEN
  ): Promise<GenericResponse<IBitbucketPR[]>> {
    try {
      const prs = await this.bitbucketApiRepository.listPullRequests(repoSlug, state)

      log.info({ repoSlug, state, count: prs.length }, 'PRs listed')

      return { data: prs }
    } catch (error: any) {
      log.error({ err: error, repoSlug }, 'listPullRequests failed')
      return { error: error.message || 'Failed to list pull requests' }
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(data: ICreateBitbucketPR): Promise<GenericResponse<IBitbucketPR>> {
    try {
      const pr = await this.bitbucketApiRepository.createPullRequest(data)

      log.info({ prId: pr.id, repoSlug: data.repoSlug }, 'PR created')

      return { data: pr }
    } catch (error: any) {
      log.error({ err: error, repoSlug: data.repoSlug }, 'createPullRequest failed')
      return { error: error.message || 'Failed to create pull request' }
    }
  }

  /**
   * Get configured workspace
   */
  getWorkspace(): string | undefined {
    return this.bitbucketApiRepository.getWorkspace()
  }

  /**
   * Get a specific pull request by ID, with Redis cache
   */
  async getPR(repoSlug: string, prId: number): Promise<GenericResponse<IBitbucketPR>> {
    try {
      const cached = await this.bitbucketCache.getPR(repoSlug, prId)
      if (cached) {
        return { data: cached }
      }

      const pr = await this.bitbucketApiRepository.getPR(repoSlug, prId)

      await this.bitbucketCache.setPR(repoSlug, prId, pr)

      log.info({ repoSlug, prId }, 'PR retrieved')

      return { data: pr }
    } catch (error: any) {
      log.error({ err: error, repoSlug, prId }, 'getPR failed')
      return { error: error.message || 'Failed to get pull request' }
    }
  }

  /**
   * List branches for a repository, with Redis cache
   */
  async getBranches(repoSlug: string): Promise<GenericResponse<IBitbucketBranch[]>> {
    try {
      const cached = await this.bitbucketCache.getBranches(repoSlug)
      if (cached) {
        return { data: cached }
      }

      const branches = await this.bitbucketApiRepository.getBranches(repoSlug)

      await this.bitbucketCache.setBranches(repoSlug, branches)

      log.info({ repoSlug, count: branches.length }, 'Branches listed')

      return { data: branches }
    } catch (error: any) {
      log.error({ err: error, repoSlug }, 'getBranches failed')
      return { error: error.message || 'Failed to list branches' }
    }
  }

  /**
   * List commits for a repository
   */
  async getCommits(
    repoSlug: string,
    branch?: string,
    limit = 30
  ): Promise<GenericResponse<IBitbucketCommit[]>> {
    try {
      const commits = await this.bitbucketApiRepository.getCommits(repoSlug, branch, limit)

      log.info({ repoSlug, branch, count: commits.length }, 'Commits listed')

      return { data: commits }
    } catch (error: any) {
      log.error({ err: error, repoSlug }, 'getCommits failed')
      return { error: error.message || 'Failed to list commits' }
    }
  }
}
