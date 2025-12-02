import { BadRequestException, HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import {
  StandardValidationPipe,
  createStandardDto,
  Schema,
} from '../../src';

describe('StandardValidationPipe', () => {
  describe('with Zod schema', () => {
    const UserSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().optional(),
    });

    it('should pass valid data', async () => {
      const pipe = new StandardValidationPipe(UserSchema);
      const validData = { name: 'John', email: 'john@example.com' };

      const result = await pipe.transform(validData, { type: 'body' });

      expect(result).toEqual(validData);
    });

    it('should pass valid data with optional fields', async () => {
      const pipe = new StandardValidationPipe(UserSchema);
      const validData = { name: 'John', email: 'john@example.com', age: 25 };

      const result = await pipe.transform(validData, { type: 'body' });

      expect(result).toEqual(validData);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const pipe = new StandardValidationPipe(UserSchema);
      const invalidData = { name: '', email: 'invalid-email' };

      await expect(pipe.transform(invalidData, { type: 'body' })).rejects.toThrow();
    });

    it('should include validation errors in exception response', async () => {
      const pipe = new StandardValidationPipe(UserSchema);
      const invalidData = { name: '', email: 'invalid-email' };

      try {
        await pipe.transform(invalidData, { type: 'body' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(response.message).toBe('Validation failed');
        expect(response.errors).toBeDefined();
        expect(response.errors.length).toBeGreaterThan(0);
      }
    });

    it('should use custom errorHttpStatusCode', async () => {
      const pipe = new StandardValidationPipe(UserSchema, {
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      });
      const invalidData = { name: '', email: 'invalid-email' };

      try {
        await pipe.transform(invalidData, { type: 'body' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      }
    });

    it('should use custom exceptionFactory', async () => {
      const customMessage = 'Custom validation error';
      const pipe = new StandardValidationPipe(UserSchema, {
        exceptionFactory: () => new BadRequestException(customMessage),
      });
      const invalidData = { name: '', email: 'invalid-email' };

      try {
        await pipe.transform(invalidData, { type: 'body' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toBe(customMessage);
      }
    });
  });

  describe('with Valibot schema', () => {
    const UserSchema = v.object({
      name: v.pipe(v.string(), v.minLength(1)),
      email: v.pipe(v.string(), v.email()),
    });

    it('should pass valid data', async () => {
      const pipe = new StandardValidationPipe(UserSchema);
      const validData = { name: 'John', email: 'john@example.com' };

      const result = await pipe.transform(validData, { type: 'body' });

      expect(result).toEqual(validData);
    });

    it('should throw for invalid data', async () => {
      const pipe = new StandardValidationPipe(UserSchema);
      const invalidData = { name: '', email: 'invalid' };

      await expect(pipe.transform(invalidData, { type: 'body' })).rejects.toThrow();
    });
  });

  describe('with createStandardDto', () => {
    const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    class UserDto extends createStandardDto(UserSchema) {}

    it('should get schema from DTO class', async () => {
      const pipe = new StandardValidationPipe();
      const validData = { name: 'John', email: 'john@example.com' };

      const result = await pipe.transform(validData, {
        type: 'body',
        metatype: UserDto,
      });

      expect(result).toEqual(validData);
    });

    it('should validate using DTO schema', async () => {
      const pipe = new StandardValidationPipe();
      const invalidData = { name: 'John', email: 'invalid' };

      await expect(
        pipe.transform(invalidData, { type: 'body', metatype: UserDto }),
      ).rejects.toThrow();
    });
  });

  describe('with @Schema decorator', () => {
    const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    @Schema(UserSchema)
    class UserDto {
      name!: string;
      email!: string;
    }

    it('should get schema from decorator metadata', async () => {
      const pipe = new StandardValidationPipe();
      const validData = { name: 'John', email: 'john@example.com' };

      const result = await pipe.transform(validData, {
        type: 'body',
        metatype: UserDto,
      });

      expect(result).toEqual(validData);
    });
  });

  describe('without schema', () => {
    it('should pass through primitive types', async () => {
      const pipe = new StandardValidationPipe();
      const value = 'test string';

      const result = await pipe.transform(value, {
        type: 'body',
        metatype: String,
      });

      expect(result).toBe(value);
    });

    it('should pass through when no metatype provided', async () => {
      const pipe = new StandardValidationPipe();
      const value = { any: 'data' };

      const result = await pipe.transform(value, { type: 'body' });

      expect(result).toEqual(value);
    });
  });

  describe('async validation', () => {
    it('should handle async validators', async () => {
      // Create a mock async schema
      const asyncSchema = {
        '~standard': {
          version: 1 as const,
          vendor: 'test',
          validate: async (value: unknown) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            if (typeof value === 'object' && value !== null && 'name' in value) {
              return { value };
            }
            return { issues: [{ message: 'Invalid' }] };
          },
        },
      };

      const pipe = new StandardValidationPipe(asyncSchema);
      const validData = { name: 'John' };

      const result = await pipe.transform(validData, { type: 'body' });

      expect(result).toEqual(validData);
    });
  });

  describe('validateCustomDecorators option', () => {
    const UserSchema = z.object({
      name: z.string(),
    });

    class UserDto extends createStandardDto(UserSchema) {}

    it('should skip validation for custom decorator by default', async () => {
      const pipe = new StandardValidationPipe();
      const invalidData = { invalid: 'data' };

      // With type: 'custom', validation should be skipped by default
      const result = await pipe.transform(invalidData, {
        type: 'custom',
        metatype: UserDto,
      });

      expect(result).toEqual(invalidData);
    });

    it('should validate custom decorator when validateCustomDecorators is true', async () => {
      const pipe = new StandardValidationPipe({
        validateCustomDecorators: true,
      });
      const invalidData = { invalid: 'data' };

      await expect(
        pipe.transform(invalidData, {
          type: 'custom',
          metatype: UserDto,
        }),
      ).rejects.toThrow();
    });

    it('should pass valid data for custom decorator when validateCustomDecorators is true', async () => {
      const pipe = new StandardValidationPipe({
        validateCustomDecorators: true,
      });
      const validData = { name: 'John' };

      const result = await pipe.transform(validData, {
        type: 'custom',
        metatype: UserDto,
      });

      expect(result).toEqual(validData);
    });
  });

  describe('PathSegment normalization', () => {
    it('should normalize PathSegment objects in error path', async () => {
      // Create a schema that returns PathSegment objects in issues
      const schemaWithPathSegment = {
        '~standard': {
          version: 1 as const,
          vendor: 'test',
          validate: () => ({
            issues: [
              {
                message: 'Invalid field',
                path: [
                  { key: 'user' }, // PathSegment object
                  'profile', // PropertyKey (string)
                  { key: 'email' }, // PathSegment object
                ],
              },
            ],
          }),
        },
      };

      const pipe = new StandardValidationPipe(schemaWithPathSegment);

      try {
        await pipe.transform({}, { type: 'body' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        // Path should be normalized to PropertyKey[]
        expect(response.errors[0].path).toEqual(['user', 'profile', 'email']);
      }
    });

    it('should handle mixed path with numbers and PathSegments', async () => {
      const schemaWithMixedPath = {
        '~standard': {
          version: 1 as const,
          vendor: 'test',
          validate: () => ({
            issues: [
              {
                message: 'Invalid item',
                path: [
                  'items',
                  0, // number index
                  { key: 'name' }, // PathSegment
                ],
              },
            ],
          }),
        },
      };

      const pipe = new StandardValidationPipe(schemaWithMixedPath);

      try {
        await pipe.transform({}, { type: 'body' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.errors[0].path).toEqual(['items', 0, 'name']);
      }
    });

    it('should handle empty path', async () => {
      const schemaWithEmptyPath = {
        '~standard': {
          version: 1 as const,
          vendor: 'test',
          validate: () => ({
            issues: [{ message: 'Root level error' }],
          }),
        },
      };

      const pipe = new StandardValidationPipe(schemaWithEmptyPath);

      try {
        await pipe.transform({}, { type: 'body' });
        expect.fail('Should have thrown');
      } catch (error: any) {
        const response = error.getResponse();
        expect(response.errors[0].path).toEqual([]);
      }
    });
  });
});
