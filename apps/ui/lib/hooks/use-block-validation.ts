"use client";

import { useCallback, useMemo } from "react";
import { z } from "zod";
import { getEnhancedBlockSchema, BlockType } from "@zyra/types";

interface ValidationError {
  path: string[];
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Dynamic block validation hook that uses Zod schemas automatically
 */
export function useBlockValidation(blockType: BlockType) {
  // Get the enhanced schema for the block type
  const enhancedSchema = useMemo(() => {
    return getEnhancedBlockSchema(blockType);
  }, [blockType]);

  // Dynamic validation function that uses the schema
  const validateConfig = useCallback(
    (config: Record<string, unknown>): ValidationResult => {
      const errors: ValidationError[] = [];
      const warnings: string[] = [];

      if (!enhancedSchema) {
        // No schema available - assume valid for backward compatibility
        return { isValid: true, errors: [], warnings: [] };
      }

      try {
        // Use Zod to validate against the schema
        enhancedSchema.configSchema.parse(config);
        return { isValid: true, errors: [], warnings: [] };
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Convert Zod errors to our format
          errors.push(
            ...error.errors.map((err) => ({
              path: err.path.map(String),
              message: err.message,
            }))
          );
        } else {
          errors.push({
            path: [],
            message: error instanceof Error ? error.message : "Validation failed",
          });
        }
      }

      return { isValid: errors.length === 0, errors, warnings };
    },
    [enhancedSchema]
  );

  // Get field-specific validation error
  const getFieldError = useCallback(
    (fieldName: string, config: Record<string, unknown>): string | undefined => {
      const result = validateConfig(config);
      const fieldError = result.errors.find((err) =>
        err.path.includes(fieldName)
      );
      return fieldError?.message;
    },
    [validateConfig]
  );

  // Check if a field is required based on the schema
  const isFieldRequired = useCallback(
    (fieldName: string): boolean => {
      if (!enhancedSchema) return false;

      try {
        // Try to parse the schema to see if the field is required
        const shape = enhancedSchema.configSchema.shape;
        const fieldSchema = shape[fieldName];
        
        if (!fieldSchema) return false;

        // Check if the field is optional
        if (fieldSchema instanceof z.ZodOptional) {
          return false;
        }

        // For union types, check if any variant is optional
        if (fieldSchema instanceof z.ZodUnion) {
          return !fieldSchema.options.some((option: z.ZodTypeAny) => option instanceof z.ZodOptional);
        }

        // For other types, assume required unless it's explicitly optional
        return true;
      } catch {
        return false;
      }
    },
    [enhancedSchema]
  );

  // Get all required fields for the current block type
  const getRequiredFields = useCallback((): string[] => {
    if (!enhancedSchema) return [];

    const requiredFields: string[] = [];
    const shape = enhancedSchema.configSchema.shape;

    Object.keys(shape).forEach((fieldName) => {
      if (isFieldRequired(fieldName)) {
        requiredFields.push(fieldName);
      }
    });

    return requiredFields;
  }, [enhancedSchema, isFieldRequired]);

  return {
    validateConfig,
    getFieldError,
    isFieldRequired,
    getRequiredFields,
    hasSchema: !!enhancedSchema,
  };
} 