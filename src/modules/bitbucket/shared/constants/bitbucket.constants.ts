// Bitbucket API constants

// Redis cache key prefix
export const BITBUCKET_CACHE_PREFIX = 'bb'

// Cache TTL in seconds
export const BITBUCKET_CACHE_TTL = {
  PR: 180, // 3 minutes
  BRANCHES: 900, // 15 minutes
  REPOSITORIES: 600, // 10 minutes
  COMMITS: 300, // 5 minutes
}

// Pull request states
export enum PRState {
  OPEN = 'OPEN',
  MERGED = 'MERGED',
  DECLINED = 'DECLINED',
  SUPERSEDED = 'SUPERSEDED',
}

// Merge strategies
export enum MergeStrategy {
  MERGE_COMMIT = 'merge_commit',
  SQUASH = 'squash',
  FAST_FORWARD = 'fast_forward',
}
