import { jest } from '@jest/globals';
import { SupabaseClient } from '@supabase/supabase-js';
import { BlockHandler } from '@zyra/types';

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockIn = jest.fn().mockReturnThis();
  const mockMatch = jest.fn().mockReturnThis();
  const mockSingle = jest.fn().mockReturnThis();
  const mockMaybeSingle = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockIs = jest.fn().mockReturnThis();
  const mockNot = jest.fn().mockReturnThis();
  const mockGt = jest.fn().mockReturnThis();
  const mockLt = jest.fn().mockReturnThis();
  const mockGte = jest.fn().mockReturnThis();
  const mockLte = jest.fn().mockReturnThis();
  const mockIlike = jest.fn().mockReturnThis();
  const mockContains = jest.fn().mockReturnThis();
  const mockContainedBy = jest.fn().mockReturnThis();
  const mockOverlaps = jest.fn().mockReturnThis();
  const mockTextSearch = jest.fn().mockReturnThis();
  const mockFilter = jest.fn().mockReturnThis();
  const mockOr = jest.fn().mockReturnThis();
  const mockAnd = jest.fn().mockReturnThis();

  // Default response with no data and no error
  const defaultResponse = { data: null, error: null };

  // Mock from method that returns an object with all the query methods
  const mockFrom = jest.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    match: mockMatch,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    limit: mockLimit,
    order: mockOrder,
    is: mockIs,
    not: mockNot,
    gt: mockGt,
    lt: mockLt,
    gte: mockGte,
    lte: mockLte,
    ilike: mockIlike,
    contains: mockContains,
    containedBy: mockContainedBy,
    overlaps: mockOverlaps,
    textSearch: mockTextSearch,
    filter: mockFilter,
    or: mockOr,
    and: mockAnd,
  }));

  // Create the mock Supabase client
  const mockSupabaseClient = {
    from: mockFrom,
    // Add any other Supabase methods you need to mock
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    storage: {
      from: jest.fn().mockImplementation(() => ({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest
          .fn()
          .mockResolvedValue({ data: Buffer.from('test-data'), error: null }),
        getPublicUrl: jest
          .fn()
          .mockReturnValue({ data: { publicUrl: 'https://test-url.com' } }),
      })),
    },
    rpc: jest.fn().mockResolvedValue(defaultResponse),
  };

  // Helper to set the response for a specific query chain
  const setResponse = (response: any) => {
    mockSelect.mockReturnValueOnce({
      eq: mockEq.mockReturnValueOnce({
        single: mockSingle.mockResolvedValueOnce(response),
        maybeSingle: mockMaybeSingle.mockResolvedValueOnce(response),
        limit: mockLimit.mockResolvedValueOnce(response),
      }),
      match: mockMatch.mockReturnValueOnce({
        single: mockSingle.mockResolvedValueOnce(response),
        maybeSingle: mockMaybeSingle.mockResolvedValueOnce(response),
      }),
      limit: mockLimit.mockResolvedValueOnce(response),
      single: mockSingle.mockResolvedValueOnce(response),
      maybeSingle: mockMaybeSingle.mockResolvedValueOnce(response),
    });

    mockInsert.mockReturnValueOnce({
      select: mockSelect.mockReturnValueOnce({
        single: mockSingle.mockResolvedValueOnce(response),
      }),
      single: mockSingle.mockResolvedValueOnce(response),
    });

    mockUpdate.mockReturnValueOnce({
      eq: mockEq.mockResolvedValueOnce(response),
      match: mockMatch.mockResolvedValueOnce(response),
    });

    mockDelete.mockReturnValueOnce({
      eq: mockEq.mockResolvedValueOnce(response),
      match: mockMatch.mockResolvedValueOnce(response),
    });
  };

  return {
    client: mockSupabaseClient,
    setResponse,
    mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      match: mockMatch,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    },
  };
};

// Mock AMQP connection and channel
export const createMockAmqpConnection = () => {
  const mockChannel = {
    assertQueue: jest.fn().mockResolvedValue({}),
    consume: jest.fn().mockImplementation((queue, callback) => {
      // Store the callback for later use in tests
      mockChannel.callbacks[queue] = callback;
      return Promise.resolve({});
    }),
    ack: jest.fn(),
    nack: jest.fn(),
    prefetch: jest.fn(),
    callbacks: {},
  };

  const mockChannelWrapper = {
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  };

  const mockConnection = {
    createChannel: jest.fn().mockReturnValue(mockChannelWrapper),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  };

  return {
    connection: mockConnection,
    channelWrapper: mockChannelWrapper,
    channel: mockChannel,
  };
};

// Mock Logger
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

// Mock Tracer
export const createMockTracer = () => {
  const mockSpan = {
    end: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    setAttribute: jest.fn(),
  };

  return {
    startSpan: jest.fn().mockReturnValue(mockSpan),
    span: mockSpan,
  };
};

// Mock workflow data
export const createMockWorkflow = (overrides = {}) => ({
  id: 'test-workflow-id',
  name: 'Test Workflow',
  description: 'Test workflow description',
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  flow_data: {
    nodes: [
      {
        id: 'node1',
        type: 'input',
        data: { type: 'INPUT', label: 'Start' },
        position: { x: 0, y: 0 },
      },
      {
        id: 'node2',
        type: 'default',
        data: {
          type: 'EMAIL',
          label: 'Send Email',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body',
        },
        position: { x: 200, y: 0 },
      },
      {
        id: 'node3',
        type: 'output',
        data: { type: 'OUTPUT', label: 'End' },
        position: { x: 400, y: 0 },
      },
    ],
    edges: [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node2', target: 'node3' },
    ],
  },
  ...overrides,
});

// Mock execution data
export const createMockExecution = (overrides = {}) => ({
  id: 'test-execution-id',
  workflow_id: 'test-workflow-id',
  user_id: 'test-user-id',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  started_at: null,
  completed_at: null,
  result: null,
  error: null,
  retry_count: 0,
  locked_by: null,
  ...overrides,
});

// Mock node execution data
export const createMockNodeExecution = (overrides = {}) => ({
  id: 'test-node-execution-id',
  execution_id: 'test-execution-id',
  node_id: 'node1',
  status: 'pending',
  started_at: null,
  completed_at: null,
  result: null,
  error: null,
  retry_count: 0,
  ...overrides,
});

// Mock profile data
export const createMockProfile = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  monthly_execution_count: 0,
  monthly_execution_quota: 100,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Mock block handlers
export const createMockBlockHandler = () => ({
  execute: jest
    .fn()
    .mockResolvedValue({ success: true, data: { result: 'test-result' } }),
  validate: jest.fn().mockReturnValue({ valid: true }),
});

// Mock notification service
export const createMockNotificationService = () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
});

// Helper to create a mock execution job
export const createMockExecutionJob = (overrides = {}) => ({
  id: 'test-job-id',
  execution_id: 'test-execution-id',
  workflow_id: 'test-workflow-id',
  user_id: 'test-user-id',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  payload: {},
  error: null,
  ...overrides,
});
