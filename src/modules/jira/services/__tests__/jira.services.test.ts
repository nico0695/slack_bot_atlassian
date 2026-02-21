import JiraServices from '../jira.services'

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
const getProjectMock = jest.fn()
const getConfiguredProjectKeyMock = jest.fn()
const getConfiguredEmailMock = jest.fn()
const getIssueMock = jest.fn()
const searchIssuesMock = jest.fn()
const getAssignedToMeMock = jest.fn()
const getActiveSprintMock = jest.fn()
const getBacklogMock = jest.fn()

const jiraApiRepositoryInstance = {
  testConnection: testConnectionMock,
  getProject: getProjectMock,
  getConfiguredProjectKey: getConfiguredProjectKeyMock,
  getConfiguredEmail: getConfiguredEmailMock,
  getIssue: getIssueMock,
  searchIssues: searchIssuesMock,
  getAssignedToMe: getAssignedToMeMock,
  getActiveSprint: getActiveSprintMock,
  getBacklog: getBacklogMock,
}

// Mock Redis cache to return null (cache miss) by default
const getIssueRedisMock = jest.fn()
const setIssueRedisMock = jest.fn()
const getActiveSprintRedisMock = jest.fn()
const setActiveSprintRedisMock = jest.fn()
const getUserIssuesRedisMock = jest.fn()
const setUserIssuesRedisMock = jest.fn()

jest.mock('../../repositories/redis/jiraCache.redis', () => ({
  JiraCacheRedis: {
    getInstance: () => ({
      getIssue: getIssueRedisMock,
      setIssue: setIssueRedisMock,
      getActiveSprint: getActiveSprintRedisMock,
      setActiveSprint: setActiveSprintRedisMock,
      getUserIssues: getUserIssuesRedisMock,
      setUserIssues: setUserIssuesRedisMock,
    }),
  },
}))

jest.mock('../../repositories/jiraApi.repository', () => ({
  __esModule: true,
  default: {
    getInstance: () => jiraApiRepositoryInstance,
  },
}))

describe('JiraServices', () => {
  const services = JiraServices.getInstance()

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: cache miss
    getIssueRedisMock.mockResolvedValue(null)
    getActiveSprintRedisMock.mockResolvedValue(null)
    getUserIssuesRedisMock.mockResolvedValue(null)
    setIssueRedisMock.mockResolvedValue(undefined)
    setActiveSprintRedisMock.mockResolvedValue(undefined)
    setUserIssuesRedisMock.mockResolvedValue(undefined)
  })

  describe('testConnection', () => {
    it('should return success when connection is successful', async () => {
      const mockResult = {
        success: true,
        message: 'Successfully connected to Jira',
        serverInfo: {
          version: '9.0.0',
          baseUrl: 'https://test.atlassian.net',
        },
      }
      testConnectionMock.mockResolvedValue(mockResult)

      const result = await services.testConnection()

      expect(testConnectionMock).toHaveBeenCalled()
      expect(result.data).toEqual(mockResult)
      expect(result.error).toBeUndefined()
    })

    it('should return error when connection fails', async () => {
      const mockResult = {
        success: false,
        message: 'Authentication failed',
      }
      testConnectionMock.mockResolvedValue(mockResult)

      const result = await services.testConnection()

      expect(testConnectionMock).toHaveBeenCalled()
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

  describe('getProject', () => {
    it('should return project information', async () => {
      const mockProject = {
        key: 'PROJ',
        id: '10000',
        name: 'Test Project',
        description: 'Test Description',
        lead: 'John Doe',
      }
      getProjectMock.mockResolvedValue(mockProject)

      const result = await services.getProject('PROJ')

      expect(getProjectMock).toHaveBeenCalledWith('PROJ')
      expect(result.data).toEqual(mockProject)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      getProjectMock.mockRejectedValue(new Error('Project not found'))

      const result = await services.getProject('INVALID')

      expect(result.error).toBe('Project not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getConfiguredProjectKey', () => {
    it('should return configured project key', () => {
      getConfiguredProjectKeyMock.mockReturnValue('PROJ')

      const result = services.getConfiguredProjectKey()

      expect(result).toBe('PROJ')
    })

    it('should return undefined if not configured', () => {
      getConfiguredProjectKeyMock.mockReturnValue(undefined)

      const result = services.getConfiguredProjectKey()

      expect(result).toBeUndefined()
    })
  })

  describe('getIssue', () => {
    const mockIssue = {
      key: 'PROJ-123',
      id: '10001',
      summary: 'Test issue',
      status: 'In Progress',
      issueType: 'Task',
      created: new Date(),
      updated: new Date(),
    }

    it('should return issue from API on cache miss', async () => {
      getIssueMock.mockResolvedValue(mockIssue)

      const result = await services.getIssue('PROJ-123')

      expect(getIssueRedisMock).toHaveBeenCalledWith('PROJ-123')
      expect(getIssueMock).toHaveBeenCalledWith('PROJ-123')
      expect(setIssueRedisMock).toHaveBeenCalledWith('PROJ-123', mockIssue)
      expect(result.data).toEqual(mockIssue)
      expect(result.error).toBeUndefined()
    })

    it('should return issue from cache on cache hit', async () => {
      getIssueRedisMock.mockResolvedValue(mockIssue)

      const result = await services.getIssue('PROJ-123')

      expect(getIssueMock).not.toHaveBeenCalled()
      expect(result.data).toEqual(mockIssue)
    })

    it('should handle repository errors', async () => {
      getIssueMock.mockRejectedValue(new Error('Issue not found'))

      const result = await services.getIssue('PROJ-999')

      expect(result.error).toBe('Issue not found')
      expect(result.data).toBeUndefined()
    })
  })

  describe('searchIssues', () => {
    const mockResult = {
      issues: [{ key: 'PROJ-1', summary: 'Issue 1', status: 'Open', issueType: 'Task', id: '1', created: new Date(), updated: new Date() }],
      total: 1,
      maxResults: 50,
      startAt: 0,
    }

    it('should return search results', async () => {
      searchIssuesMock.mockResolvedValue(mockResult)

      const result = await services.searchIssues('project = PROJ', 50, 0)

      expect(searchIssuesMock).toHaveBeenCalledWith('project = PROJ', 50, 0)
      expect(result.data).toEqual(mockResult)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      searchIssuesMock.mockRejectedValue(new Error('Invalid JQL'))

      const result = await services.searchIssues('invalid JQL !!!', 50, 0)

      expect(result.error).toBe('Invalid JQL')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getAssignedToMe', () => {
    const mockResult = {
      issues: [],
      total: 0,
      maxResults: 50,
      startAt: 0,
    }

    it('should return assigned issues from API on cache miss', async () => {
      getConfiguredEmailMock.mockReturnValue('user@test.com')
      getAssignedToMeMock.mockResolvedValue(mockResult)

      const result = await services.getAssignedToMe()

      expect(getUserIssuesRedisMock).toHaveBeenCalledWith('user@test.com')
      expect(getAssignedToMeMock).toHaveBeenCalled()
      expect(setUserIssuesRedisMock).toHaveBeenCalledWith('user@test.com', mockResult)
      expect(result.data).toEqual(mockResult)
    })

    it('should return assigned issues from cache on cache hit', async () => {
      getConfiguredEmailMock.mockReturnValue('user@test.com')
      getUserIssuesRedisMock.mockResolvedValue(mockResult)

      const result = await services.getAssignedToMe()

      expect(getAssignedToMeMock).not.toHaveBeenCalled()
      expect(result.data).toEqual(mockResult)
    })

    it('should handle repository errors', async () => {
      getConfiguredEmailMock.mockReturnValue('user@test.com')
      getAssignedToMeMock.mockRejectedValue(new Error('API error'))

      const result = await services.getAssignedToMe()

      expect(result.error).toBe('API error')
    })
  })

  describe('getActiveSprint', () => {
    const mockResult = { issues: [], total: 0, maxResults: 100, startAt: 0 }

    it('should return sprint issues from API on cache miss', async () => {
      getConfiguredProjectKeyMock.mockReturnValue('PROJ')
      getActiveSprintMock.mockResolvedValue(mockResult)

      const result = await services.getActiveSprint()

      expect(getActiveSprintRedisMock).toHaveBeenCalledWith('PROJ')
      expect(getActiveSprintMock).toHaveBeenCalled()
      expect(setActiveSprintRedisMock).toHaveBeenCalledWith('PROJ', mockResult)
      expect(result.data).toEqual(mockResult)
    })

    it('should return sprint issues from cache on cache hit', async () => {
      getConfiguredProjectKeyMock.mockReturnValue('PROJ')
      getActiveSprintRedisMock.mockResolvedValue(mockResult)

      const result = await services.getActiveSprint()

      expect(getActiveSprintMock).not.toHaveBeenCalled()
      expect(result.data).toEqual(mockResult)
    })

    it('should handle repository errors', async () => {
      getConfiguredProjectKeyMock.mockReturnValue('PROJ')
      getActiveSprintMock.mockRejectedValue(new Error('Sprint not found'))

      const result = await services.getActiveSprint()

      expect(result.error).toBe('Sprint not found')
    })
  })

  describe('getBacklog', () => {
    const mockResult = { issues: [], total: 0, maxResults: 50, startAt: 0 }

    it('should return backlog issues', async () => {
      getBacklogMock.mockResolvedValue(mockResult)

      const result = await services.getBacklog()

      expect(getBacklogMock).toHaveBeenCalled()
      expect(result.data).toEqual(mockResult)
      expect(result.error).toBeUndefined()
    })

    it('should handle repository errors', async () => {
      getBacklogMock.mockRejectedValue(new Error('Project key required'))

      const result = await services.getBacklog()

      expect(result.error).toBe('Project key required')
    })
  })
})
