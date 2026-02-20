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

const bitbucketApiRepositoryInstance = {
  testConnection: testConnectionMock,
  listRepositories: listRepositoriesMock,
  listPullRequests: listPullRequestsMock,
  createPullRequest: createPullRequestMock,
  getDefaultRepo: getDefaultRepoMock,
  getWorkspace: getWorkspaceMock,
}

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
})
