import {
  EnhancedBlockHandler,
  EnhancedBlockDefinition,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  GenericBlockType,
  BlockGroup,
  ConnectionType,
  PropertyType,
  ValidationResult,
  HttpRequestOptions,
} from '@zyra/types';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse, AxiosError } from 'axios';

@Injectable()
export class EnhancedHttpBlock implements EnhancedBlockHandler {
  private readonly logger = new Logger(EnhancedHttpBlock.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'HTTP Request',
    name: GenericBlockType.HTTP_REQUEST,
    version: 1,
    description:
      'Make HTTP requests to any API endpoint with comprehensive configuration options',
    icon: 'globe',
    color: '#3B82F6',
    group: [BlockGroup.ACTION, BlockGroup.DATA],
    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    properties: [
      {
        displayName: 'Request Method',
        name: 'method',
        type: PropertyType.OPTIONS,
        required: true,
        default: 'GET',
        description: 'HTTP method to use for the request',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'HEAD', value: 'HEAD' },
          { name: 'OPTIONS', value: 'OPTIONS' },
        ],
      },
      {
        displayName: 'URL',
        name: 'url',
        type: PropertyType.STRING,
        required: true,
        description:
          'The URL to make the request to. Supports template variables like {{json.field}}',
        default: '',
      },
      {
        displayName: 'Headers',
        name: 'headers',
        type: PropertyType.COLLECTION,
        description: 'HTTP headers to include in the request',
        default: {},
        typeOptions: {
          multipleValues: true,
        },
      },
      {
        displayName: 'Query Parameters',
        name: 'queryParams',
        type: PropertyType.COLLECTION,
        description: 'Query parameters to include in the URL',
        default: {},
        typeOptions: {
          multipleValues: true,
        },
      },
      {
        displayName: 'Request Body',
        name: 'body',
        type: PropertyType.JSON,
        description: 'Request body data (for POST, PUT, PATCH requests)',
        displayOptions: {
          show: {
            method: ['POST', 'PUT', 'PATCH'],
          },
        },
        typeOptions: {
          alwaysOpenEditWindow: true,
          rows: 10,
        },
      },
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: PropertyType.OPTIONS,
        description: 'Authentication method to use',
        default: 'none',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basic' },
          { name: 'Bearer Token', value: 'bearer' },
          { name: 'API Key', value: 'apiKey' },
          { name: 'OAuth2', value: 'oauth2' },
        ],
      },
      {
        displayName: 'Username',
        name: 'username',
        type: PropertyType.STRING,
        description: 'Username for basic authentication',
        displayOptions: {
          show: {
            authentication: ['basic'],
          },
        },
      },
      {
        displayName: 'Password',
        name: 'password',
        type: PropertyType.STRING,
        description: 'Password for basic authentication',
        displayOptions: {
          show: {
            authentication: ['basic'],
          },
        },
        typeOptions: {
          password: true,
        },
      },
      {
        displayName: 'Token',
        name: 'token',
        type: PropertyType.STRING,
        description: 'Bearer token or API key',
        displayOptions: {
          show: {
            authentication: ['bearer', 'apiKey'],
          },
        },
        typeOptions: {
          password: true,
        },
      },
      {
        displayName: 'Timeout',
        name: 'timeout',
        type: PropertyType.NUMBER,
        description: 'Request timeout in milliseconds',
        default: 30000,
        typeOptions: {
          minValue: 1000,
          maxValue: 300000,
        },
      },
      {
        displayName: 'Follow Redirects',
        name: 'followRedirects',
        type: PropertyType.BOOLEAN,
        description: 'Follow HTTP redirects',
        default: true,
      },
      {
        displayName: 'Retry on Failure',
        name: 'retryOnFailure',
        type: PropertyType.BOOLEAN,
        description: 'Retry the request on failure',
        default: true,
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: PropertyType.NUMBER,
        description: 'Maximum number of retry attempts',
        default: 3,
        displayOptions: {
          show: {
            retryOnFailure: [true],
          },
        },
        typeOptions: {
          minValue: 1,
          maxValue: 10,
        },
      },
      {
        displayName: 'Ignore SSL Issues',
        name: 'ignoreSSL',
        type: PropertyType.BOOLEAN,
        description: 'Ignore SSL certificate errors',
        default: false,
      },
      {
        displayName: 'Response Format',
        name: 'responseFormat',
        type: PropertyType.OPTIONS,
        description: 'How to parse the response',
        default: 'json',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'Text', value: 'text' },
          { name: 'XML', value: 'xml' },
          { name: 'HTML', value: 'html' },
          { name: 'Binary', value: 'binary' },
        ],
      },
    ],

    documentation: {
      examples: [
        {
          name: 'Simple GET Request',
          description: 'Fetch data from a REST API',
          workflow: {
            nodes: [
              {
                parameters: {
                  method: 'GET',
                  url: 'https://api.example.com/users',
                  headers: {
                    Accept: 'application/json',
                  },
                },
              },
            ],
          },
        },
        {
          name: 'POST with JSON Body',
          description: 'Create a new resource',
          workflow: {
            nodes: [
              {
                parameters: {
                  method: 'POST',
                  url: 'https://api.example.com/users',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: {
                    name: '{{json.name}}',
                    email: '{{json.email}}',
                  },
                },
              },
            ],
          },
        },
      ],
      resources: [
        {
          url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods',
          text: 'HTTP Methods Documentation',
        },
      ],
    },
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    const inputData = context.getInputData();
    const returnData: ZyraNodeData[] = [];

    // If no input data, create a single empty item
    const items = inputData.length > 0 ? inputData : [{ json: {} }];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];

      try {
        // Get node parameters
        const method = context.getNodeParameter('method', itemIndex) as string;
        const url = context.getNodeParameter('url', itemIndex) as string;
        const headers =
          (context.getNodeParameter('headers', itemIndex) as Record<
            string,
            string
          >) || {};
        const queryParams =
          (context.getNodeParameter('queryParams', itemIndex) as Record<
            string,
            string
          >) || {};
        const body = context.getNodeParameter('body', itemIndex);
        const authentication = context.getNodeParameter(
          'authentication',
          itemIndex,
        ) as string;
        const timeout = context.getNodeParameter(
          'timeout',
          itemIndex,
        ) as number;
        const followRedirects = context.getNodeParameter(
          'followRedirects',
          itemIndex,
        ) as boolean;
        const retryOnFailure = context.getNodeParameter(
          'retryOnFailure',
          itemIndex,
        ) as boolean;
        const maxRetries = context.getNodeParameter(
          'maxRetries',
          itemIndex,
        ) as number;
        const ignoreSSL = context.getNodeParameter(
          'ignoreSSL',
          itemIndex,
        ) as boolean;
        const responseFormat = context.getNodeParameter(
          'responseFormat',
          itemIndex,
        ) as string;

        // Process URL template variables
        const processedUrl = context.helpers.processTemplate(url, item.json);

        // Process headers template variables
        const processedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          processedHeaders[key] = context.helpers.processTemplate(
            value,
            item.json,
          );
        }

        // Process query parameters
        const processedQueryParams: Record<string, string> = {};
        for (const [key, value] of Object.entries(queryParams)) {
          processedQueryParams[key] = context.helpers.processTemplate(
            value,
            item.json,
          );
        }

        // Process body template variables
        let processedBody = body;
        if (typeof body === 'string') {
          processedBody = context.helpers.processTemplate(body, item.json);
        } else if (typeof body === 'object' && body !== null) {
          processedBody = JSON.parse(
            context.helpers.processTemplate(JSON.stringify(body), item.json),
          );
        }

        // Set up authentication
        this.setupAuthentication(
          processedHeaders,
          authentication,
          context,
          itemIndex,
        );

        // Prepare request options
        const requestOptions: HttpRequestOptions = {
          url: processedUrl,
          method: method as any,
          headers: processedHeaders,
          body: processedBody,
          timeout,
          followRedirects,
          ignoreHttpStatusErrors: true,
        };

        // Add query parameters to URL
        if (Object.keys(processedQueryParams).length > 0) {
          const urlObj = new URL(processedUrl);
          Object.entries(processedQueryParams).forEach(([key, value]) => {
            urlObj.searchParams.append(key, value);
          });
          requestOptions.url = urlObj.toString();
        }

        // Execute the request with retry logic
        const response = await this.executeRequest(
          requestOptions,
          retryOnFailure ? maxRetries : 0,
          context,
        );

        // Process response based on format
        const processedResponse = await this.processResponse(
          response,
          responseFormat,
        );

        // Create output data
        const outputData: ZyraNodeData = {
          json: {
            statusCode: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: processedResponse,
            url: processedUrl,
            method: method.toUpperCase(),
            timestamp: new Date().toISOString(),
            success: response.status >= 200 && response.status < 300,
          },
        };

        // Add binary data if response is binary
        if (responseFormat === 'binary' && response.data) {
          outputData.binary = {
            data: {
              data: Buffer.from(response.data).toString('base64'),
              mimeType:
                response.headers['content-type'] || 'application/octet-stream',
            },
          };
        }

        returnData.push(outputData);

        this.logger.debug(`HTTP request successful for item ${itemIndex}`, {
          url: processedUrl,
          method,
          statusCode: response.status,
          executionId: context.executionId,
        });
      } catch (error) {
        this.logger.error(`HTTP request failed for item ${itemIndex}`, {
          error: error.message,
          executionId: context.executionId,
        });

        // Create error output
        const errorOutput: ZyraNodeData = {
          json: {
            error: error.message,
            success: false,
            timestamp: new Date().toISOString(),
          },
          error: {
            message: error.message,
            name: error.name,
            timestamp: new Date().toISOString(),
            context: { itemIndex },
          },
        };

        returnData.push(errorOutput);
      }
    }

    return returnData;
  }

  private setupAuthentication(
    headers: Record<string, string>,
    authentication: string,
    context: EnhancedBlockExecutionContext,
    itemIndex: number,
  ): void {
    switch (authentication) {
      case 'basic':
        const username = context.getNodeParameter(
          'username',
          itemIndex,
        ) as string;
        const password = context.getNodeParameter(
          'password',
          itemIndex,
        ) as string;
        const credentials = Buffer.from(`${username}:${password}`).toString(
          'base64',
        );
        headers['Authorization'] = `Basic ${credentials}`;
        break;

      case 'bearer':
        const bearerToken = context.getNodeParameter(
          'token',
          itemIndex,
        ) as string;
        headers['Authorization'] = `Bearer ${bearerToken}`;
        break;

      case 'apiKey':
        const apiKey = context.getNodeParameter('token', itemIndex) as string;
        headers['X-API-Key'] = apiKey;
        break;

      case 'oauth2':
        // OAuth2 would require credential management
        // This is a placeholder for future implementation
        break;
    }
  }

  private async executeRequest(
    options: HttpRequestOptions,
    maxRetries: number,
    context: EnhancedBlockExecutionContext,
  ): Promise<AxiosResponse> {
    let lastError: AxiosError | Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios({
          url: options.url,
          method: options.method,
          headers: options.headers,
          data: options.body,
          timeout: options.timeout,
          maxRedirects: options.followRedirects ? 5 : 0,
          validateStatus: () => true, // Don't throw on HTTP errors
        });

        if (attempt > 0) {
          this.logger.info(`HTTP request succeeded on attempt ${attempt + 1}`, {
            url: options.url,
            statusCode: response.status,
            executionId: context.executionId,
          });
        }

        return response;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `HTTP request failed (attempt ${attempt + 1}), retrying in ${delay}ms`,
            {
              url: options.url,
              error: error.message,
              executionId: context.executionId,
            },
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private async processResponse(
    response: AxiosResponse,
    format: string,
  ): Promise<any> {
    switch (format) {
      case 'json':
        try {
          return typeof response.data === 'string'
            ? JSON.parse(response.data)
            : response.data;
        } catch (error) {
          return response.data;
        }

      case 'text':
        return typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);

      case 'xml':
        // XML parsing would require additional library
        return response.data;

      case 'html':
        return response.data;

      case 'binary':
        return response.data;

      default:
        return response.data;
    }
  }

  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!config.url) {
      errors.push('URL is required');
    }

    if (!config.method) {
      errors.push('Method is required');
    }

    // Validate URL format
    if (config.url && !config.url.includes('{{')) {
      try {
        new URL(config.url);
      } catch (error) {
        errors.push('Invalid URL format');
      }
    }

    // Validate timeout
    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push('Timeout must be between 1000ms and 300000ms');
    }

    // Validate authentication
    if (
      config.authentication === 'basic' &&
      (!config.username || !config.password)
    ) {
      errors.push(
        'Username and password are required for basic authentication',
      );
    }

    if (
      (config.authentication === 'bearer' ||
        config.authentication === 'apiKey') &&
      !config.token
    ) {
      errors.push('Token is required for bearer/API key authentication');
    }

    // Warnings
    if (config.ignoreSSL) {
      warnings.push('Ignoring SSL certificate errors can be a security risk');
    }

    if (config.timeout && config.timeout > 60000) {
      warnings.push('Long timeouts may affect workflow performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
