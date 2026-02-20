import axios, { AxiosInstance } from 'axios'
import { createModuleLogger } from '../../../config/logger'
import {
  IBitbucketConfig,
  IBitbucketConnectionTest,
  IBitbucketRepository,
  IBitbucketPR,
  ICreateBitbucketPR,
} from '../shared/interfaces/bitbucket.interfaces'
import { PRState } from '../shared/constants/bitbucket.constants'

const log = createModuleLogger('bitbucket.api.repository')

export default class BitbucketApiRepository {
  private static instance: BitbucketApiRepository
  private client: AxiosInstance | null = null
  private config: IBitbucketConfig | null = null

  private constructor() {
    this.initializeClient()
  }

  static getInstance(): BitbucketApiRepository {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketApiRepository()
    return this.instance
  }

  /**
   * Initialize Axios client with Bitbucket credentials
   */
  private initializeClient(): void {
    try {
      const workspace = process.env.BITBUCKET_WORKSPACE
      const username = process.env.BITBUCKET_USERNAME
      const appPassword = process.env.BITBUCKET_APP_PASSWORD
      const defaultRepo = process.env.BITBUCKET_DEFAULT_REPO

      if (!workspace || !username || !appPassword) {
        log.warn('Bitbucket credentials not configured. API calls will fail.')
        return
      }

      this.config = { workspace, username, appPassword, defaultRepo }

      this.client = axios.create({
        baseURL: 'https://api.bitbucket.org/2.0',
        auth: { username, password: appPassword },
        timeout: 10000,
      })

      log.info({ workspace }, 'Bitbucket client initialized')
    } catch (error) {
      log.error({ err: error }, 'Failed to initialize Bitbucket client')
    }
  }

  private ensureClient(): void {
    if (!this.client) {
      throw new Error(
        'Bitbucket client not configured. Please set BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, and BITBUCKET_APP_PASSWORD environment variables.'
      )
    }
  }

  private get apiClient(): AxiosInstance {
    if (this.client === null) {
      throw new Error(
        'Bitbucket client not configured. Please set BITBUCKET_WORKSPACE, BITBUCKET_USERNAME, and BITBUCKET_APP_PASSWORD environment variables.'
      )
    }
    return this.client
  }

  private get workspace(): string {
    return this.config?.workspace ?? ''
  }

  /**
   * Test connection by fetching the workspace info
   */
  async testConnection(): Promise<IBitbucketConnectionTest> {
    try {
      const response = await this.apiClient.get(`/workspaces/${this.workspace}`)

      log.info({ workspace: this.workspace }, 'Bitbucket connection successful')

      return {
        success: true,
        message: 'Successfully connected to Bitbucket',
        workspace: response.data.slug,
      }
    } catch (error: any) {
      log.error({ err: error }, 'Bitbucket connection test failed')

      return {
        success: false,
        message: error.message || 'Failed to connect to Bitbucket',
      }
    }
  }

  /**
   * List repositories in the workspace
   */
  async listRepositories(): Promise<IBitbucketRepository[]> {
    try {
      const response = await this.apiClient.get(`/repositories/${this.workspace}`, {
        params: { pagelen: 50, sort: '-updated_on' },
      })

      log.debug({ count: response.data.values?.length }, 'Repositories retrieved')

      return (response.data.values ?? []).map((r: any) => ({
        slug: r.slug,
        name: r.name,
        description: r.description,
        isPrivate: r.is_private,
        mainBranch: r.mainbranch?.name,
        language: r.language,
        updatedOn: r.updated_on,
      }))
    } catch (error: any) {
      log.error({ err: error }, 'Failed to list repositories')
      throw error
    }
  }

  /**
   * List pull requests for a repository
   */
  async listPullRequests(repoSlug: string, state: PRState = PRState.OPEN): Promise<IBitbucketPR[]> {
    try {
      const response = await this.apiClient.get(
        `/repositories/${this.workspace}/${repoSlug}/pullrequests`,
        { params: { state, pagelen: 50 } }
      )

      log.debug({ repoSlug, state, count: response.data.values?.length }, 'PRs retrieved')

      return (response.data.values ?? []).map((pr: any) => ({
        id: pr.id,
        title: pr.title,
        description: pr.description,
        state: pr.state,
        author: pr.author?.display_name,
        sourceBranch: pr.source?.branch?.name,
        destinationBranch: pr.destination?.branch?.name,
        createdOn: pr.created_on,
        updatedOn: pr.updated_on,
        commentCount: pr.comment_count,
      }))
    } catch (error: any) {
      log.error({ err: error, repoSlug }, 'Failed to list PRs')
      throw error
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(data: ICreateBitbucketPR): Promise<IBitbucketPR> {
    try {
      const payload: any = {
        title: data.title,
        description: data.description,
        source: { branch: { name: data.sourceBranch } },
        destination: { branch: { name: data.destinationBranch } },
        close_source_branch: data.closeSourceBranch ?? true,
      }

      if (data.reviewers && data.reviewers.length > 0) {
        payload.reviewers = data.reviewers.map((uuid) => ({ uuid }))
      }

      const response = await this.apiClient.post(
        `/repositories/${this.workspace}/${data.repoSlug}/pullrequests`,
        payload
      )

      log.info({ prId: response.data.id, repoSlug: data.repoSlug }, 'PR created')

      return {
        id: response.data.id,
        title: response.data.title,
        description: response.data.description,
        state: response.data.state,
        author: response.data.author?.display_name,
        sourceBranch: response.data.source?.branch?.name,
        destinationBranch: response.data.destination?.branch?.name,
        createdOn: response.data.created_on,
        updatedOn: response.data.updated_on,
        commentCount: response.data.comment_count,
      }
    } catch (error: any) {
      log.error({ err: error, repoSlug: data.repoSlug }, 'Failed to create PR')
      throw error
    }
  }

  /**
   * Get the configured default repo slug
   */
  getDefaultRepo(): string | undefined {
    return this.config?.defaultRepo
  }

  /**
   * Get the configured workspace
   */
  getWorkspace(): string | undefined {
    return this.config?.workspace
  }
}
