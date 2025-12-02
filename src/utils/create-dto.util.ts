import { Type } from '@nestjs/common';
import { InferOutput, StandardSchemaV1 } from '../interfaces';
import { OpenAPIMetadata, schemaToOpenAPI } from '../openapi';

/**
 * Options for createStandardDto
 */
export interface CreateStandardDtoOptions {
  /**
   * Manual OpenAPI metadata for validators that don't support toJSONSchema
   *
   * @example
   * createStandardDto(ValibotSchema, {
   *   openapi: {
   *     name: { type: 'string', example: 'John' },
   *     email: { type: 'string', format: 'email' }
   *   }
   * })
   */
  openapi?: OpenAPIMetadata;
}

/**
 * Interface for DTO classes created by createStandardDto
 */
export interface StandardDtoClass<
  TSchema extends StandardSchemaV1,
  TOutput = InferOutput<TSchema>,
> extends Type<TOutput> {
  /**
   * The schema used for validation
   */
  readonly schema: TSchema;

  /**
   * OpenAPI metadata factory for @nestjs/swagger integration
   * @internal Used by @nestjs/swagger to generate API documentation
   */
  _OPENAPI_METADATA_FACTORY(): Record<string, unknown>;
}

/**
 * Creates a DTO class from a Standard Schema
 *
 * The returned class:
 * - Has a static `schema` property for accessing the original schema
 * - Provides automatic type inference for instances
 * - Integrates with @nestjs/swagger via `_OPENAPI_METADATA_FACTORY`
 *
 * @example
 * // Basic usage (Zod v4 - automatic OpenAPI)
 * const UserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * class UserDto extends createStandardDto(UserSchema) {}
 *
 * // Type inference works automatically
 * const user: UserDto = { name: 'John', email: 'john@example.com' };
 *
 * // Access schema
 * UserDto.schema // => UserSchema
 *
 * @example
 * // With manual OpenAPI metadata (for validators without toJSONSchema)
 * class UserDto extends createStandardDto(ValibotSchema, {
 *   openapi: {
 *     name: { type: 'string', example: 'John' },
 *     email: { type: 'string', format: 'email' }
 *   }
 * }) {}
 */
export function createStandardDto<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  options?: CreateStandardDtoOptions,
): StandardDtoClass<TSchema> {
  const manualOpenAPI = options?.openapi;

  abstract class StandardDto {
    static readonly schema = schema;

    static _OPENAPI_METADATA_FACTORY(): Record<string, unknown> {
      return schemaToOpenAPI(schema, manualOpenAPI);
    }
  }

  return StandardDto as StandardDtoClass<TSchema>;
}
