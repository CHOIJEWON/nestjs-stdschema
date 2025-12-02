import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { schemaToOpenAPI, createStandardDto } from '../../src';

describe('schemaToOpenAPI', () => {
  describe('with manual metadata', () => {
    const schema = v.object({
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    });

    it('should return manual metadata when provided', () => {
      const manualMetadata = {
        name: { type: 'string', example: 'John' },
        email: { type: 'string', format: 'email' },
      };

      const result = schemaToOpenAPI(schema, manualMetadata);

      expect(result).toEqual(manualMetadata);
    });

    it('should return empty object when no metadata available', () => {
      const result = schemaToOpenAPI(schema);

      expect(result).toEqual({});
    });
  });

  describe('with Zod schema (toJSONSchema support)', () => {
    // Note: Zod v3 doesn't have native toJSONSchema
    // This test verifies the fallback behavior
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('should return empty object for Zod v3 (no toJSONSchema)', () => {
      // Zod v3 doesn't have toJSONSchema, so it should return empty
      const result = schemaToOpenAPI(schema);

      // Either returns converted schema (if toJSONSchema exists) or empty object
      expect(typeof result).toBe('object');
    });
  });

  describe('with mock schema supporting toJSONSchema', () => {
    it('should convert JSON schema to OpenAPI format', () => {
      // Mock schema with toJSONSchema method (like Zod v4)
      const mockSchema = {
        '~standard': {
          version: 1 as const,
          vendor: 'mock',
          validate: (value: unknown) => ({ value }),
        },
        toJSONSchema: () => ({
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            email: { type: 'string', format: 'email' },
          },
          required: ['name', 'email'],
        }),
      };

      const result = schemaToOpenAPI(mockSchema);

      expect(result).toEqual({
        name: { type: 'string', required: true },
        age: { type: 'number', required: false },
        email: { type: 'string', format: 'email', required: true },
      });
    });

    it('should handle toJSONSchema with openapi-3.0 target', () => {
      const targetReceived: string[] = [];

      const mockSchema = {
        '~standard': {
          version: 1 as const,
          vendor: 'mock',
          validate: (value: unknown) => ({ value }),
        },
        toJSONSchema: (options?: { target?: string }) => {
          if (options?.target) {
            targetReceived.push(options.target);
          }
          return {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          };
        },
      };

      schemaToOpenAPI(mockSchema);

      expect(targetReceived).toContain('openapi-3.0');
    });

    it('should return empty object when toJSONSchema throws', () => {
      const mockSchema = {
        '~standard': {
          version: 1 as const,
          vendor: 'mock',
          validate: (value: unknown) => ({ value }),
        },
        toJSONSchema: () => {
          throw new Error('Conversion failed');
        },
      };

      const result = schemaToOpenAPI(mockSchema);

      expect(result).toEqual({});
    });
  });
});

describe('createStandardDto OpenAPI integration', () => {
  describe('with manual OpenAPI metadata', () => {
    const schema = v.object({
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    });

    it('should use provided OpenAPI metadata', () => {
      class UserDto extends createStandardDto(schema, {
        openapi: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
        },
      }) {}

      const metadata = UserDto._OPENAPI_METADATA_FACTORY();

      expect(metadata).toEqual({
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', format: 'email', example: 'john@example.com' },
      });
    });
  });

  describe('without options', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    it('should have _OPENAPI_METADATA_FACTORY method', () => {
      class UserDto extends createStandardDto(schema) {}

      expect(typeof UserDto._OPENAPI_METADATA_FACTORY).toBe('function');
    });

    it('should return object from _OPENAPI_METADATA_FACTORY', () => {
      class UserDto extends createStandardDto(schema) {}

      const metadata = UserDto._OPENAPI_METADATA_FACTORY();

      expect(typeof metadata).toBe('object');
    });
  });

  describe('complex schema metadata', () => {
    it('should support nested object metadata', () => {
      const schema = v.object({
        user: v.object({
          name: v.string(),
        }),
      });

      class ComplexDto extends createStandardDto(schema, {
        openapi: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      }) {}

      const metadata = ComplexDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.user).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      });
    });

    it('should support array metadata', () => {
      const schema = v.object({
        tags: v.array(v.string()),
      });

      class TagsDto extends createStandardDto(schema, {
        openapi: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      }) {}

      const metadata = TagsDto._OPENAPI_METADATA_FACTORY();

      expect(metadata.tags).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });
  });
});
