"use client";

import { useCallback, useMemo } from "react";
import { z } from "zod";
import { getEnhancedBlockSchema, BlockType } from "@zzyra/types";

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
        // Use Zod 4's safeParse for better error handling
        const result = enhancedSchema.configSchema.safeParse(config);
        
        if (result.success) {
          return { isValid: true, errors: [], warnings: [] };
        } else {
          // Convert Zod errors to our format
          errors.push(
            ...result.error.issues.map((err: any) => ({
              path: err.path.map(String),
              message: err.message,
            }))
          );
        }
      } catch (error) {
        errors.push({
          path: [],
          message: error instanceof Error ? error.message : "Validation failed",
        });
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

  // Check if a field is required based on the schema and current config
  const isFieldRequired = useCallback(
    (fieldName: string, config?: Record<string, unknown>): boolean => {
      if (!enhancedSchema) return false;

      // For discriminated unions, we need to check based on the current config
      const schemaDef = enhancedSchema.configSchema._def as any;
      if (schemaDef.typeName === "ZodDiscriminatedUnion") {
        if (!config) return false;
        
        const discriminator = schemaDef.discriminator;
        const discriminatorValue = config[discriminator];
        
        if (!discriminatorValue) return false;
        
        // Find the matching union option
        const options = schemaDef.options;
        const matchingOption = options.find((option: z.ZodTypeAny) => {
          if (option instanceof z.ZodObject) {
            const shape = option.shape;
            const discriminatorField = shape[discriminator];
            return discriminatorField && discriminatorField._def.value === discriminatorValue;
          }
          return false;
        });
        
        if (matchingOption && matchingOption instanceof z.ZodObject) {
          const shape = matchingOption.shape;
          const fieldSchema = shape[fieldName];
          
          if (!fieldSchema) return false;
          
          // Check if the field is optional
          if (fieldSchema instanceof z.ZodOptional) {
            return false;
          }
          
          return true;
        }
        
        return false;
      }

      try {
        // Try to parse the schema to see if the field is required
        const schema = enhancedSchema.configSchema as z.ZodObject<any>;
        const shape = schema.shape;
        const fieldSchema = shape[fieldName];
        
        if (!fieldSchema) return false;

        // Check if the field is optional
        if (fieldSchema instanceof z.ZodOptional) {
          return false;
        }

        // For union types, check if any variant is optional
        if (fieldSchema instanceof z.ZodUnion) {
          return !fieldSchema.options.some((option: any) => option instanceof z.ZodOptional);
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
  const getRequiredFields = useCallback((config?: Record<string, unknown>): string[] => {
    if (!enhancedSchema) return [];

    const requiredFields: string[] = [];
    
    // For discriminated unions, we need to check based on the current config
    const schemaDef = enhancedSchema.configSchema._def as any;
    if (schemaDef.typeName === "ZodDiscriminatedUnion") {
      if (!config) return [];
      
      const discriminator = schemaDef.discriminator;
      const discriminatorValue = config[discriminator];
      
      if (!discriminatorValue) return [];
      
      // Find the matching union option
      const options = schemaDef.options;
      const matchingOption = options.find((option: z.ZodTypeAny) => {
        if (option instanceof z.ZodObject) {
          const shape = option.shape;
          const discriminatorField = shape[discriminator];
          return discriminatorField && discriminatorField._def.value === discriminatorValue;
        }
        return false;
      });
      
      if (matchingOption && matchingOption instanceof z.ZodObject) {
        const shape = matchingOption.shape;
        Object.keys(shape).forEach((fieldName) => {
          if (isFieldRequired(fieldName, config)) {
            requiredFields.push(fieldName);
          }
        });
      }
    } else {
      const schema = enhancedSchema.configSchema as z.ZodObject<any>;
      const shape = schema.shape;
      Object.keys(shape).forEach((fieldName) => {
        if (isFieldRequired(fieldName, config)) {
          requiredFields.push(fieldName);
        }
      });
    }

    return requiredFields;
  }, [enhancedSchema, isFieldRequired]);

  // Clean config to match the discriminated union schema
  const cleanConfigForDiscriminatedUnion = useCallback(
    (config: Record<string, unknown>): Record<string, unknown> => {
      if (!enhancedSchema) return config;

      const schemaDef = enhancedSchema.configSchema._def as any;
      if (schemaDef.typeName !== "ZodDiscriminatedUnion") {
        return config;
      }

      const discriminator = schemaDef.discriminator;
      const discriminatorValue = config[discriminator];

      if (!discriminatorValue) {
        // Default to first option if no discriminator value
        const firstOption = schemaDef.options[0];
        if (firstOption instanceof z.ZodObject) {
          const shape = firstOption.shape;
          const baseConfig = { [discriminator]: Object.keys(shape)[0] };
          return { ...baseConfig, ...config };
        }
        return config;
      }

      // Find the matching union option
      const options = schemaDef.options;
      const matchingOption = options.find((option: z.ZodTypeAny) => {
        if (option instanceof z.ZodObject) {
          const shape = (option as z.ZodObject<any>).shape;
          const discriminatorField = shape[discriminator];
          return discriminatorField && discriminatorField._def.value === discriminatorValue;
        }
        return false;
      });

      if (matchingOption && matchingOption instanceof z.ZodObject) {
        const shape = (matchingOption as z.ZodObject<any>).shape;
        const cleanConfig: Record<string, unknown> = { [discriminator]: discriminatorValue };

        // Only include fields that are part of this schema variant
        Object.keys(shape).forEach((fieldName) => {
          if (config[fieldName] !== undefined) {
            cleanConfig[fieldName] = config[fieldName];
          }
        });

        return cleanConfig;
      }

      return config;
    },
    [enhancedSchema]
  );



  // Get JSON Schema representation for the current config
  const getJSONSchema = useCallback(
    (config?: Record<string, unknown>) => {
      if (!enhancedSchema) return null;

      try {
        // If we have a specific config, try to get the relevant schema variant
        if (config) {
          const cleanConfig = cleanConfigForDiscriminatedUnion(config);
          const schemaDef = enhancedSchema.configSchema._def as any;
          
          if (schemaDef.typeName === "ZodDiscriminatedUnion") {
            const discriminator = schemaDef.discriminator;
            const discriminatorValue = cleanConfig[discriminator];
            
            if (discriminatorValue) {
              // Find the matching union option
              const options = schemaDef.options;
              const matchingOption = options.find((option: any) => {
                if (option instanceof z.ZodObject) {
                  const shape = (option as z.ZodObject<any>).shape;
                  const discriminatorField = shape[discriminator];
                  return discriminatorField && discriminatorField._def.value === discriminatorValue;
                }
                return false;
              });

              if (matchingOption) {
                return z.toJSONSchema(matchingOption);
              }
            }
          }
        }

        // Fallback to full schema
        return z.toJSONSchema(enhancedSchema.configSchema);
      } catch (error) {
        console.warn('Failed to generate JSON Schema:', error);
        return null;
      }
    },
    [enhancedSchema, cleanConfigForDiscriminatedUnion]
  );

  return {
    validateConfig,
    getFieldError,
    isFieldRequired,
    getRequiredFields,
    cleanConfigForDiscriminatedUnion,
    getJSONSchema,
    hasSchema: !!enhancedSchema,
  };
} 