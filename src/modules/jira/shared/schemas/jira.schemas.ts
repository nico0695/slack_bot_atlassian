import { z } from 'zod'

import { JiraIssueType, JiraIssuePriority } from '../constants/jira.constants'

export const jiraIssueKeyParamSchema = z.object({
  issueKey: z.string().min(1),
})

export const createIssueSchema = z.object({
  projectKey: z.string().min(1),
  summary: z.string().min(5).max(255),
  description: z.string().optional(),
  issueType: z.nativeEnum(JiraIssueType).default(JiraIssueType.TASK),
  priority: z.nativeEnum(JiraIssuePriority).optional(),
  assignee: z.string().email().optional(),
  labels: z.array(z.string()).optional(),
})

export const jiraSearchSchema = z.object({
  jql: z.string().min(1),
  maxResults: z.coerce.number().int().positive().max(50).optional().default(10),
})
