import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { StandardValidationPipe, createStandardDto } from '../../src';

describe('Valibot Integration', () => {
  describe('primitive types', () => {
    it('should work with v.string()', async () => {
      const schema = v.string();
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('hello', { type: 'body' });

      expect(result).toBe('hello');
    });

    it('should work with v.number()', async () => {
      const schema = v.number();
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(42, { type: 'body' });

      expect(result).toBe(42);
    });

    it('should work with v.boolean()', async () => {
      const schema = v.boolean();
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(true, { type: 'body' });

      expect(result).toBe(true);
    });

    it('should reject invalid primitive', async () => {
      const schema = v.string();
      const pipe = new StandardValidationPipe(schema);

      await expect(pipe.transform(123, { type: 'body' })).rejects.toThrow();
    });
  });

  describe('object types', () => {
    it('should work with v.object()', async () => {
      const schema = v.object({
        name: v.string(),
        age: v.number(),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(
        { name: 'John', age: 30 },
        { type: 'body' },
      );

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should work with nested objects', async () => {
      const schema = v.object({
        user: v.object({
          name: v.string(),
          address: v.object({
            city: v.string(),
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
      const schema = v.object({
        required: v.string(),
        optional: v.optional(v.string()),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform(
        { required: 'value' },
        { type: 'body' },
      );

      expect(result).toEqual({ required: 'value' });
    });

    it('should work with nullable fields', async () => {
      const schema = v.object({
        value: v.nullable(v.string()),
      });
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform({ value: null }, { type: 'body' });

      expect(result).toEqual({ value: null });
    });
  });

  describe('array types', () => {
    it('should work with v.array()', async () => {
      const schema = v.array(v.number());
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform([1, 2, 3], { type: 'body' });

      expect(result).toEqual([1, 2, 3]);
    });

    it('should work with array of objects', async () => {
      const schema = v.array(
        v.object({
          id: v.number(),
          name: v.string(),
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
      const schema = v.array(v.number());
      const pipe = new StandardValidationPipe(schema);

      await expect(
        pipe.transform([1, 'invalid', 3], { type: 'body' }),
      ).rejects.toThrow();
    });
  });

  describe('validation constraints with pipe', () => {
    it('should work with string constraints', async () => {
      const schema = v.object({
        email: v.pipe(v.string(), v.email()),
        url: v.pipe(v.string(), v.url()),
        uuid: v.pipe(v.string(), v.uuid()),
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
      const schema = v.object({
        min: v.pipe(v.number(), v.minValue(10)),
        max: v.pipe(v.number(), v.maxValue(100)),
      });
      const pipe = new StandardValidationPipe(schema);

      const input = { min: 15, max: 50 };

      const result = await pipe.transform(input, { type: 'body' });

      expect(result).toEqual(input);
    });

    it('should work with string length constraints', async () => {
      const schema = v.pipe(v.string(), v.minLength(3), v.maxLength(10));
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('hello', { type: 'body' });

      expect(result).toBe('hello');
    });

    it('should reject invalid constraints', async () => {
      const schema = v.pipe(v.string(), v.email());
      const pipe = new StandardValidationPipe(schema);

      await expect(
        pipe.transform('not-an-email', { type: 'body' }),
      ).rejects.toThrow();
    });
  });

  describe('transformations', () => {
    it('should work with v.transform()', async () => {
      const schema = v.pipe(
        v.string(),
        v.transform((val) => val.toUpperCase()),
      );
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('hello', { type: 'body' });

      expect(result).toBe('HELLO');
    });
  });

  describe('enum types', () => {
    it('should work with v.picklist()', async () => {
      const schema = v.picklist(['admin', 'user', 'guest']);
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('admin', { type: 'body' });

      expect(result).toBe('admin');
    });

    it('should work with v.enum()', async () => {
      enum Role {
        Admin = 'admin',
        User = 'user',
      }
      const schema = v.enum(Role);
      const pipe = new StandardValidationPipe(schema);

      const result = await pipe.transform('admin', { type: 'body' });

      expect(result).toBe(Role.Admin);
    });

    it('should reject invalid enum value', async () => {
      const schema = v.picklist(['a', 'b', 'c']);
      const pipe = new StandardValidationPipe(schema);

      await expect(pipe.transform('invalid', { type: 'body' })).rejects.toThrow();
    });
  });

  describe('union types', () => {
    it('should work with v.union()', async () => {
      const schema = v.union([v.string(), v.number()]);
      const pipe = new StandardValidationPipe(schema);

      expect(await pipe.transform('hello', { type: 'body' })).toBe('hello');
      expect(await pipe.transform(42, { type: 'body' })).toBe(42);
    });

    it('should work with v.variant()', async () => {
      const schema = v.variant('type', [
        v.object({ type: v.literal('a'), value: v.string() }),
        v.object({ type: v.literal('b'), value: v.number() }),
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
      const UserSchema = v.object({
        name: v.string(),
        email: v.pipe(v.string(), v.email()),
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
      const UserSchema = v.object({
        name: v.pipe(v.string(), v.minLength(1)),
        email: v.pipe(v.string(), v.email()),
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
