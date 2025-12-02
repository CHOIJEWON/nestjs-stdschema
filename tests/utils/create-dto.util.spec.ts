import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { createStandardDto } from '../../src';

describe('createStandardDto', () => {
  describe('with Zod schema', () => {
    const UserSchema = z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string().email(),
      createdAt: z.date(),
    });

    class UserDto extends createStandardDto(UserSchema) {}

    it('should expose static schema property', () => {
      expect(UserDto.schema).toBe(UserSchema);
    });

    it('should have _OPENAPI_METADATA_FACTORY method', () => {
      expect(typeof UserDto._OPENAPI_METADATA_FACTORY).toBe('function');
    });

    it('should return object from _OPENAPI_METADATA_FACTORY', () => {
      const metadata = UserDto._OPENAPI_METADATA_FACTORY();
      expect(typeof metadata).toBe('object');
    });
  });

  describe('with Valibot schema', () => {
    const UserSchema = v.object({
      id: v.pipe(v.string(), v.uuid()),
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    });

    class UserDto extends createStandardDto(UserSchema) {}

    it('should expose static schema property', () => {
      expect(UserDto.schema).toBe(UserSchema);
    });

    it('should have _OPENAPI_METADATA_FACTORY method', () => {
      expect(typeof UserDto._OPENAPI_METADATA_FACTORY).toBe('function');
    });
  });

  describe('type inference', () => {
    const CreateUserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    const UpdateUserSchema = CreateUserSchema.partial();

    class CreateUserDto extends createStandardDto(CreateUserSchema) {}
    class UpdateUserDto extends createStandardDto(UpdateUserSchema) {}

    it('should allow creating instances matching the schema type', () => {
      // This test verifies type inference at compile time
      // If types are wrong, TypeScript will fail to compile
      const createUser: InstanceType<typeof CreateUserDto> = {
        name: 'John',
        email: 'john@example.com',
      };

      const updateUser: InstanceType<typeof UpdateUserDto> = {
        name: 'John',
      };

      expect(createUser.name).toBe('John');
      expect(updateUser.name).toBe('John');
    });
  });

  describe('schema with transformations', () => {
    const TransformSchema = z.object({
      date: z.coerce.date(),
      number: z.coerce.number(),
    });

    class TransformDto extends createStandardDto(TransformSchema) {}

    it('should preserve schema with transformations', () => {
      expect(TransformDto.schema).toBe(TransformSchema);

      // Verify schema can perform transformations
      const result = TransformDto.schema['~standard'].validate({
        date: '2024-01-01',
        number: '42',
      });

      if ('value' in result) {
        expect(result.value.date).toBeInstanceOf(Date);
        expect(result.value.number).toBe(42);
      }
    });
  });
});
