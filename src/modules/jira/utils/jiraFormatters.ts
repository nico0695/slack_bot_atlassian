import { IJiraIssue } from '../shared/interfaces/jira.interfaces'

/**
 * Format a Jira issue for Slack messages
 */
export function formatIssueForSlack(issue: IJiraIssue): string {
  const lines: string[] = [
    `*${issue.key}* — ${issue.summary}`,
    `Status: ${issue.status} | Type: ${issue.issueType}`,
  ]

  if (issue.priority) {
    lines.push(`Priority: ${issue.priority}`)
  }

  if (issue.assignee) {
    lines.push(`Assignee: ${issue.assignee}`)
  }

  if (issue.labels && issue.labels.length > 0) {
    lines.push(`Labels: ${issue.labels.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Format multiple issues as a Slack list
 */
export function formatIssueListForSlack(issues: IJiraIssue[]): string {
  if (issues.length === 0) {
    return 'No issues found.'
  }

  const lines = issues.map(
    (issue) => `• *${issue.key}* — ${issue.summary} [${issue.status}]`
  )

  return lines.join('\n')
}
