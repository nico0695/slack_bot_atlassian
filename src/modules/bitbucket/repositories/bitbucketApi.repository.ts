import axios, { AxiosInstance } from 'axios'

import { createModuleLogger } from '../../../config/logger'
import {
  IBitbucketConnectionConfig,
  IBitbucketPR,
  IBitbucketRepository,
} from '../shared/interfaces/bitbucket.interfaces'
import { BITBUCKET_API_BASE } from '../shared/constants/bitbucket.constants'

const log = createModuleLogger('bitbucket.api.repository')

/**
 * Wrapper around the Bitbucket Cloud REST API v2.
 * Uses HTTP Basic Auth with an app password.
 */
export default class BitbucketApiRepository {
  private static instance: BitbucketApiRepository

  private client: AxiosInstance | null = null
  private workspace: string = ''

  private constructor() {
    this.initClient()
  }

  static getInstance(): BitbucketApiRepository {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketApiRepository()
    return this.instance
  }

  private initClient(): void {
    const workspace = process.env.BITBUCKET_WORKSPACE
    const username = process.env.BITBUCKET_USERNAME
    const appPassword = process.env.BITBUCKET_APP_PASSWORD

    if (!workspace || !username || !appPassword) {
      log.warn(
        'Bitbucket credentials not configured — BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, BITBUCKET_APP_PASSWORD required'
      )
      return
    }

    const config: IBitbucketConnectionConfig = { workspace, username, appPassword }

    this.workspace = config.workspace
    this.client = axios.create({
      baseURL: BITBUCKET_API_BASE,
      auth: { username: config.username, password: config.appPassword },
    })

    log.info({ workspace: config.workspace }, 'Bitbucket client initialised')
  }

  /**
   * Test connectivity by fetching the workspace info.
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      await this.client.get(`/workspaces/${this.workspace}`)
      return true
    } catch (error) {
      log.error({ err: error }, 'Bitbucket connection test failed')
      return false
    }
  }

  /**
   * List all repositories in the configured workspace.
   */
  async getRepositories(): Promise<IBitbucketRepository[]> {
    if (!this.client) {
      return []
    }

    try {
      const { data } = await this.client.get(`/repositories/${this.workspace}`)
      return (data.values ?? []).map((r: any) => ({
        slug: r.slug,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
      }))
    } catch (error) {
      log.error({ err: error }, 'getRepositories failed')
      return []
    }
  }

  /**
   * List open pull requests for a given repository.
   */
  async getPullRequests(repoSlug: string): Promise<IBitbucketPR[]> {
    if (!this.client) {
      return []
    }

    try {
      const { data } = await this.client.get(
        `/repositories/${this.workspace}/${repoSlug}/pullrequests`
      )
      return (data.values ?? []).map((pr: any) => this.mapPR(pr, repoSlug))
    } catch (error) {
      log.error({ err: error, repoSlug }, 'getPullRequests failed')
      return []
    }
  }

  private mapPR(raw: any, repoSlug: string): IBitbucketPR {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? undefined,
      status: raw.state,
      author: raw.author?.display_name ?? raw.author?.nickname ?? '',
      sourceBranch: raw.source?.branch?.name ?? '',
      targetBranch: raw.destination?.branch?.name ?? '',
      repoSlug,
      created: raw.created_on,
      updated: raw.updated_on,
      reviewers: (raw.reviewers ?? []).map((r: any) => r.display_name ?? r.nickname),
    }
  }
}
