import { SCHEMA_METADATA_KEY } from '../constants';
import { StandardSchemaV1 } from '../interfaces';

/**
 * Class decorator that attaches a Standard Schema to a DTO class
 *
 * Use this decorator when you need to add schema validation to an existing class.
 * For new DTOs, prefer using `createStandardDto()` instead.
 *
 * @example
 * const CreateUserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * @Schema(CreateUserSchema)
 * class CreateUserDto {
 *   name: string;
 *   email: string;
 * }
 */
export function Schema(schema: StandardSchemaV1): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SCHEMA_METADATA_KEY, schema, target);
  };
}

/**
 * Retrieves the schema from a DTO class
 *
 * This function checks both:
 * - Static `schema` property (from `createStandardDto`)
 * - Metadata from `@Schema()` decorator
 *
 * @example
 * const schema = getSchema(UserDto);
 * if (schema) {
 *   const result = schema['~standard'].validate(data);
 * }
 */
export function getSchema<T extends StandardSchemaV1 = StandardSchemaV1>(
  target: object,
): T | undefined {
  // Check for static schema property (from createStandardDto)
  const targetWithSchema = target as { schema?: T };
  if (targetWithSchema.schema) {
    return targetWithSchema.schema;
  }

  // Check for @Schema decorator metadata
  return Reflect.getMetadata(SCHEMA_METADATA_KEY, target);
}
