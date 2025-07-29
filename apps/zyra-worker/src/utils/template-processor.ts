import { Injectable, Logger } from '@nestjs/common';
import { TemplateProcessor } from '@zyra/types';

@Injectable()
export class ZyraTemplateProcessor implements TemplateProcessor {
  private readonly logger = new Logger(ZyraTemplateProcessor.name);

  /**
   * Process template variables in a string
   * Supports various template syntaxes:
   * - {{json.field}} - Access data from current item
   * - {{json.nested.field}} - Access nested data
   * - {{json.array[0]}} - Access array elements
   * - {data.field} - Access data from previous block outputs (new)
   * - {previousBlock.field} - Access data from any previous block (new)
   * - {NodeId.field} - Access data from specific node by ID (new)
   * - {{$now}} - Current timestamp
   * - {{$uuid}} - Generate UUID
   * - {{$randomInt(1,100)}} - Generate random integer
   */
  process(template: string, data: any, context?: any): string {
    if (typeof template !== 'string') {
      return String(template);
    }

    let result = template;
    this.logger.debug(`[TEMPLATE] Processing template:`, {
      template:
        template.substring(0, 200) + (template.length > 200 ? '...' : ''),
      dataKeys: Object.keys(data || {}),
      contextKeys: Object.keys(context || {}),
      previousOutputsKeys: Object.keys(context?.previousOutputs || {}),
      previousOutputsCount: Object.keys(context?.previousOutputs || {}).length,
      blockOutputsKeys: Object.keys(context?.blockOutputs || {}),
      blockOutputsCount: Object.keys(context?.blockOutputs || {}).length,
    });

    // Log the actual previous outputs structure
    if (context?.previousOutputs) {
      this.logger.debug(`[TEMPLATE] Previous outputs structure:`, {
        previousOutputs: context.previousOutputs,
      });
    }

    // Process {data.field} expressions - access data from previous block outputs
    result = result.replace(/\{data\.([^}]+)\}/g, (match, path) => {
      this.logger.debug(`[TEMPLATE] Processing {data.${path}} pattern`);
      // Look for data in context.previousOutputs or context.blockOutputs
      const previousOutputs =
        context?.previousOutputs || context?.blockOutputs || {};

      // Try to find the data in any previous block output
      for (const [blockId, output] of Object.entries(previousOutputs)) {
        this.logger.debug(
          `[TEMPLATE] Checking block ${blockId} for path ${path}:`,
          {
            outputKeys: Object.keys(output || {}),
            hasPath: this.getNestedValue(output, path) !== undefined,
          },
        );

        // Debug the output structure
        this.logger.debug(`[TEMPLATE] Output structure for ${blockId}:`, {
          blockId,
          outputKeys: Object.keys(output || {}),
          outputType: typeof output,
          isObject: typeof output === 'object' && output !== null,
          hasNestedStructure: Object.values(output || {}).some(
            (val) => typeof val === 'object' && val !== null,
          ),
        });

        // First try to get the value directly from the output
        let value = this.getNestedValue(output, path);
        this.logger.debug(`[TEMPLATE] Direct lookup result for ${path}:`, {
          path,
          value,
          hasValue: value !== undefined,
        });

        // If not found, try common field names that might contain the data
        if (value === undefined) {
          const commonFields = [
            'response',
            'result',
            'output',
            'data',
            'content',
            'text',
          ];
          for (const field of commonFields) {
            if (path === field) {
              value = this.getNestedValue(output, field);
              if (value !== undefined) {
                this.logger.debug(`[TEMPLATE] Found value in ${field} field:`, {
                  value:
                    typeof value === 'string'
                      ? value.substring(0, 100) + '...'
                      : value,
                });
                break;
              }
            }
          }
        }

        // If still not found, try nested access within the block output
        if (value === undefined) {
          this.logger.debug(`[TEMPLATE] Trying nested access for ${path}`);
          // Check if the output has a nested structure (like AI Agent outputs)
          for (const [nestedKey, nestedOutput] of Object.entries(
            output || {},
          )) {
            this.logger.debug(`[TEMPLATE] Checking nested key: ${nestedKey}`, {
              nestedKey,
              nestedOutputType: typeof nestedOutput,
              isObject:
                typeof nestedOutput === 'object' && nestedOutput !== null,
            });

            if (typeof nestedOutput === 'object' && nestedOutput !== null) {
              // Try to get the field from the nested output
              const nestedValue = this.getNestedValue(nestedOutput, path);
              this.logger.debug(`[TEMPLATE] Nested value for ${path}:`, {
                path,
                nestedValue,
                hasValue: nestedValue !== undefined,
              });

              if (nestedValue !== undefined) {
                value = nestedValue;
                this.logger.debug(
                  `[TEMPLATE] Found value in nested ${nestedKey}.${path}:`,
                  {
                    value:
                      typeof value === 'string'
                        ? value.substring(0, 100) + '...'
                        : value,
                  },
                );
                break;
              }

              // Also try common fields in the nested output
              const commonFields = ['response', 'result', 'output', 'data'];
              for (const field of commonFields) {
                if (path === field) {
                  const fieldValue = this.getNestedValue(nestedOutput, field);
                  this.logger.debug(
                    `[TEMPLATE] Checking common field ${field}:`,
                    {
                      field,
                      fieldValue,
                      hasValue: fieldValue !== undefined,
                    },
                  );

                  if (fieldValue !== undefined) {
                    value = fieldValue;
                    this.logger.debug(
                      `[TEMPLATE] Found value in nested ${nestedKey}.${field}:`,
                      {
                        value:
                          typeof value === 'string'
                            ? value.substring(0, 100) + '...'
                            : value,
                      },
                    );
                    break;
                  }
                }
              }

              if (value !== undefined) {
                break;
              }
            }
          }
        }

        if (value !== undefined) {
          this.logger.debug(`[TEMPLATE] Returning value for {data.${path}}:`, {
            value:
              typeof value === 'string'
                ? value.substring(0, 100) + '...'
                : value,
          });
          return this.formatValue(value);
        }
      }

      // Fallback to current data
      const value = this.getNestedValue(data, path);
      this.logger.debug(`[TEMPLATE] Fallback value for {data.${path}}:`, {
        value:
          typeof value === 'string' ? value.substring(0, 100) + '...' : value,
      });
      return this.formatValue(value);
    });

    // Process {previousBlock.field} expressions - access data from any previous block
    result = result.replace(/\{previousBlock\.([^}]+)\}/g, (match, path) => {
      this.logger.debug(
        `[TEMPLATE] Processing {previousBlock.${path}} pattern`,
      );
      const previousOutputs =
        context?.previousOutputs || context?.blockOutputs || {};

      // Get the most recent previous block output
      const blockIds = Object.keys(previousOutputs);
      if (blockIds.length > 0) {
        const lastBlockId = blockIds[blockIds.length - 1];
        const output = previousOutputs[lastBlockId];

        this.logger.debug(
          `[TEMPLATE] Checking block ${lastBlockId} for path ${path}:`,
          {
            outputKeys: Object.keys(output || {}),
            hasPath: this.getNestedValue(output, path) !== undefined,
          },
        );

        // Debug the output structure
        this.logger.debug(`[TEMPLATE] Output structure for ${lastBlockId}:`, {
          blockId: lastBlockId,
          outputKeys: Object.keys(output || {}),
          outputType: typeof output,
          isObject: typeof output === 'object' && output !== null,
          hasNestedStructure: Object.values(output || {}).some(
            (val) => typeof val === 'object' && val !== null,
          ),
        });

        // First try to get the value directly from the output
        let value = this.getNestedValue(output, path);
        this.logger.debug(`[TEMPLATE] Direct lookup result for ${path}:`, {
          path,
          value,
          hasValue: value !== undefined,
        });

        // If not found, try common field names that might contain the data
        if (value === undefined) {
          const commonFields = [
            'response',
            'result',
            'output',
            'data',
            'content',
            'text',
          ];
          for (const field of commonFields) {
            if (path === field) {
              value = this.getNestedValue(output, field);
              if (value !== undefined) {
                this.logger.debug(`[TEMPLATE] Found value in ${field} field:`, {
                  value:
                    typeof value === 'string'
                      ? value.substring(0, 100) + '...'
                      : value,
                });
                break;
              }
            }
          }
        }

        // If still not found, try nested access within the block output
        if (value === undefined) {
          this.logger.debug(`[TEMPLATE] Trying nested access for ${path}`);
          // Check if the output has a nested structure (like AI Agent outputs)
          for (const [nestedKey, nestedOutput] of Object.entries(
            output || {},
          )) {
            this.logger.debug(`[TEMPLATE] Checking nested key: ${nestedKey}`, {
              nestedKey,
              nestedOutputType: typeof nestedOutput,
              isObject:
                typeof nestedOutput === 'object' && nestedOutput !== null,
            });

            if (typeof nestedOutput === 'object' && nestedOutput !== null) {
              // Try to get the field from the nested output
              const nestedValue = this.getNestedValue(nestedOutput, path);
              this.logger.debug(`[TEMPLATE] Nested value for ${path}:`, {
                path,
                nestedValue,
                hasValue: nestedValue !== undefined,
              });

              if (nestedValue !== undefined) {
                value = nestedValue;
                this.logger.debug(
                  `[TEMPLATE] Found value in nested ${nestedKey}.${path}:`,
                  {
                    value:
                      typeof value === 'string'
                        ? value.substring(0, 100) + '...'
                        : value,
                  },
                );
                break;
              }

              // Also try common fields in the nested output
              const commonFields = ['response', 'result', 'output', 'data'];
              for (const field of commonFields) {
                if (path === field) {
                  const fieldValue = this.getNestedValue(nestedOutput, field);
                  this.logger.debug(
                    `[TEMPLATE] Checking common field ${field}:`,
                    {
                      field,
                      fieldValue,
                      hasValue: fieldValue !== undefined,
                    },
                  );

                  if (fieldValue !== undefined) {
                    value = fieldValue;
                    this.logger.debug(
                      `[TEMPLATE] Found value in nested ${nestedKey}.${field}:`,
                      {
                        value:
                          typeof value === 'string'
                            ? value.substring(0, 100) + '...'
                            : value,
                      },
                    );
                    break;
                  }
                }
              }

              if (value !== undefined) {
                break;
              }
            }
          }
        }

        if (value !== undefined) {
          this.logger.debug(
            `[TEMPLATE] Returning value for {previousBlock.${path}}:`,
            {
              value:
                typeof value === 'string'
                  ? value.substring(0, 100) + '...'
                  : value,
            },
          );
          return this.formatValue(value);
        }
      }

      this.logger.debug(
        `[TEMPLATE] No value found for {previousBlock.${path}}`,
      );
      return this.formatValue(undefined);
    });

    // Process {NodeId.field} expressions - access data from specific node by ID
    result = result.replace(
      /\{([a-zA-Z0-9_-]+)\.([^}]+)\}/g,
      (match, nodeId, path) => {
        // Skip if this looks like a special pattern (data, previousBlock, etc.)
        if (nodeId === 'data' || nodeId === 'previousBlock') {
          return match;
        }

        const previousOutputs =
          context?.previousOutputs || context?.blockOutputs || {};

        // Look for exact node ID match
        if (previousOutputs[nodeId]) {
          const value = this.getNestedValue(previousOutputs[nodeId], path);
          if (value !== undefined) {
            return this.formatValue(value);
          }
        }

        // Look for partial matches (in case node ID contains underscores or dashes)
        for (const [blockId, output] of Object.entries(previousOutputs)) {
          if (blockId.includes(nodeId) || nodeId.includes(blockId)) {
            const value = this.getNestedValue(output, path);
            if (value !== undefined) {
              return this.formatValue(value);
            }
          }
        }

        return this.formatValue(undefined);
      },
    );

    // Process {{json.field}} expressions (legacy support)
    result = result.replace(/\{\{json\.([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return this.formatValue(value);
    });

    // Process {{field}} expressions (legacy support)
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      this.logger.debug(`[TEMPLATE] Processing {{${path}}} pattern`);

      // Skip if it's already processed as json.field
      if (path.startsWith('json.')) return match;

      // First try to get from current data
      let value = this.getNestedValue(data, path);

      // If not found and it looks like a data.field pattern, check previous outputs
      if (value === undefined && path.startsWith('data.')) {
        const fieldPath = path.substring(5); // Remove 'data.' prefix
        this.logger.debug(
          `[TEMPLATE] Looking for ${fieldPath} in previous outputs`,
        );

        const previousOutputs =
          context?.previousOutputs || context?.blockOutputs || {};

        // Try to find the data in any previous block output
        for (const [blockId, output] of Object.entries(previousOutputs)) {
          this.logger.debug(
            `[TEMPLATE] Checking block ${blockId} for path ${fieldPath}`,
          );

          // Debug the output structure
          this.logger.debug(`[TEMPLATE] Output structure for ${blockId}:`, {
            blockId,
            outputKeys: Object.keys(output),
            outputType: typeof output,
            isObject: typeof output === 'object' && output !== null,
            hasNestedStructure: Object.values(output).some(
              (val) => typeof val === 'object' && val !== null,
            ),
          });

          // First try to get the value directly from the output
          let outputValue = this.getNestedValue(output, fieldPath);
          this.logger.debug(
            `[TEMPLATE] Direct lookup result for ${fieldPath}:`,
            {
              fieldPath,
              outputValue,
              hasValue: outputValue !== undefined,
            },
          );

          // If not found, try common field names that might contain the data
          if (outputValue === undefined) {
            const commonFields = [
              'response',
              'result',
              'output',
              'data',
              'content',
              'text',
            ];
            for (const field of commonFields) {
              if (fieldPath === field) {
                outputValue = this.getNestedValue(output, field);
                if (outputValue !== undefined) {
                  this.logger.debug(
                    `[TEMPLATE] Found value in ${field} field:`,
                    {
                      value:
                        typeof outputValue === 'string'
                          ? outputValue.substring(0, 100) + '...'
                          : outputValue,
                    },
                  );
                  break;
                }
              }
            }
          }

          // If still not found, try nested access within the block output
          if (outputValue === undefined) {
            this.logger.debug(
              `[TEMPLATE] Trying nested access for ${fieldPath}`,
            );
            // Check if the output has a nested structure (like AI Agent outputs)
            for (const [nestedKey, nestedOutput] of Object.entries(output)) {
              this.logger.debug(
                `[TEMPLATE] Checking nested key: ${nestedKey}`,
                {
                  nestedKey,
                  nestedOutputType: typeof nestedOutput,
                  isObject:
                    typeof nestedOutput === 'object' && nestedOutput !== null,
                },
              );

              if (typeof nestedOutput === 'object' && nestedOutput !== null) {
                // Try to get the field from the nested output
                const nestedValue = this.getNestedValue(
                  nestedOutput,
                  fieldPath,
                );
                this.logger.debug(`[TEMPLATE] Nested value for ${fieldPath}:`, {
                  fieldPath,
                  nestedValue,
                  hasValue: nestedValue !== undefined,
                });

                if (nestedValue !== undefined) {
                  outputValue = nestedValue;
                  this.logger.debug(
                    `[TEMPLATE] Found value in nested ${nestedKey}.${fieldPath}:`,
                    {
                      value:
                        typeof outputValue === 'string'
                          ? outputValue.substring(0, 100) + '...'
                          : outputValue,
                    },
                  );
                  break;
                }

                // Also try common fields in the nested output
                const commonFields = ['response', 'result', 'output', 'data'];
                for (const field of commonFields) {
                  if (fieldPath === field) {
                    const fieldValue = this.getNestedValue(nestedOutput, field);
                    this.logger.debug(
                      `[TEMPLATE] Checking common field ${field}:`,
                      {
                        field,
                        fieldValue,
                        hasValue: fieldValue !== undefined,
                      },
                    );

                    if (fieldValue !== undefined) {
                      outputValue = fieldValue;
                      this.logger.debug(
                        `[TEMPLATE] Found value in nested ${nestedKey}.${field}:`,
                        {
                          value:
                            typeof outputValue === 'string'
                              ? outputValue.substring(0, 100) + '...'
                              : outputValue,
                        },
                      );
                      break;
                    }
                  }
                }
                if (outputValue !== undefined) break;
              }
            }
          }

          // If still not found, try nested access
          if (outputValue === undefined) {
            for (const field of ['response', 'result', 'output', 'data']) {
              const nestedValue = this.getNestedValue(output, field);
              if (nestedValue !== undefined) {
                outputValue = this.getNestedValue(nestedValue, fieldPath);
                if (outputValue !== undefined) {
                  this.logger.debug(
                    `[TEMPLATE] Found value in nested ${field}.${fieldPath}:`,
                    {
                      value:
                        typeof outputValue === 'string'
                          ? outputValue.substring(0, 100) + '...'
                          : outputValue,
                    },
                  );
                  break;
                }
              }
            }
          }

          if (outputValue !== undefined) {
            this.logger.debug(`[TEMPLATE] Returning value for {{${path}}}:`, {
              value:
                typeof outputValue === 'string'
                  ? outputValue.substring(0, 100) + '...'
                  : outputValue,
            });
            return this.formatValue(outputValue);
          }
        }
      }

      this.logger.debug(`[TEMPLATE] Final value for {{${path}}}:`, {
        value:
          typeof value === 'string' ? value.substring(0, 100) + '...' : value,
      });
      return this.formatValue(value);
    });

    // Process {{$now}} for current timestamp
    result = result.replace(/\{\{\$now\}\}/g, () => {
      return new Date().toISOString();
    });

    // Process {{$uuid}} for UUID generation
    result = result.replace(/\{\{\$uuid\}\}/g, () => {
      return this.generateUUID();
    });

    // Process {{$randomInt(min,max)}} for random integers
    result = result.replace(
      /\{\{\$randomInt\((\d+),(\d+)\)\}\}/g,
      (match, min, max) => {
        const minVal = parseInt(min, 10);
        const maxVal = parseInt(max, 10);
        return String(
          Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal,
        );
      },
    );

    // Process {{$randomFloat(min,max)}} for random floats
    result = result.replace(
      /\{\{\$randomFloat\(([^,]+),([^)]+)\)\}\}/g,
      (match, min, max) => {
        const minVal = parseFloat(min);
        const maxVal = parseFloat(max);
        return String((Math.random() * (maxVal - minVal) + minVal).toFixed(2));
      },
    );

    // Process {{$randomString(length)}} for random strings
    result = result.replace(
      /\{\{\$randomString\((\d+)\)\}\}/g,
      (match, length) => {
        return this.generateRandomString(parseInt(length, 10));
      },
    );

    // Process {{$formatDate(json.field, format)}} for date formatting
    result = result.replace(
      /\{\{\$formatDate\(([^,]+),\s*"([^"]+)"\)\}\}/g,
      (match, valuePath, format) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return this.formatDate(value, format);
      },
    );

    // Process {{$formatNumber(json.field, decimals)}} for number formatting
    result = result.replace(
      /\{\{\$formatNumber\(([^,]+),\s*(\d+)\)\}\}/g,
      (match, valuePath, decimals) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : parseFloat(valuePath);

        return this.formatNumber(value, parseInt(decimals, 10));
      },
    );

    // Process {{$formatCurrency(json.field, currency)}} for currency formatting
    result = result.replace(
      /\{\{\$formatCurrency\(([^,]+),\s*"([^"]+)"\)\}\}/g,
      (match, valuePath, currency) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : parseFloat(valuePath);

        return this.formatCurrency(value, currency);
      },
    );

    // Process {{$uppercase(json.field)}} for uppercase conversion
    result = result.replace(
      /\{\{\$uppercase\(([^)]+)\)\}\}/g,
      (match, valuePath) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return String(value).toUpperCase();
      },
    );

    // Process {{$lowercase(json.field)}} for lowercase conversion
    result = result.replace(
      /\{\{\$lowercase\(([^)]+)\)\}\}/g,
      (match, valuePath) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return String(value).toLowerCase();
      },
    );

    // Process {{$substring(json.field, start, end)}} for substring extraction
    result = result.replace(
      /\{\{\$substring\(([^,]+),\s*(\d+),\s*(\d+)\)\}\}/g,
      (match, valuePath, start, end) => {
        const value = valuePath.startsWith('json.')
          ? this.getNestedValue(data, valuePath.substring(5))
          : valuePath;

        return String(value).substring(parseInt(start, 10), parseInt(end, 10));
      },
    );

    // Process context variables if provided
    if (context) {
      result = result.replace(/\{\{ctx\.([^}]+)\}\}/g, (match, path) => {
        const value = this.getNestedValue(context, path);
        return this.formatValue(value);
      });
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation with array support
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || typeof obj !== 'object') return undefined;

    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        // Handle array access like "array[0]"
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, arrayKey, index] = arrayMatch;
          const array = current[arrayKey];
          if (Array.isArray(array)) {
            return array[parseInt(index, 10)];
          }
          return undefined;
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Format value for template output
   */
  private formatValue(value: any): string {
    this.logger.debug(`[TEMPLATE] Formatting value:`, {
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      value:
        typeof value === 'string' ? value.substring(0, 100) + '...' : value,
    });

    if (value === undefined || value === null) {
      this.logger.debug(
        `[TEMPLATE] Returning empty string for null/undefined value`,
      );
      return '';
    }

    if (typeof value === 'number') {
      const result = value.toString();
      this.logger.debug(`[TEMPLATE] Formatted number: ${result}`);
      return result;
    }

    if (typeof value === 'boolean') {
      const result = value.toString();
      this.logger.debug(`[TEMPLATE] Formatted boolean: ${result}`);
      return result;
    }

    if (value instanceof Date) {
      const result = value.toISOString();
      this.logger.debug(`[TEMPLATE] Formatted date: ${result}`);
      return result;
    }

    if (typeof value === 'object') {
      const result = JSON.stringify(value);
      this.logger.debug(
        `[TEMPLATE] Formatted object: ${result.substring(0, 100)}...`,
      );
      return result;
    }

    const result = String(value);
    this.logger.debug(
      `[TEMPLATE] Formatted string: ${result.substring(0, 100)}...`,
    );
    return result;
  }

  /**
   * Validate if a template string is valid
   */
  validate(template: string): boolean {
    try {
      // Check for balanced braces
      const openBraces = (template.match(/\{\{/g) || []).length;
      const closeBraces = (template.match(/\}\}/g) || []).length;

      if (openBraces !== closeBraces) {
        return false;
      }

      // Check for invalid expressions
      const expressions = template.match(/\{\{([^}]+)\}\}/g) || [];

      for (const expr of expressions) {
        const content = expr.slice(2, -2).trim();

        // Check for valid expression patterns
        if (!this.isValidExpression(content)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if an expression is valid
   */
  private isValidExpression(expr: string): boolean {
    // Valid patterns
    const validPatterns = [
      /^json\.[a-zA-Z0-9_.\[\]]+$/, // json.field or json.array[0]
      /^data\.[a-zA-Z0-9_.\[\]]+$/, // data.field (new)
      /^previousBlock\.[a-zA-Z0-9_.\[\]]+$/, // previousBlock.field (new)
      /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_.\[\]]+$/, // NodeId.field (new)
      /^[a-zA-Z0-9_.\[\]]+$/, // field or array[0]
      /^\$now$/, // $now
      /^\$uuid$/, // $uuid
      /^\$randomInt\(\d+,\d+\)$/, // $randomInt(1,100)
      /^\$randomFloat\([^,]+,[^)]+\)$/, // $randomFloat(1.0,100.0)
      /^\$randomString\(\d+\)$/, // $randomString(10)
      /^\$formatDate\([^,]+,"[^"]+"\)$/, // $formatDate(field,"YYYY-MM-DD")
      /^\$formatNumber\([^,]+,\d+\)$/, // $formatNumber(field,2)
      /^\$formatCurrency\([^,]+,"[^"]+"\)$/, // $formatCurrency(field,"USD")
      /^\$uppercase\([^)]+\)$/, // $uppercase(field)
      /^\$lowercase\([^)]+\)$/, // $lowercase(field)
      /^\$substring\([^,]+,\d+,\d+\)$/, // $substring(field,0,10)
      /^ctx\.[a-zA-Z0-9_.]+$/, // ctx.field
    ];

    return validPatterns.some((pattern) => pattern.test(expr));
  }

  /**
   * Extract all variables from a template string
   */
  getVariables(template: string): string[] {
    const variables: string[] = [];

    // Extract both {{}} and {} patterns
    const doubleExpressions = template.match(/\{\{([^}]+)\}\}/g) || [];
    const singleExpressions = template.match(/\{([^}]+)\}/g) || [];

    // Process {{}} expressions
    for (const expr of doubleExpressions) {
      const content = expr.slice(2, -2).trim();

      // Extract json.field variables
      if (content.startsWith('json.')) {
        variables.push(content);
      }

      // Extract context variables
      if (content.startsWith('ctx.')) {
        variables.push(content);
      }

      // Extract simple field variables (legacy)
      if (
        !content.startsWith('$') &&
        !content.startsWith('json.') &&
        !content.startsWith('ctx.')
      ) {
        variables.push(content);
      }
    }

    // Process {} expressions (new patterns)
    for (const expr of singleExpressions) {
      const content = expr.slice(1, -1).trim();

      // Skip double braces (already processed)
      if (expr.startsWith('{{')) continue;

      // Extract data.field variables
      if (content.startsWith('data.')) {
        variables.push(content);
      }

      // Extract previousBlock.field variables
      if (content.startsWith('previousBlock.')) {
        variables.push(content);
      }

      // Extract NodeId.field variables (if it contains a dot and isn't a special pattern)
      if (
        content.includes('.') &&
        !content.startsWith('data.') &&
        !content.startsWith('previousBlock.') &&
        !content.startsWith('json.') &&
        !content.startsWith('ctx.')
      ) {
        variables.push(content);
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Format date
   */
  private formatDate(value: any, format: string): string {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';

      // Simple date formatting
      switch (format) {
        case 'YYYY-MM-DD':
          return date.toISOString().split('T')[0];
        case 'MM/DD/YYYY':
          return date.toLocaleDateString('en-US');
        case 'DD/MM/YYYY':
          return date.toLocaleDateString('en-GB');
        default:
          return date.toISOString();
      }
    } catch {
      return '';
    }
  }

  /**
   * Format number
   */
  private formatNumber(value: any, decimals: number): string {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return '';
      return num.toFixed(decimals);
    } catch {
      return '';
    }
  }

  /**
   * Format currency
   */
  private formatCurrency(value: any, currency: string): string {
    try {
      const num = parseFloat(value);
      if (isNaN(num)) return '';

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(num);
    } catch {
      return '';
    }
  }
}
