import { PRState, MergeStrategy } from '../constants/bitbucket.constants'

// Bitbucket configuration
export interface IBitbucketConfig {
  workspace: string
  username: string
  appPassword: string
  defaultRepo?: string
}

// Connection test result
export interface IBitbucketConnectionTest {
  success: boolean
  message: string
  workspace?: string
}

// Repository summary
export interface IBitbucketRepository {
  slug: string
  name: string
  description?: string
  isPrivate: boolean
  mainBranch?: string
  language?: string
  updatedOn?: string
}

// Pull request
export interface IBitbucketPR {
  id: number
  title: string
  description?: string
  state: PRState
  author?: string
  sourceBranch: string
  destinationBranch: string
  createdOn: string
  updatedOn: string
  commentCount?: number
}

// Create PR input
export interface ICreateBitbucketPR {
  repoSlug: string
  title: string
  description?: string
  sourceBranch: string
  destinationBranch: string
  closeSourceBranch?: boolean
  reviewers?: string[]
}

// Merge PR options
export interface IMergePROptions {
  strategy?: MergeStrategy
  message?: string
  closeSourceBranch?: boolean
}

// Branch
export interface IBitbucketBranch {
  name: string
  isDefault: boolean
  latestCommit?: string
}

// Commit
export interface IBitbucketCommit {
  hash: string
  message: string
  author: string
  date: string
}
