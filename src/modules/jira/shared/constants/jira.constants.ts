export enum JiraIssueType {
  TASK = 'Task',
  BUG = 'Bug',
  STORY = 'Story',
  EPIC = 'Epic',
}

export enum JiraIssuePriority {
  LOWEST = 'Lowest',
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  HIGHEST = 'Highest',
}

export const JIRA_CACHE_TTL = {
  ISSUE: 300, // 5 min
  SPRINT: 600, // 10 min
  USER_ISSUES: 120, // 2 min
  PROJECTS: 3600, // 1 hour
}
