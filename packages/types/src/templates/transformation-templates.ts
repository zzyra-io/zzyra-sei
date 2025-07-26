export interface TransformationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'data-processing' | 'formatting' | 'validation' | 'aggregation' | 'finance' | 'utility';
  tags: string[];
  transformations: any[];
  exampleInput?: any;
  exampleOutput?: any;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  useCount?: number;
}

export const TRANSFORMATION_TEMPLATES: Record<string, TransformationTemplate> = {
  'api-response-cleanup': {
    id: 'api-response-cleanup',
    name: 'API Response Cleanup',
    description: 'Clean and normalize API response data by extracting the payload and standardizing fields',
    category: 'api',
    tags: ['api', 'response', 'cleanup', 'normalize'],
    difficulty: 'beginner',
    transformations: [
      {
        id: 'extract-data-payload',
        type: 'extract',
        field: 'data',
        outputField: 'payload',
        operation: 'extract'
      },
      {
        id: 'rename-status',
        type: 'map',
        field: 'status',
        outputField: 'statusCode',
        operation: 'rename'
      },
      {
        id: 'filter-success',
        type: 'filter',
        field: 'statusCode',
        operation: 'greater_than',
        value: 199,
        condition: 'statusCode >= 200 && statusCode < 300'
      }
    ],
    exampleInput: {
      data: { users: [{ id: 1, name: 'John' }] },
      status: 200,
      message: 'Success'
    },
    exampleOutput: {
      payload: { users: [{ id: 1, name: 'John' }] },
      statusCode: 200,
      message: 'Success'
    }
  },

  'price-data-normalization': {
    id: 'price-data-normalization',
    name: 'Price Data Normalization',
    description: 'Normalize price data from different sources into a consistent format',
    category: 'finance',
    tags: ['price', 'finance', 'currency', 'normalization'],
    difficulty: 'intermediate',
    transformations: [
      {
        id: 'parse-price',
        type: 'format',
        field: 'price',
        operation: 'parse_number',
        outputField: 'numericPrice'
      },
      {
        id: 'convert-to-cents',
        type: 'format',
        field: 'numericPrice',
        operation: 'multiply',
        value: 100,
        outputField: 'priceInCents'
      },
      {
        id: 'normalize-currency',
        type: 'format',
        field: 'currency',
        operation: 'uppercase',
        outputField: 'currencyCode'
      },
      {
        id: 'add-timestamp',
        type: 'enrich',
        operation: 'timestamp',
        outputField: 'normalizedAt'
      }
    ],
    exampleInput: {
      price: '99.99',
      currency: 'usd'
    },
    exampleOutput: {
      price: '99.99',
      currency: 'usd',
      numericPrice: 99.99,
      priceInCents: 9999,
      currencyCode: 'USD',
      normalizedAt: '2023-12-01T12:00:00Z'
    }
  },

  'user-data-processing': {
    id: 'user-data-processing',
    name: 'User Data Processing',
    description: 'Process and validate user registration data with proper formatting',
    category: 'data-processing',
    tags: ['user', 'validation', 'formatting', 'registration'],
    difficulty: 'intermediate',
    transformations: [
      {
        id: 'normalize-email',
        type: 'format',
        field: 'email',
        operation: 'lowercase',
        outputField: 'email'
      },
      {
        id: 'format-name',
        type: 'format',
        field: 'name',
        operation: 'title_case',
        outputField: 'displayName'
      },
      {
        id: 'extract-avatar',
        type: 'extract',
        field: 'profile.avatar',
        outputField: 'avatarUrl'
      },
      {
        id: 'generate-id',
        type: 'enrich',
        operation: 'uuid',
        outputField: 'userId'
      }
    ],
    exampleInput: {
      email: 'JOHN.DOE@EXAMPLE.COM',
      name: 'john doe',
      profile: { avatar: 'https://example.com/avatar.jpg' }
    },
    exampleOutput: {
      email: 'john.doe@example.com',
      name: 'john doe',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
      userId: '1234567890-abcdef123456',
      profile: { avatar: 'https://example.com/avatar.jpg' }
    }
  },

  'array-aggregation': {
    id: 'array-aggregation',
    name: 'Array Data Aggregation',
    description: 'Aggregate numerical data from arrays with statistical operations',
    category: 'aggregation',
    tags: ['array', 'statistics', 'math', 'aggregation'],
    difficulty: 'beginner',
    transformations: [
      {
        id: 'calculate-total',
        type: 'aggregate',
        field: 'amount',
        operation: 'sum',
        outputField: 'total'
      },
      {
        id: 'calculate-average',
        type: 'aggregate',
        field: 'amount',
        operation: 'avg',
        outputField: 'average'
      },
      {
        id: 'find-maximum',
        type: 'aggregate',
        field: 'amount',
        operation: 'max',
        outputField: 'maximum'
      },
      {
        id: 'count-items',
        type: 'aggregate',
        operation: 'count',
        outputField: 'itemCount'
      }
    ],
    exampleInput: [
      { amount: 100 },
      { amount: 200 },
      { amount: 150 }
    ],
    exampleOutput: {
      total: 450,
      average: 150,
      maximum: 200,
      itemCount: 3
    }
  },

  'conditional-data-routing': {
    id: 'conditional-data-routing',
    name: 'Conditional Data Routing',
    description: 'Route data based on conditions with different transformations for each path',
    category: 'data-processing',
    tags: ['conditional', 'routing', 'logic', 'branching'],
    difficulty: 'advanced',
    transformations: [
      {
        id: 'route-by-status',
        type: 'conditional',
        condition: 'status === "premium"',
        trueTransformation: {
          id: 'premium-processing',
          type: 'format',
          field: 'discount',
          operation: 'multiply',
          value: 0.8,
          outputField: 'finalPrice'
        },
        falseTransformation: {
          id: 'regular-processing',
          type: 'map',
          field: 'price',
          outputField: 'finalPrice'
        }
      }
    ],
    exampleInput: {
      status: 'premium',
      price: 100,
      discount: 100
    },
    exampleOutput: {
      status: 'premium',
      price: 100,
      discount: 100,
      finalPrice: 80
    }
  },

  'text-formatting-suite': {
    id: 'text-formatting-suite',
    name: 'Text Formatting Suite',
    description: 'Comprehensive text formatting operations for string data',
    category: 'formatting',
    tags: ['text', 'string', 'formatting', 'case'],
    difficulty: 'beginner',
    transformations: [
      {
        id: 'trim-whitespace',
        type: 'format',
        field: 'title',
        operation: 'trim',
        outputField: 'cleanTitle'
      },
      {
        id: 'title-case',
        type: 'format',
        field: 'cleanTitle',
        operation: 'title_case',
        outputField: 'formattedTitle'
      },
      {
        id: 'uppercase-code',
        type: 'format',
        field: 'code',
        operation: 'uppercase',
        outputField: 'codeUpper'
      }
    ],
    exampleInput: {
      title: '  hello world  ',
      code: 'abc123'
    },
    exampleOutput: {
      title: '  hello world  ',
      code: 'abc123',
      cleanTitle: 'hello world',
      formattedTitle: 'Hello World',
      codeUpper: 'ABC123'
    }
  },

  'data-validation-pipeline': {
    id: 'data-validation-pipeline',
    name: 'Data Validation Pipeline',
    description: 'Validate and sanitize incoming data with multiple validation rules',
    category: 'validation',
    tags: ['validation', 'sanitization', 'data-quality'],
    difficulty: 'intermediate',
    transformations: [
      {
        id: 'validate-email-format',
        type: 'filter',
        field: 'email',
        operation: 'contains',
        value: '@'
      },
      {
        id: 'validate-age-range',
        type: 'filter',
        field: 'age',
        operation: 'greater_than',
        value: 0
      },
      {
        id: 'sanitize-phone',
        type: 'format',
        field: 'phone',
        operation: 'trim',
        outputField: 'cleanPhone'
      }
    ],
    exampleInput: {
      email: 'user@example.com',
      age: 25,
      phone: ' +1-555-123-4567 '
    },
    exampleOutput: {
      email: 'user@example.com',
      age: 25,
      phone: ' +1-555-123-4567 ',
      cleanPhone: '+1-555-123-4567'
    }
  },

  'batch-data-processing': {
    id: 'batch-data-processing',
    name: 'Batch Data Processing',
    description: 'Process arrays of data with transformations applied to each item',
    category: 'data-processing',
    tags: ['batch', 'array', 'loop', 'processing'],
    difficulty: 'advanced',
    transformations: [
      {
        id: 'process-items',
        type: 'loop',
        itemTransformations: [
          {
            id: 'normalize-name',
            type: 'format',
            field: 'name',
            operation: 'title_case',
            outputField: 'displayName'
          },
          {
            id: 'calculate-score',
            type: 'format',
            field: 'points',
            operation: 'multiply',
            value: 1.1,
            outputField: 'bonusScore'
          }
        ],
        parallel: true,
        batchSize: 50
      }
    ],
    exampleInput: [
      { name: 'john doe', points: 100 },
      { name: 'jane smith', points: 150 }
    ],
    exampleOutput: [
      { name: 'john doe', points: 100, displayName: 'John Doe', bonusScore: 110 },
      { name: 'jane smith', points: 150, displayName: 'Jane Smith', bonusScore: 165 }
    ]
  },

  'object-flattening': {
    id: 'object-flattening',
    name: 'Object Flattening',
    description: 'Flatten nested objects into a single level structure',
    category: 'utility',
    tags: ['flatten', 'nested', 'object', 'utility'],
    difficulty: 'intermediate',
    transformations: [
      {
        id: 'extract-user-name',
        type: 'extract',
        field: 'user.name',
        outputField: 'userName'
      },
      {
        id: 'extract-user-email',
        type: 'extract',
        field: 'user.email',
        outputField: 'userEmail'
      },
      {
        id: 'extract-address',
        type: 'extract',
        field: 'user.address.city',
        outputField: 'city'
      }
    ],
    exampleInput: {
      id: 1,
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        address: { city: 'New York', country: 'USA' }
      }
    },
    exampleOutput: {
      id: 1,
      userName: 'John Doe',
      userEmail: 'john@example.com',
      city: 'New York',
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        address: { city: 'New York', country: 'USA' }
      }
    }
  },

  'sorting-and-filtering': {
    id: 'sorting-and-filtering',
    name: 'Sorting and Filtering',
    description: 'Sort and filter array data based on specified criteria',
    category: 'data-processing',
    tags: ['sort', 'filter', 'array', 'criteria'],
    difficulty: 'beginner',
    transformations: [
      {
        id: 'filter-active',
        type: 'filter',
        field: 'active',
        operation: 'equals',
        value: true
      },
      {
        id: 'sort-by-date',
        type: 'sort',
        field: 'createdAt',
        operation: 'desc'
      }
    ],
    exampleInput: [
      { id: 1, active: true, createdAt: '2023-01-01' },
      { id: 2, active: false, createdAt: '2023-01-02' },
      { id: 3, active: true, createdAt: '2023-01-03' }
    ],
    exampleOutput: [
      { id: 3, active: true, createdAt: '2023-01-03' },
      { id: 1, active: true, createdAt: '2023-01-01' }
    ]
  }
};

export function getTemplatesByCategory(category: string): TransformationTemplate[] {
  return Object.values(TRANSFORMATION_TEMPLATES).filter(
    template => template.category === category
  );
}

export function getTemplatesByTag(tag: string): TransformationTemplate[] {
  return Object.values(TRANSFORMATION_TEMPLATES).filter(
    template => template.tags.includes(tag)
  );
}

export function searchTemplates(query: string): TransformationTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return Object.values(TRANSFORMATION_TEMPLATES).filter(
    template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

export function getPopularTemplates(limit: number = 5): TransformationTemplate[] {
  return Object.values(TRANSFORMATION_TEMPLATES)
    .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
    .slice(0, limit);
}

export function getTemplateById(id: string): TransformationTemplate | undefined {
  return TRANSFORMATION_TEMPLATES[id];
}