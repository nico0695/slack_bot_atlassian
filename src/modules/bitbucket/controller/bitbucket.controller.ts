import { createModuleLogger } from '../../../config/logger'
import BitbucketServices from '../services/bitbucket.services'
import { PRState } from '../shared/constants/bitbucket.constants'

const log = createModuleLogger('bitbucket.controller')

export default class BitbucketController {
  private static instance: BitbucketController

  private bitbucketServices: BitbucketServices

  private constructor() {
    this.bitbucketServices = BitbucketServices.getInstance()

    this.testConnection = this.testConnection.bind(this)
    this.listRepositories = this.listRepositories.bind(this)
    this.listPullRequests = this.listPullRequests.bind(this)
    this.getBranches = this.getBranches.bind(this)
    this.getCommits = this.getCommits.bind(this)
  }

  static getInstance(): BitbucketController {
    if (this.instance) {
      return this.instance
    }

    this.instance = new BitbucketController()
    return this.instance
  }

  /**
   * Slack command: .bb test
   * Test Bitbucket API connectivity
   */
  public async testConnection(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.bitbucketServices.testConnection()

      if (response.error) {
        say(`Error connecting to Bitbucket: ${response.error}`)
        return
      }

      const info = response.data
      if (info?.success) {
        say(`✅ Bitbucket connected — workspace: ${info.workspace ?? this.bitbucketServices.getWorkspace() ?? 'unknown'}`)
      } else {
        say(`⚠️ Bitbucket connection failed: ${info?.message ?? 'unknown error'}`)
      }
    } catch (error) {
      log.error({ err: error }, 'testConnection Slack command failed')
      say('Ups! Error testing Bitbucket connection.')
    }
  }

  /**
   * Slack command: .bb repos
   * List repositories in the workspace
   */
  public async listRepositories(data: any): Promise<void> {
    const { say } = data

    try {
      const response = await this.bitbucketServices.listRepositories()

      if (response.error) {
        say(`Error fetching repositories: ${response.error}`)
        return
      }

      const repos = response.data ?? []

      if (repos.length === 0) {
        say('No repositories found in workspace.')
        return
      }

      const lines = repos.map((r) => `• *${r.name}* (\`${r.slug}\`)${r.language ? ` — ${r.language}` : ''}`)
      say(`*Repositories (${repos.length}):*\n${lines.join('\n')}`)
    } catch (error) {
      log.error({ err: error }, 'listRepositories Slack command failed')
      say('Ups! Error listing repositories.')
    }
  }

  /**
   * Slack command: .bb prs <repo>
   * List open pull requests for a repository
   */
  public async listPullRequests(data: any): Promise<void> {
    const { payload, say } = data

    try {
      const text: string = payload.text.replace(/^\.bb\s+prs?\s*/i, '').trim()

      if (!text) {
        say('Usage: `.bb prs <repo-slug>`')
        return
      }

      const response = await this.bitbucketServices.listPullRequests(text, PRState.OPEN)

      if (response.error) {
        say(`Error fetching PRs: ${response.error}`)
        return
      }

      const prs = response.data ?? []

      if (prs.length === 0) {
        say(`No open PRs found for \`${text}\`.`)
        return
      }

      const lines = prs.map(
        (pr) => `• *#${pr.id}* — ${pr.title} (${pr.sourceBranch} → ${pr.destinationBranch})`
      )
      say(`*Open PRs for \`${text}\` (${prs.length}):*\n${lines.join('\n')}`)
    } catch (error) {
      log.error({ err: error }, 'listPullRequests Slack command failed')
      say('Ups! Error listing pull requests.')
    }
  }

  /**
   * Slack command: .bb branches <repo>
   * List branches for a repository
   */
  public async getBranches(data: any): Promise<void> {
    const { payload, say } = data

    try {
      const repoSlug: string = payload.text.replace(/^\.bb\s+branches?\s*/i, '').trim()

      if (!repoSlug) {
        say('Usage: `.bb branches <repo-slug>`')
        return
      }

      const response = await this.bitbucketServices.getBranches(repoSlug)

      if (response.error) {
        say(`Error fetching branches: ${response.error}`)
        return
      }

      const branches = response.data ?? []

      if (branches.length === 0) {
        say(`No branches found for \`${repoSlug}\`.`)
        return
      }

      const lines = branches.map(
        (b) => `• \`${b.name}\`${b.isDefault ? ' _(default)_' : ''}${b.latestCommit ? ` — ${b.latestCommit}` : ''}`
      )
      say(`*Branches for \`${repoSlug}\` (${branches.length}):*\n${lines.join('\n')}`)
    } catch (error) {
      log.error({ err: error }, 'getBranches Slack command failed')
      say('Ups! Error listing branches.')
    }
  }

  /**
   * Slack command: .bb commits <repo>
   * List recent commits for a repository
   */
  public async getCommits(data: any): Promise<void> {
    const { payload, say } = data

    try {
      const text: string = payload.text.replace(/^\.bb\s+commits?\s*/i, '').trim()
      const [repoSlug, branch] = text.split(/\s+/)

      if (!repoSlug) {
        say('Usage: `.bb commits <repo-slug> [branch]`')
        return
      }

      const response = await this.bitbucketServices.getCommits(repoSlug, branch)

      if (response.error) {
        say(`Error fetching commits: ${response.error}`)
        return
      }

      const commits = response.data ?? []

      if (commits.length === 0) {
        say(`No commits found for \`${repoSlug}\`.`)
        return
      }

      const lines = commits
        .slice(0, 10)
        .map((c) => `• \`${c.hash}\` ${c.message} — _${c.author}_`)
      say(`*Recent commits for \`${repoSlug}\`${branch ? ` (${branch})` : ''} :*\n${lines.join('\n')}`)
    } catch (error) {
      log.error({ err: error }, 'getCommits Slack command failed')
      say('Ups! Error listing commits.')
    }
  }
}
