import { IJiraIssue } from '../shared/interfaces/jira.interfaces'

/**
 * Format a Jira issue for display in Slack messages.
 */
export function formatIssueForSlack(issue: IJiraIssue): string {
  const priority = issue.priority ? ` | Priority: ${issue.priority}` : ''
  const assignee = issue.assignee ? ` | Assignee: ${issue.assignee}` : ''
  return `*[${issue.key}]* ${issue.summary}\nStatus: ${issue.status}${priority}${assignee}`
}
