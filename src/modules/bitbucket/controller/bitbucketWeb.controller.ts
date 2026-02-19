import { Router, Request, Response } from 'express'

import GenericController from '../../../shared/modules/genericController'
import BadRequestError from '../../../shared/utils/errors/BadRequestError'
import { validateParams } from '../../../shared/utils/validation'

import BitbucketServices from '../services/bitbucket.services'
import { bitbucketRepoParamSchema } from '../shared/schemas/bitbucket.schemas'

export default class BitbucketWebController extends GenericController {
  private static instance: BitbucketWebController

  public router: Router

  private bitbucketServices: BitbucketServices

  private constructor() {
    super()
    this.testConnection = this.testConnection.bind(this)
    this.getRepositories = this.getRepositories.bind(this)
    this.getPullRequests = this.getPullRequests.bind(this)

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
    this.router.get('/repositories', this.getRepositories)
    this.router.get('/repositories/:slug/pullrequests', this.getPullRequests)
  }

  /** GET /bitbucket/test — verify Bitbucket API connectivity */
  public async testConnection(_req: Request, res: Response): Promise<void> {
    const response = await this.bitbucketServices.testConnection()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.json({ connected: response.data })
  }

  /** GET /bitbucket/repositories — list workspace repositories */
  public async getRepositories(_req: Request, res: Response): Promise<void> {
    const response = await this.bitbucketServices.getRepositories()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.json(response.data)
  }

  /** GET /bitbucket/repositories/:slug/pullrequests — list open PRs for a repo */
  public async getPullRequests(req: Request, res: Response): Promise<void> {
    const { slug } = validateParams(bitbucketRepoParamSchema, req.params)

    const response = await this.bitbucketServices.getPullRequests(slug)

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.json(response.data)
  }
}
