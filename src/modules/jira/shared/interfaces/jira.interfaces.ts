export interface IJiraIssue {
  id: string
  key: string
  summary: string
  description?: string
  status: string
  issueType: string
  priority?: string
  assignee?: string
  reporter?: string
  projectKey: string
  labels?: string[]
  created?: string
  updated?: string
}

export interface IJiraProject {
  id: string
  key: string
  name: string
}

export interface IJiraSprint {
  id: number
  name: string
  state: string
  startDate?: string
  endDate?: string
}

export interface IJiraConnectionConfig {
  host: string
  email: string
  apiToken: string
}
