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

const jiraApiRepositoryInstance = {
  testConnection: testConnectionMock,
  getProject: getProjectMock,
  getConfiguredProjectKey: getConfiguredProjectKeyMock,
}

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
})
