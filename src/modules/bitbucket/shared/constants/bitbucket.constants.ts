export enum BitbucketPRStatus {
  OPEN = 'OPEN',
  MERGED = 'MERGED',
  DECLINED = 'DECLINED',
  SUPERSEDED = 'SUPERSEDED',
}

export const BITBUCKET_CACHE_TTL = {
  PR: 180, // 3 min
  BRANCHES: 900, // 15 min
  COMMITS: 300, // 5 min
}

export const BITBUCKET_API_BASE = 'https://api.bitbucket.org/2.0'
