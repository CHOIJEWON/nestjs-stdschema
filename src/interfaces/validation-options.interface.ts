import { HttpStatus, Type } from '@nestjs/common';
import { StandardSchemaV1 } from './standard-schema.interface';

/**
 * Allowed HTTP status codes for validation errors
 */
export type ErrorHttpStatusCode =
  | HttpStatus.BAD_REQUEST
  | HttpStatus.UNPROCESSABLE_ENTITY
  | HttpStatus.NOT_ACCEPTABLE
  | HttpStatus.NOT_FOUND
  | HttpStatus.FORBIDDEN
  | HttpStatus.UNAUTHORIZED;

/**
 * Options for StandardValidationPipe
 */
export interface StandardValidationPipeOptions {
  /**
   * HTTP status code for validation errors
   * @default HttpStatus.BAD_REQUEST (400)
   */
  errorHttpStatusCode?: ErrorHttpStatusCode;

  /**
   * Custom exception factory function
   * When provided, this function will be called with validation issues
   * to create a custom exception
   */
  exceptionFactory?: (issues: StandardSchemaV1.Issue[]) => unknown;

  /**
   * Whether to validate parameters from custom decorators
   * @default false
   */
  validateCustomDecorators?: boolean;

  /**
   * Expected type to use for validation
   * Overrides the type inferred from metadata
   */
  expectedType?: Type<unknown>;
}
