import { GenericResponse } from '../../../shared/interfaces/services'
import { createModuleLogger } from '../../../config/logger'

import BitbucketApiRepository from '../repositories/bitbucketApi.repository'
import {
  IBitbucketConnectionTest,
  IBitbucketRepository,
  IBitbucketPR,
  ICreateBitbucketPR,
} from '../shared/interfaces/bitbucket.interfaces'
import { PRState } from '../shared/constants/bitbucket.constants'

const log = createModuleLogger('bitbucket.service')

export default class BitbucketServices {
  private static instance: BitbucketServices

  private bitbucketApiRepository: BitbucketApiRepository

  private constructor() {
    this.bitbucketApiRepository = BitbucketApiRepository.getInstance()
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
}
