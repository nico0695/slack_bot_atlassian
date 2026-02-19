/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'

import GenericController from '../../../shared/modules/genericController'
import BadRequestError from '../../../shared/utils/errors/BadRequestError'

import JiraServices from '../services/jira.services'

import { HttpAuth, Permission } from '../../../shared/middleware/auth'
import { Profiles } from '../../../shared/constants/auth.constants'

export default class JiraWebController extends GenericController {
  private static instance: JiraWebController

  public router: Router

  private jiraServices: JiraServices

  private constructor() {
    super()
    this.testConnection = this.testConnection.bind(this)
    this.getProject = this.getProject.bind(this)

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

  /** Jira Routes */

  protected registerRoutes(): void {
    this.router.get('/test', this.testConnection)
    this.router.get('/project', this.getProject)
  }

  /** Jira Controller Methods */

  /**
   * Test Jira API connection
   * GET /jira/test
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async testConnection(req: any, res: any): Promise<void> {
    const response = await this.jiraServices.testConnection()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * Get project information
   * GET /jira/project
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async getProject(req: any, res: any): Promise<void> {
    const response = await this.jiraServices.getProject()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }
}
