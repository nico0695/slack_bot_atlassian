import BitbucketServices from '../bitbucket.services'

jest.mock('../../../../config/logger', () => ({
  createModuleLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  }),
}))

const testConnectionMock = jest.fn()
const listRepositoriesMock = jest.fn()
const listPullRequestsMock = jest.fn()
const createPullRequestMock = jest.fn()
const getDefaultRepoMock = jest.fn()
const getWorkspaceMock = jest.fn()
const getPRMock = jest.fn()
const getBranchesMock = jest.fn()
const getCommitsMock = jest.fn()
const getCommitMock = jest.fn()

const bitbucketApiRepositoryInstance = {
  testConnection: testConnectionMock,
  listRepositories: listRepositoriesMock,
  listPullRequests: listPullRequestsMock,
  createPullRequest: createPullRequestMock,
  getDefaultRepo: getDefaultRepoMock,
  getWorkspace: getWorkspaceMock,
  getPR: getPRMock,
  getBranches: getBranchesMock,
  getCommits: getCommitsMock,
  getCommit: getCommitMock,
}

const getBranchesRedisMock = jest.fn()
const setBranchesRedisMock = jest.fn()
const getPRRedisMock = jest.fn()
const setPRRedisMock = jest.fn()

jest.mock('../../repositories/redis/bitbucketCache.redis', () => ({
  BitbucketCacheRedis: {
    getInstance: () => ({
      getBranches: getBranchesRedisMock,
      setBranches: setBranchesRedisMock,
      getPR: getPRRedisMock,
      setPR: setPRRedisMock,
    }),
  },
}))

jest.mock('../../repositories/bitbucketApi.repository', () => ({
  __esModule: true,
  default: {
    getInstance: () => bitbucketApiRepositoryInstance,
  },
}))

describe('BitbucketServices', () => {
  const services = BitbucketServices.getInstance()

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: cache miss
    getBranchesRedisMock.mockResolvedValue(null)
    setBranchesRedisMock.mockResolvedValue(undefined)
    getPRRedisMock.mockResolvedValue(null)
    setPRRedisMock.mockResolvedValue(undefined)
  })

  describe('testConnection', () => {
    it('should return success when connection is successful', async () => {
      const mockResult = {
        success: true,
        message: 'Successfully connected to Bitbucket',
        workspace: 'my-workspace',
      }
      testConnectionMock.mockResolvedValue(mockResult)

      const result = await services.testConnection()

      expect(testConnectionMock).toHaveBeenCalled()
      expect(result.data).toEqual(mockResult)
      expect(result.error).toBeUndefined()
    })

    it('should return data when connection fails', async () => {
      const mockResult = {
        success: false,
        message: 'Authentication failed',
      }
      testConnectionMock.mockResolvedValue(mockResult)

      const result = await services.testConnection()

      expect(result.data).toEqual(mockResult)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      testConnectionMock.mockRejectedValue(new Error('Network error'))

      const result = await services.testConnection()

      expect(result.error).toBe('Network error')
      expect(result.data).toBeUndefined()
    })
  })

  describe('listRepositories', () => {
    it('should return list of repositories', async () => {
      const mockRepos = [
        { slug: 'repo-1', name: 'Repo One', isPrivate: true },
        { slug: 'repo-2', name: 'Repo Two', isPrivate: false },
      ]
      listRepositoriesMock.mockResolvedValue(mockRepos)

      const result = await services.listRepositories()

      expect(listRepositoriesMock).toHaveBeenCalled()
      expect(result.data).toEqual(mockRepos)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      listRepositoriesMock.mockRejectedValue(new Error('Workspace not found'))

      const result = await services.listRepositories()

      expect(result.error).toBe('Workspace not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('listPullRequests', () => {
    it('should return list of pull requests', async () => {
      const mockPRs = [
        {
          id: 1,
          title: 'Test PR',
          state: 'OPEN',
          sourceBranch: 'feature/test',
          destinationBranch: 'main',
          createdOn: '2024-01-01T00:00:00Z',
          updatedOn: '2024-01-01T00:00:00Z',
        },
      ]
      listPullRequestsMock.mockResolvedValue(mockPRs)

      const result = await services.listPullRequests('my-repo')

      expect(listPullRequestsMock).toHaveBeenCalledWith('my-repo', 'OPEN')
      expect(result.data).toEqual(mockPRs)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      listPullRequestsMock.mockRejectedValue(new Error('Repo not found'))

      const result = await services.listPullRequests('invalid-repo')

      expect(result.error).toBe('Repo not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('createPullRequest', () => {
    it('should create a PR and return it', async () => {
      const prData = {
        repoSlug: 'my-repo',
        title: 'Add feature X',
        sourceBranch: 'feature/x',
        destinationBranch: 'main',
      }
      const mockPR = {
        id: 42,
        title: 'Add feature X',
        state: 'OPEN',
        sourceBranch: 'feature/x',
        destinationBranch: 'main',
        createdOn: '2024-01-01T00:00:00Z',
        updatedOn: '2024-01-01T00:00:00Z',
      }
      createPullRequestMock.mockResolvedValue(mockPR)

      const result = await services.createPullRequest(prData)

      expect(createPullRequestMock).toHaveBeenCalledWith(prData)
      expect(result.data).toEqual(mockPR)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      createPullRequestMock.mockRejectedValue(new Error('Branch not found'))

      const result = await services.createPullRequest({
        repoSlug: 'repo',
        title: 'PR',
        sourceBranch: 'invalid',
        destinationBranch: 'main',
      })

      expect(result.error).toBe('Branch not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getWorkspace', () => {
    it('should return workspace from repository', () => {
      getWorkspaceMock.mockReturnValue('my-workspace')

      const result = services.getWorkspace()

      expect(result).toBe('my-workspace')
    })

    it('should return undefined if not configured', () => {
      getWorkspaceMock.mockReturnValue(undefined)

      const result = services.getWorkspace()

      expect(result).toBeUndefined()
    })
  })

  describe('getPR', () => {
    const mockPR = {
      id: 1,
      title: 'Test PR',
      state: 'OPEN',
      sourceBranch: 'feature/test',
      destinationBranch: 'main',
      createdOn: '2024-01-01T00:00:00Z',
      updatedOn: '2024-01-01T00:00:00Z',
    }

    it('should return PR from API on cache miss', async () => {
      getPRMock.mockResolvedValue(mockPR)

      const result = await services.getPR('my-repo', 1)

      expect(getPRRedisMock).toHaveBeenCalledWith('my-repo', 1)
      expect(getPRMock).toHaveBeenCalledWith('my-repo', 1)
      expect(setPRRedisMock).toHaveBeenCalledWith('my-repo', 1, mockPR)
      expect(result.data).toEqual(mockPR)
      expect(result.error).toBeUndefined()
    })

    it('should return PR from cache on cache hit', async () => {
      getPRRedisMock.mockResolvedValue(mockPR)

      const result = await services.getPR('my-repo', 1)

      expect(getPRMock).not.toHaveBeenCalled()
      expect(result.data).toEqual(mockPR)
    })

    it('should handle repository errors', async () => {
      getPRMock.mockRejectedValue(new Error('PR not found'))

      const result = await services.getPR('my-repo', 999)

      expect(result.error).toBe('PR not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getBranches', () => {
    const mockBranches = [
      { name: 'main', isDefault: true, latestCommit: 'abc12345' },
      { name: 'develop', isDefault: false, latestCommit: 'def67890' },
    ]

    it('should return branches from API on cache miss', async () => {
      getBranchesMock.mockResolvedValue(mockBranches)

      const result = await services.getBranches('my-repo')

      expect(getBranchesRedisMock).toHaveBeenCalledWith('my-repo')
      expect(getBranchesMock).toHaveBeenCalledWith('my-repo')
      expect(setBranchesRedisMock).toHaveBeenCalledWith('my-repo', mockBranches)
      expect(result.data).toEqual(mockBranches)
      expect(result.error).toBeUndefined()
    })

    it('should return branches from cache on cache hit', async () => {
      getBranchesRedisMock.mockResolvedValue(mockBranches)

      const result = await services.getBranches('my-repo')

      expect(getBranchesMock).not.toHaveBeenCalled()
      expect(result.data).toEqual(mockBranches)
    })

    it('should handle repository errors', async () => {
      getBranchesMock.mockRejectedValue(new Error('Repo not found'))

      const result = await services.getBranches('invalid-repo')

      expect(result.error).toBe('Repo not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getCommits', () => {
    const mockCommits = [
      { hash: 'abc12345', message: 'feat: add new feature', author: 'John Doe', date: '2024-01-01T00:00:00Z' },
    ]

    it('should return commits', async () => {
      getCommitsMock.mockResolvedValue(mockCommits)

      const result = await services.getCommits('my-repo', 'main', 30)

      expect(getCommitsMock).toHaveBeenCalledWith('my-repo', 'main', 30)
      expect(result.data).toEqual(mockCommits)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      getCommitsMock.mockRejectedValue(new Error('Branch not found'))

      const result = await services.getCommits('my-repo', 'invalid-branch')

      expect(result.error).toBe('Branch not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getCommit', () => {
    const mockCommitDetail = {
      hash: 'abc1234567890',
      message: 'feat: add new feature',
      author: 'John Doe',
      date: '2024-01-01T00:00:00Z',
      url: 'https://bitbucket.org/workspace/my-repo/commits/abc1234567890',
      parents: ['def0987654321'],
    }

    it('should return commit detail', async () => {
      getCommitMock.mockResolvedValue(mockCommitDetail)

      const result = await services.getCommit('my-repo', 'abc1234567890')

      expect(getCommitMock).toHaveBeenCalledWith('my-repo', 'abc1234567890')
      expect(result.data).toEqual(mockCommitDetail)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      getCommitMock.mockRejectedValue(new Error('Commit not found'))

      const result = await services.getCommit('my-repo', 'invalid-hash')

      expect(result.error).toBe('Commit not found')
      expect(result.data).toBeUndefined()
    })
  })
})
