import { z } from 'zod'
import { PRState, MergeStrategy } from '../constants/bitbucket.constants'

// Schema for listing pull requests
export const listPRsSchema = z.object({
  repoSlug: z.string().min(1),
  state: z.nativeEnum(PRState).optional().default(PRState.OPEN),
})

// Schema for creating a pull request
export const createPRSchema = z.object({
  repoSlug: z.string().min(1),
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  sourceBranch: z.string().min(1),
  destinationBranch: z.string().min(1),
  closeSourceBranch: z.boolean().optional().default(true),
  reviewers: z.array(z.string()).optional(),
})

// Schema for merging a pull request
export const mergePRSchema = z.object({
  strategy: z.nativeEnum(MergeStrategy).optional().default(MergeStrategy.MERGE_COMMIT),
  message: z.string().optional(),
  closeSourceBranch: z.boolean().optional().default(true),
})

// Schema for repo slug + PR id route params
export const prParamsSchema = z.object({
  slug: z.string().min(1),
  id: z.coerce.number().int().positive(),
})

// Schema for repo slug route param
export const repoSlugParamSchema = z.object({
  slug: z.string().min(1),
})

// Schema for repo slug + commit hash route params
export const commitParamsSchema = z.object({
  slug: z.string().min(1),
  hash: z.string().min(1),
})

// Schema for commits query
export const getCommitsQuerySchema = z.object({
  branch: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(30),
})
