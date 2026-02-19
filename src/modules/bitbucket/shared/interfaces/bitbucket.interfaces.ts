export interface IBitbucketPR {
  id: number
  title: string
  description?: string
  status: string
  author: string
  sourceBranch: string
  targetBranch: string
  repoSlug: string
  created?: string
  updated?: string
  reviewers?: string[]
}

export interface IBitbucketBranch {
  name: string
  target: string
}

export interface IBitbucketCommit {
  hash: string
  message: string
  author: string
  date: string
}

export interface IBitbucketRepository {
  slug: string
  fullName: string
  description?: string
  language?: string
}

export interface IBitbucketConnectionConfig {
  workspace: string
  username: string
  appPassword: string
}
