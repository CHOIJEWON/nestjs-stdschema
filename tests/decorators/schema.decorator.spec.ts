import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Schema, getSchema, createStandardDto } from '../../src';

describe('@Schema decorator', () => {
  const UserSchema = z.object({
    name: z.string(),
    email: z.string().email(),
  });

  @Schema(UserSchema)
  class UserDto {
    name!: string;
    email!: string;
  }

  it('should attach schema to class via metadata', () => {
    const schema = getSchema(UserDto);
    expect(schema).toBe(UserSchema);
  });

  it('should return undefined for class without schema', () => {
    class PlainDto {}
    const schema = getSchema(PlainDto);
    expect(schema).toBeUndefined();
  });
});

describe('getSchema', () => {
  describe('with createStandardDto', () => {
    const ProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
    });

    class ProductDto extends createStandardDto(ProductSchema) {}

    it('should retrieve schema from static property', () => {
      const schema = getSchema(ProductDto);
      expect(schema).toBe(ProductSchema);
    });
  });

  describe('with @Schema decorator', () => {
    const OrderSchema = z.object({
      id: z.string(),
      items: z.array(z.string()),
    });

    @Schema(OrderSchema)
    class OrderDto {
      id!: string;
      items!: string[];
    }

    it('should retrieve schema from metadata', () => {
      const schema = getSchema(OrderDto);
      expect(schema).toBe(OrderSchema);
    });
  });

  describe('priority', () => {
    const Schema1 = z.object({ a: z.string() });
    const Schema2 = z.object({ b: z.number() });

    // When both static property and decorator are present,
    // static property takes priority (from createStandardDto)
    @Schema(Schema2)
    class MixedDto extends createStandardDto(Schema1) {}

    it('should prioritize static schema over decorator', () => {
      const schema = getSchema(MixedDto);
      expect(schema).toBe(Schema1);
    });
  });
});
