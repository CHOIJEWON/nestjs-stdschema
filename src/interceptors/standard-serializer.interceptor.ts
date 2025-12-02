import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_SCHEMA_METADATA_KEY } from '../constants';
import { ResponseSchemaMetadata } from '../decorators';
import { StandardSchemaV1 } from '../interfaces';

/**
 * Interceptor that serializes responses using Standard Schema
 *
 * This interceptor:
 * - Filters response data based on the schema (strips undefined fields)
 * - Validates response data and throws InternalServerError on failure
 *   (prevents data leakage from invalid responses)
 *
 * @example
 * // Controller-level usage
 * @Controller('users')
 * @UseInterceptors(StandardSerializerInterceptor)
 * export class UsersController {
 *   @Get(':id')
 *   @ResponseSchema(UserResponseDto)
 *   findOne(@Param('id') id: string) {
 *     // Even if service returns extra fields, only schema fields are sent
 *     return this.userService.findOne(id);
 *   }
 * }
 *
 * @example
 * // Global usage
 * app.useGlobalInterceptors(new StandardSerializerInterceptor(new Reflector()));
 */
@Injectable()
export class StandardSerializerInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.getResponseSchemaMetadata(context);

    if (!metadata) {
      return next.handle();
    }

    const schema = this.getSchemaFromType(metadata.type);

    if (!schema) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (metadata.isArray && Array.isArray(data)) {
          return data.map((item) => this.serialize(item, schema));
        }
        return this.serialize(data, schema);
      }),
    );
  }

  private getResponseSchemaMetadata(
    context: ExecutionContext,
  ): ResponseSchemaMetadata | undefined {
    return this.reflector.get<ResponseSchemaMetadata>(
      RESPONSE_SCHEMA_METADATA_KEY,
      context.getHandler(),
    );
  }

  private getSchemaFromType(type: object): StandardSchemaV1 | undefined {
    const typeWithSchema = type as { schema?: StandardSchemaV1 };
    return typeWithSchema.schema;
  }

  private serialize(data: unknown, schema: StandardSchemaV1): unknown {
    const result = schema['~standard'].validate(data);

    // Handle both sync and async validation
    if (result instanceof Promise) {
      return result.then((resolved) => this.handleResult(resolved));
    }

    return this.handleResult(result);
  }

  private handleResult(result: StandardSchemaV1.Result<unknown>): unknown {
    if ('issues' in result && result.issues) {
      // Log the validation error for debugging
      // but don't expose internal details to the client
      throw new InternalServerErrorException(
        'Response validation failed. This is a server-side error.',
      );
    }

    return result.value;
  }
}
