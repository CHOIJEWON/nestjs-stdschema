import { StandardSchemaV1 } from '../interfaces';

/**
 * OpenAPI Schema Object (subset of OpenAPI 3.0 specification)
 * Used by @nestjs/swagger for property-level metadata
 */
export interface OpenAPISchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchemaObject>;
  items?: OpenAPISchemaObject;
  required?: boolean;
  enum?: unknown[];
  nullable?: boolean;
  description?: string;
  example?: unknown;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  [key: string]: unknown;
}

/**
 * Options for manual OpenAPI metadata
 */
export type OpenAPIMetadata = Record<string, OpenAPISchemaObject>;

/**
 * Interface for schemas that support toJSONSchema (e.g., Zod v4)
 */
interface SchemaWithJsonSchema {
  toJSONSchema?: (options?: { target?: string }) => Record<string, unknown>;
}

/**
 * Converts a Standard Schema to OpenAPI metadata format
 *
 * This function attempts to:
 * 1. Use native toJSONSchema if available (Zod v4+)
 * 2. Fall back to manual metadata if provided
 * 3. Return empty object if no conversion is possible
 *
 * @param schema - The Standard Schema to convert
 * @param manualMetadata - Optional manual OpenAPI metadata as fallback
 * @returns OpenAPI metadata compatible with @nestjs/swagger
 *
 * @example
 * // With Zod v4 (automatic)
 * const schema = z.object({ name: z.string() });
 * schemaToOpenAPI(schema);
 * // => { name: { type: 'string' } }
 *
 * @example
 * // With manual metadata (fallback)
 * schemaToOpenAPI(schema, {
 *   name: { type: 'string', example: 'John' }
 * });
 */
export function schemaToOpenAPI(
  schema: StandardSchemaV1,
  manualMetadata?: OpenAPIMetadata,
): OpenAPIMetadata {
  // Try native JSON Schema conversion (Zod v4+)
  const jsonSchema = tryNativeJsonSchema(schema);
  if (jsonSchema) {
    return convertJsonSchemaToOpenAPI(jsonSchema);
  }

  // Use manual metadata if provided
  if (manualMetadata) {
    return manualMetadata;
  }

  // No conversion available
  return {};
}

/**
 * Attempts to use native toJSONSchema method if available
 */
function tryNativeJsonSchema(
  schema: StandardSchemaV1,
): Record<string, unknown> | null {
  const schemaWithJson = schema as unknown as SchemaWithJsonSchema;

  if (typeof schemaWithJson.toJSONSchema === 'function') {
    try {
      return schemaWithJson.toJSONSchema({ target: 'openapi-3.0' });
    } catch {
      // Fallback if toJSONSchema fails
      return null;
    }
  }

  return null;
}

/**
 * Converts JSON Schema to @nestjs/swagger OpenAPI metadata format
 *
 * @nestjs/swagger expects a flat object where keys are property names
 * and values are OpenAPI schema objects
 */
function convertJsonSchemaToOpenAPI(
  jsonSchema: Record<string, unknown>,
): OpenAPIMetadata {
  const properties = jsonSchema.properties as
    | Record<string, OpenAPISchemaObject>
    | undefined;

  if (!properties) {
    return {};
  }

  const required = (jsonSchema.required as string[]) ?? [];
  const result: OpenAPIMetadata = {};

  for (const [key, value] of Object.entries(properties)) {
    result[key] = {
      ...value,
      required: required.includes(key),
    };
  }

  return result;
}
