/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express'

import GenericController from '../../../shared/modules/genericController'
import BadRequestError from '../../../shared/utils/errors/BadRequestError'
import { validateParams, validateQuery } from '../../../shared/utils/validation'

import JiraServices from '../services/jira.services'

import { HttpAuth, Permission } from '../../../shared/middleware/auth'
import { Profiles } from '../../../shared/constants/auth.constants'
import { issueKeyParamSchema, searchJiraIssuesSchema } from '../shared/schemas/jira.schemas'

export default class JiraWebController extends GenericController {
  private static instance: JiraWebController

  public router: Router

  private jiraServices: JiraServices

  private constructor() {
    super()
    this.testConnection = this.testConnection.bind(this)
    this.getProject = this.getProject.bind(this)
    this.getIssue = this.getIssue.bind(this)
    this.searchIssues = this.searchIssues.bind(this)
    this.getAssignedToMe = this.getAssignedToMe.bind(this)
    this.getActiveSprint = this.getActiveSprint.bind(this)
    this.getBacklog = this.getBacklog.bind(this)

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
    this.router.get('/issues/assigned-to-me', this.getAssignedToMe)
    this.router.get('/issues/search', this.searchIssues)
    this.router.get('/issues/:issueKey', this.getIssue)
    this.router.get('/sprints/active', this.getActiveSprint)
    this.router.get('/backlog', this.getBacklog)
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

  /**
   * Get a specific issue by key
   * GET /jira/issues/:issueKey
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async getIssue(req: any, res: any): Promise<void> {
    const { issueKey } = validateParams(issueKeyParamSchema, req.params)

    const response = await this.jiraServices.getIssue(issueKey)

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * Search issues with JQL
   * GET /jira/issues/search?jql=...&maxResults=50&startAt=0
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async searchIssues(req: any, res: any): Promise<void> {
    const { jql, maxResults, startAt } = validateQuery(searchJiraIssuesSchema, req.query)

    const response = await this.jiraServices.searchIssues(jql, maxResults, startAt)

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * Get issues assigned to the configured Jira user
   * GET /jira/issues/assigned-to-me
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async getAssignedToMe(req: any, res: any): Promise<void> {
    const response = await this.jiraServices.getAssignedToMe()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * Get active sprint issues
   * GET /jira/sprints/active
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async getActiveSprint(req: any, res: any): Promise<void> {
    const response = await this.jiraServices.getActiveSprint()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }

  /**
   * Get backlog issues
   * GET /jira/backlog
   */
  @HttpAuth
  @Permission([Profiles.USER, Profiles.USER_PREMIUM, Profiles.ADMIN])
  public async getBacklog(req: any, res: any): Promise<void> {
    const response = await this.jiraServices.getBacklog()

    if (response.error) {
      throw new BadRequestError({ message: response.error })
    }

    res.send(response.data)
  }
}
