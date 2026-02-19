import { z } from 'zod'

export const bitbucketRepoParamSchema = z.object({
  slug: z.string().min(1),
})

export const bitbucketPRParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
