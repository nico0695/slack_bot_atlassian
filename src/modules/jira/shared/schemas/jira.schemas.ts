import { z } from 'zod'
import { JiraIssueType, JiraPriority } from '../constants/jira.constants'

// Schema for creating a Jira issue
export const createJiraIssueSchema = z.object({
  projectKey: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Project key must be uppercase letters'),
  issueType: z.nativeEnum(JiraIssueType),
  summary: z
    .string()
    .min(5, 'Summary must be at least 5 characters')
    .max(255, 'Summary must be less than 255 characters'),
  description: z.string().max(32000).optional(),
  priority: z.nativeEnum(JiraPriority).optional().default(JiraPriority.MEDIUM),
  assignee: z.string().email().optional(),
  labels: z.array(z.string().max(255)).max(20).optional(),
  components: z.array(z.string()).max(10).optional(),
})

// Schema for searching issues with JQL
export const searchJiraIssuesSchema = z.object({
  jql: z.string().min(1),
  maxResults: z.coerce.number().int().positive().max(100).optional().default(50),
  startAt: z.coerce.number().int().min(0).optional().default(0),
})
