import { Router, Request, Response } from 'express'

import GenericController from '../../../shared/modules/genericController'
import BadRequestError from '../../../shared/utils/errors/BadRequestError'
import { validateParams } from '../../../shared/utils/validation'

import JiraServices from '../services/jira.services'
import { jiraIssueKeyParamSchema } from '../shared/schemas/jira.schemas'

export default class JiraWebController extends GenericController {
  private static instance: JiraWebController

  public router: Router

  private jiraServices: JiraServices

  private constructor() {
    super()
    this.testConnection = this.testConnection.bind(this)
    this.getProjects = this.getProjects.bind(this)
    this.getIssue = this.getIssue.bind(this)

    this.jiraServices = JiraServices.getInstance()

    this.router = Router()
    this.registerRoutes()
  }

  static getInstance(): JiraWebController {
    if (this.instance) {
      return this.instance
    }

    this.instance = new JiraWebController()
    return this.instance
  }

  protected registerRoutes(): void {
    this.router.get('/test', this.testConnection)
    this.router.get('/projects', this.getProjects)
    this.router.get('/issues/:issueKey', this.getIssue)
  }

  /** GET /jira/test — verify Jira API connectivity */
  public async testConnection(_req: Request, res: Response): Promise<void> {
    const response = await this.jiraServices.testConnection()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.json({ connected: response.data })
  }

  /** GET /jira/projects — list accessible Jira projects */
  public async getProjects(_req: Request, res: Response): Promise<void> {
    const response = await this.jiraServices.getProjects()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.json(response.data)
  }

  /** GET /jira/issues/:id — fetch a Jira issue by key (e.g. PROJ-123) */
  public async getIssue(req: Request, res: Response): Promise<void> {
    const { issueKey } = validateParams(jiraIssueKeyParamSchema, req.params)

    const response = await this.jiraServices.getIssue(issueKey)

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.json(response.data)
  }
}
