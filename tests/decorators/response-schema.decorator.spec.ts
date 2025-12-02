import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ResponseSchema,
  createStandardDto,
  RESPONSE_SCHEMA_METADATA_KEY,
} from '../../src';

describe('@ResponseSchema decorator', () => {
  const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  class UserDto extends createStandardDto(UserSchema) {}

  describe('single object response', () => {
    it('should set metadata with isArray false', () => {
      class TestController {
        @ResponseSchema(UserDto)
        findOne() {
          return {};
        }
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.findOne,
      );

      expect(metadata).toEqual({
        type: UserDto,
        isArray: false,
      });
    });
  });

  describe('array response', () => {
    it('should set metadata with isArray true', () => {
      class TestController {
        @ResponseSchema([UserDto])
        findAll() {
          return [];
        }
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.findAll,
      );

      expect(metadata).toEqual({
        type: UserDto,
        isArray: true,
      });
    });
  });

  describe('method decoration', () => {
    it('should work on async methods', () => {
      class TestController {
        @ResponseSchema(UserDto)
        async findOne() {
          return {};
        }
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.findOne,
      );

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe(UserDto);
    });

    it('should allow multiple decorated methods', () => {
      const ProductSchema = z.object({ id: z.number(), name: z.string() });
      class ProductDto extends createStandardDto(ProductSchema) {}

      class TestController {
        @ResponseSchema(UserDto)
        getUser() {
          return {};
        }

        @ResponseSchema(ProductDto)
        getProduct() {
          return {};
        }

        @ResponseSchema([UserDto])
        getUsers() {
          return [];
        }
      }

      const userMetadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.getUser,
      );
      const productMetadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.getProduct,
      );
      const usersMetadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.getUsers,
      );

      expect(userMetadata.type).toBe(UserDto);
      expect(userMetadata.isArray).toBe(false);

      expect(productMetadata.type).toBe(ProductDto);
      expect(productMetadata.isArray).toBe(false);

      expect(usersMetadata.type).toBe(UserDto);
      expect(usersMetadata.isArray).toBe(true);
    });
  });

  describe('no decorator', () => {
    it('should return undefined when no decorator applied', () => {
      class TestController {
        findOne() {
          return {};
        }
      }

      const metadata = Reflect.getMetadata(
        RESPONSE_SCHEMA_METADATA_KEY,
        TestController.prototype.findOne,
      );

      expect(metadata).toBeUndefined();
    });
  });
});
