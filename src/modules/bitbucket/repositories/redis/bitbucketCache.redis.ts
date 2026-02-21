import { RedisConfig } from '../../../../config/redisConfig'
import { createModuleLogger } from '../../../../config/logger'
import {
  BITBUCKET_CACHE_PREFIX,
  BITBUCKET_CACHE_TTL,
} from '../../shared/constants/bitbucket.constants'
import { IBitbucketBranch, IBitbucketPR } from '../../shared/interfaces/bitbucket.interfaces'

const log = createModuleLogger('bitbucket.cache.redis')

const cacheKey = {
  branches: (repoSlug: string) => `${BITBUCKET_CACHE_PREFIX}:repo:${repoSlug}:branches`,
  pr: (repoSlug: string, prId: number) => `${BITBUCKET_CACHE_PREFIX}:pr:${repoSlug}:${prId}`,
}

export class BitbucketCacheRedis {
  private static instance: BitbucketCacheRedis
  private redisClient: any

  private constructor() {
    this.redisClient = RedisConfig.getClient()
  }

  static getInstance(): BitbucketCacheRedis {
    if (!this.instance) {
      this.instance = new BitbucketCacheRedis()
    }
    return this.instance
  }

  async getBranches(repoSlug: string): Promise<IBitbucketBranch[] | null> {
    try {
      const raw = await this.redisClient.get(cacheKey.branches(repoSlug))
      return raw ? (JSON.parse(raw) as IBitbucketBranch[]) : null
    } catch (error) {
      log.error({ err: error, repoSlug }, 'getBranches cache read failed')
      return null
    }
  }

  async setBranches(repoSlug: string, branches: IBitbucketBranch[]): Promise<void> {
    try {
      await this.redisClient.set(cacheKey.branches(repoSlug), JSON.stringify(branches), {
        EX: BITBUCKET_CACHE_TTL.BRANCHES,
      })
    } catch (error) {
      log.error({ err: error, repoSlug }, 'setBranches cache write failed')
    }
  }

  async getPR(repoSlug: string, prId: number): Promise<IBitbucketPR | null> {
    try {
      const raw = await this.redisClient.get(cacheKey.pr(repoSlug, prId))
      return raw ? (JSON.parse(raw) as IBitbucketPR) : null
    } catch (error) {
      log.error({ err: error, repoSlug, prId }, 'getPR cache read failed')
      return null
    }
  }

  async setPR(repoSlug: string, prId: number, pr: IBitbucketPR): Promise<void> {
    try {
      await this.redisClient.set(cacheKey.pr(repoSlug, prId), JSON.stringify(pr), {
        EX: BITBUCKET_CACHE_TTL.PR,
      })
    } catch (error) {
      log.error({ err: error, repoSlug, prId }, 'setPR cache write failed')
    }
  }
}
