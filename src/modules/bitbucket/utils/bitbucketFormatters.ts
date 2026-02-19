import { IBitbucketPR } from '../shared/interfaces/bitbucket.interfaces'

/**
 * Format a Bitbucket pull request for display in Slack messages.
 */
export function formatPRForSlack(pr: IBitbucketPR): string {
  return `*PR #${pr.id}:* ${pr.title}\nStatus: ${pr.status} | ${pr.sourceBranch} → ${pr.targetBranch} | Author: ${pr.author}`
}
