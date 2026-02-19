// Jira API constants

export const JIRA_API_VERSION = '3'

// Redis cache key prefixes
export const JIRA_CACHE_PREFIX = 'jira'

// Cache TTL in seconds
export const JIRA_CACHE_TTL = {
  ISSUE: 300, // 5 minutes
  SPRINT: 600, // 10 minutes
  PROJECT: 900, // 15 minutes
  USER_ISSUES: 120, // 2 minutes
}

// Jira issue types
export enum JiraIssueType {
  BUG = 'Bug',
  TASK = 'Task',
  STORY = 'Story',
  EPIC = 'Epic',
  SUBTASK = 'Subtask',
}

// Jira priority levels
export enum JiraPriority {
  LOWEST = 'Lowest',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  HIGHEST = 'Highest',
}

// Jira issue status (common values, may vary by project)
export enum JiraStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
  TO_DO = 'To Do',
  IN_REVIEW = 'In Review',
  BLOCKED = 'Blocked',
}
