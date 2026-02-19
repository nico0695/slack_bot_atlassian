import { BitbucketPRCache } from '../../../../entities/BitbucketPRCache'
import { createModuleLogger } from '../../../../config/logger'

const log = createModuleLogger('bitbucket.cache.dataSource')

/**
 * Local SQLite cache for Bitbucket pull requests.
 * Reduces redundant API calls for recently fetched PRs.
 */
export default class BitbucketCacheDataSource {
  private static instance: BitbucketCacheDataSource

  private constructor() {}

  static getInstance(): BitbucketCacheDataSource {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketCacheDataSource()
    return this.instance
  }

  async upsertPR(
    prId: number,
    repoSlug: string,
    status: string,
    prData: object
  ): Promise<void> {
    try {
      await BitbucketPRCache.getRepository().save({
        prId,
        repoSlug,
        status,
        prData,
        lastUpdated: new Date(),
      })
    } catch (error) {
      log.error({ err: error, prId }, 'upsertPR failed')
    }
  }

  async getPR(prId: number): Promise<BitbucketPRCache | null> {
    try {
      return await BitbucketPRCache.findOne({ where: { prId } })
    } catch (error) {
      log.error({ err: error, prId }, 'getPR cache lookup failed')
      return null
    }
  }
}
