import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { StandardValidationPipe, createStandardDto } from '../../src';

describe('Zod Integration', () => {
  describe('primitive types', () => {
    it('should work with z.string()', async () => {
      const schema = z.string();
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('hello', { type: 'body' });

      expect(result).toBe('hello');
    });

    it('should work with z.number()', async () => {
      const schema = z.number();
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(42, { type: 'body' });

      expect(result).toBe(42);
    });

    it('should work with z.boolean()', async () => {
      const schema = z.boolean();
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(true, { type: 'body' });

      expect(result).toBe(true);
    });

    it('should reject invalid primitive', async () => {
      const schema = z.string();
      const pipe = new StandardValidationPipe(schema);

      await expect(pipe.transform(123, { type: 'body' })).rejects.toThrow();
    });
  });

  describe('object types', () => {
    it('should work with z.object()', async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(
        { name: 'John', age: 30 },
        { type: 'body' },
      );

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should work with nested objects', async () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          address: z.object({
            city: z.string(),
          }),
        }),
      });
      const pipe = new StandardValidationPipe(schema);

      const input = {
        user: {
          name: 'John',
          address: { city: 'Seoul' },
        },
      };

      const result = await pipe.transform(input, { type: 'body' });

      expect(result).toEqual(input);
    });

    it('should work with optional fields', async () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(
        { required: 'value' },
        { type: 'body' },
      );

      expect(result).toEqual({ required: 'value' });
    });

    it('should work with nullable fields', async () => {
      const schema = z.object({
        value: z.string().nullable(),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform({ value: null }, { type: 'body' });

      expect(result).toEqual({ value: null });
    });
  });

  describe('array types', () => {
    it('should work with z.array()', async () => {
      const schema = z.array(z.number());
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform([1, 2, 3], { type: 'body' });

      expect(result).toEqual([1, 2, 3]);
    });

    it('should work with array of objects', async () => {
      const schema = z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      );
      const pipe = new StandardValidationPipe(schema);

      const input = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const result = await pipe.transform(input, { type: 'body' });

      expect(result).toEqual(input);
    });

    it('should reject invalid array item', async () => {
      const schema = z.array(z.number());
      const pipe = new StandardValidationPipe(schema);

      await expect(
        pipe.transform([1, 'invalid', 3], { type: 'body' }),
      ).rejects.toThrow();
    });
  });

  describe('validation constraints', () => {
    it('should work with string constraints', async () => {
      const schema = z.object({
        email: z.string().email(),
        url: z.string().url(),
        uuid: z.string().uuid(),
      });
      const pipe = new StandardValidationPipe(schema);

      const input = {
        email: 'test@example.com',
        url: 'https://example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = await pipe.transform(input, { type: 'body' });

      expect(result).toEqual(input);
    });

    it('should work with number constraints', async () => {
      const schema = z.object({
        positive: z.number().positive(),
        min: z.number().min(10),
        max: z.number().max(100),
      });
      const pipe = new StandardValidationPipe(schema);

      const input = { positive: 5, min: 15, max: 50 };

      const result = await pipe.transform(input, { type: 'body' });

      expect(result).toEqual(input);
    });

    it('should reject invalid constraints', async () => {
      const schema = z.string().email();
      const pipe = new StandardValidationPipe(schema);

      await expect(
        pipe.transform('not-an-email', { type: 'body' }),
      ).rejects.toThrow();
    });
  });

  describe('transformations', () => {
    it('should work with z.coerce.date()', async () => {
      const schema = z.object({
        date: z.coerce.date(),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(
        { date: '2024-01-15' },
        { type: 'body' },
      );

      expect(result.date).toBeInstanceOf(Date);
    });

    it('should work with z.coerce.number()', async () => {
      const schema = z.object({
        count: z.coerce.number(),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform({ count: '42' }, { type: 'body' });

      expect(result.count).toBe(42);
    });

    it('should work with z.transform()', async () => {
      const schema = z.string().transform((val) => val.toUpperCase());
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('hello', { type: 'body' });

      expect(result).toBe('HELLO');
    });
  });

  describe('enum types', () => {
    it('should work with z.enum()', async () => {
      const schema = z.enum(['admin', 'user', 'guest']);
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('admin', { type: 'body' });

      expect(result).toBe('admin');
    });

    it('should work with z.nativeEnum()', async () => {
      enum Role {
        Admin = 'admin',
        User = 'user',
      }
      const schema = z.nativeEnum(Role);
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('admin', { type: 'body' });

      expect(result).toBe(Role.Admin);
    });

    it('should reject invalid enum value', async () => {
      const schema = z.enum(['a', 'b', 'c']);
      const pipe = new StandardValidationPipe(schema);

      await expect(pipe.transform('invalid', { type: 'body' })).rejects.toThrow();
    });
  });

  describe('union and intersection', () => {
    it('should work with z.union()', async () => {
      const schema = z.union([z.string(), z.number()]);
      const pipe = new StandardValidationPipe(schema);

      expect(await pipe.transform('hello', { type: 'body' })).toBe('hello');
      expect(await pipe.transform(42, { type: 'body' })).toBe(42);
    });

    it('should work with discriminated union', async () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), value: z.string() }),
        z.object({ type: z.literal('b'), value: z.number() }),
      ]);
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(
        { type: 'a', value: 'test' },
        { type: 'body' },
      );

      expect(result).toEqual({ type: 'a', value: 'test' });
    });
  });

  describe('createStandardDto integration', () => {
    it('should work with DTO class', async () => {
      const UserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      class UserDto extends createStandardDto(UserSchema) {}

      const pipe = new StandardValidationPipe();
      const result = await pipe.transform(
        { name: 'John', email: 'john@example.com' },
        { type: 'body', metatype: UserDto },
      );

      expect(result).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should validate using DTO schema', async () => {
      const UserSchema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      class UserDto extends createStandardDto(UserSchema) {}

      const pipe = new StandardValidationPipe();

      await expect(
        pipe.transform(
          { name: '', email: 'invalid' },
          { type: 'body', metatype: UserDto },
        ),
      ).rejects.toThrow();
    });
  });
});
