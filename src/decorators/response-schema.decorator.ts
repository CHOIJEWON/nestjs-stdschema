import { SetMetadata, Type } from '@nestjs/common';
import { RESPONSE_SCHEMA_METADATA_KEY } from '../constants';

/**
 * Response schema metadata structure
 */
export interface ResponseSchemaMetadata {
  type: Type<unknown>;
  isArray: boolean;
}

/**
 * Method decorator that specifies the response schema for serialization
 *
 * Use with `StandardSerializerInterceptor` to automatically filter
 * response data based on the schema.
 *
 * @example
 * // Single object response
 * @Get(':id')
 * @ResponseSchema(UserResponseDto)
 * findOne(@Param('id') id: string) {
 *   return this.userService.findOne(id);
 * }
 *
 * @example
 * // Array response
 * @Get()
 * @ResponseSchema([UserResponseDto])
 * findAll() {
 *   return this.userService.findAll();
 * }
 */
export function ResponseSchema(
  dto: Type<unknown> | [Type<unknown>],
): MethodDecorator {
  const isArray = Array.isArray(dto);
  const type = isArray ? dto[0] : dto;

  const metadata: ResponseSchemaMetadata = { type, isArray };

  return SetMetadata(RESPONSE_SCHEMA_METADATA_KEY, metadata);
}
