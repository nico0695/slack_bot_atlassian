/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'

import GenericController from '../../../shared/modules/genericController'
import BadRequestError from '../../../shared/utils/errors/BadRequestError'
import { validateQuery, validateBody } from '../../../shared/utils/validation'

import BitbucketServices from '../services/bitbucket.services'

import { HttpAuth, Permission } from '../../../shared/middleware/auth'
import { Profiles } from '../../../shared/constants/auth.constants'
import { listPRsSchema, createPRSchema } from '../shared/schemas/bitbucket.schemas'
import { ICreateBitbucketPR } from '../shared/interfaces/bitbucket.interfaces'

export default class BitbucketWebController extends GenericController {
  private static instance: BitbucketWebController

  public router: Router

  private bitbucketServices: BitbucketServices

  private constructor() {
    super()
    this.testConnection = this.testConnection.bind(this)
    this.listRepositories = this.listRepositories.bind(this)
    this.listPullRequests = this.listPullRequests.bind(this)
    this.createPullRequest = this.createPullRequest.bind(this)

    this.bitbucketServices = BitbucketServices.getInstance()

    this.router = Router()
    this.registerRoutes()
  }

  static getInstance(): BitbucketWebController {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketWebController()
    return this.instance
  }

  protected registerRoutes(): void {
    this.router.get('/test', this.testConnection)
    this.router.get('/repositories', this.listRepositories)
    this.router.get('/pullrequests', this.listPullRequests)
    this.router.post('/pullrequests', this.createPullRequest)
  }

  /**
   * Test Bitbucket API connection
   * GET /bitbucket/test
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async testConnection(req: any, res: any): Promise<void> {
    const response = await this.bitbucketServices.testConnection()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * List repositories in workspace
   * GET /bitbucket/repositories
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async listRepositories(req: any, res: any): Promise<void> {
    const response = await this.bitbucketServices.listRepositories()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * List pull requests for a repository
   * GET /bitbucket/pullrequests?repoSlug=...&state=OPEN
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async listPullRequests(req: any, res: any): Promise<void> {
    const parsed = validateQuery(listPRsSchema, req.query)

    const response = await this.bitbucketServices.listPullRequests(parsed.repoSlug, parsed.state)

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * Create a pull request
   * POST /bitbucket/pullrequests
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async createPullRequest(req: any, res: any): Promise<void> {
    const parsed = validateBody(createPRSchema, req.body)

    const prData: ICreateBitbucketPR = {
      repoSlug: parsed.repoSlug,
      title: parsed.title,
      description: parsed.description,
      sourceBranch: parsed.sourceBranch,
      destinationBranch: parsed.destinationBranch,
      closeSourceBranch: parsed.closeSourceBranch,
      reviewers: parsed.reviewers,
    }

    const response = await this.bitbucketServices.createPullRequest(prData)

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }
}
