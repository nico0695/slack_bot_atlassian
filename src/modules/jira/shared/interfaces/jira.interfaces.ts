import { JiraIssueType, JiraPriority } from '../constants/jira.constants'

// Jira configuration interface
export interface IJiraConfig {
  host: string
  email: string
  apiToken: string
  projectKey?: string
}

// Jira Issue interface (simplified)
export interface IJiraIssue {
  key: string
  id: string
  summary: string
  description?: string
  status: string
  issueType: string
  priority?: string
  assignee?: string
  reporter?: string
  created: Date
  updated: Date
  labels?: string[]
  components?: string[]
  url?: string
}

// Jira Project interface
export interface IJiraProject {
  key: string
  id: string
  name: string
  description?: string
  lead?: string
  projectTypeKey?: string
}

// Create issue DTO
export interface ICreateJiraIssue {
  projectKey: string
  issueType: JiraIssueType
  summary: string
  description?: string
  priority?: JiraPriority
  assignee?: string
  labels?: string[]
  components?: string[]
}

// Connection test result
export interface IJiraConnectionTest {
  success: boolean
  message: string
  serverInfo?: {
    version: string
    baseUrl: string
  }
}

// Search result wrapper
export interface IJiraSearchResult {
  issues: IJiraIssue[]
  total: number
  maxResults: number
  startAt: number
}
