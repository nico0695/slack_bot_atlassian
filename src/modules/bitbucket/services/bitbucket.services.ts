import { createModuleLogger } from '../../../config/logger'
import { GenericResponse } from '../../../shared/interfaces/services'

import BitbucketApiRepository from '../repositories/bitbucketApi.repository'
import BitbucketCacheDataSource from '../repositories/database/bitbucketCache.dataSource'

import { IBitbucketPR, IBitbucketRepository } from '../shared/interfaces/bitbucket.interfaces'

const log = createModuleLogger('bitbucket.services')

export default class BitbucketServices {
  private static instance: BitbucketServices

  private bitbucketApiRepository: BitbucketApiRepository
  private bitbucketCacheDataSource: BitbucketCacheDataSource

  private constructor() {
    this.bitbucketApiRepository = BitbucketApiRepository.getInstance()
    this.bitbucketCacheDataSource = BitbucketCacheDataSource.getInstance()
  }

  static getInstance(): BitbucketServices {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketServices()
    return this.instance
  }

  /**
   * Verify that the Bitbucket API credentials are valid and the workspace is reachable.
   */
  async testConnection(): Promise<GenericResponse<boolean>> {
    try {
      const ok = await this.bitbucketApiRepository.testConnection()
      return { data: ok }
    } catch (error) {
      log.error({ err: error }, 'testConnection failed')
      return { error: 'Bitbucket connection test failed' }
    }
  }

  /**
   * Return all repositories in the configured workspace.
   */
  async getRepositories(): Promise<GenericResponse<IBitbucketRepository[]>> {
    try {
      const repos = await this.bitbucketApiRepository.getRepositories()
      return { data: repos }
    } catch (error) {
      log.error({ err: error }, 'getRepositories failed')
      return { error: 'Error fetching Bitbucket repositories' }
    }
  }

  /**
   * Return open pull requests for a repository, caching each one locally.
   */
  async getPullRequests(repoSlug: string): Promise<GenericResponse<IBitbucketPR[]>> {
    try {
      const prs = await this.bitbucketApiRepository.getPullRequests(repoSlug)

      for (const pr of prs) {
        await this.bitbucketCacheDataSource.upsertPR(pr.id, pr.repoSlug, pr.status, pr as object)
      }

      return { data: prs }
    } catch (error) {
      log.error({ err: error, repoSlug }, 'getPullRequests failed')
      return { error: 'Error fetching Bitbucket pull requests' }
    }
  }
}
