import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, firstValueFrom } from 'rxjs';
import { z } from 'zod';
import * as v from 'valibot';
import {
  StandardSerializerInterceptor,
  createStandardDto,
} from '../../src';

describe('StandardSerializerInterceptor', () => {
  function createMockExecutionContext(handler: object): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({}) as any,
      switchToHttp: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => 'http' as any,
    } as ExecutionContext;
  }

  function createMockCallHandler(data: unknown) {
    return {
      handle: () => of(data),
    };
  }

  describe('without @ResponseSchema', () => {
    it('should pass through data unchanged when no schema metadata', async () => {
      const reflector = new Reflector();
      const interceptor = new StandardSerializerInterceptor(reflector);

      const handler = {};
      const context = createMockExecutionContext(handler);
      const callHandler = createMockCallHandler({ any: 'data', extra: 'field' });

      const result = await firstValueFrom(
        interceptor.intercept(context, callHandler),
      );

      expect(result).toEqual({ any: 'data', extra: 'field' });
    });
  });

  describe('with @ResponseSchema (Zod)', () => {
    const UserResponseSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    class UserResponseDto extends createStandardDto(UserResponseSchema) {}

    it('should serialize valid response data', async () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'get').mockReturnValue({
        type: UserResponseDto,
        isArray: false,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler({
        id: '123',
        name: 'John',
        password: 'secret', // extra field
      });

      const result = await firstValueFrom(
        interceptor.intercept(context, callHandler),
      );

      expect(result).toEqual({ id: '123', name: 'John' });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw InternalServerErrorException for invalid response', async () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'get').mockReturnValue({
        type: UserResponseDto,
        isArray: false,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler({
        id: 123, // should be string
        name: 'John',
      });

      await expect(
        firstValueFrom(interceptor.intercept(context, callHandler)),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should serialize array response when isArray is true', async () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'get').mockReturnValue({
        type: UserResponseDto,
        isArray: true,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler([
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ]);

      const result = await firstValueFrom(
        interceptor.intercept(context, callHandler),
      );

      expect(result).toEqual([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);
    });
  });

  describe('with @ResponseSchema (Valibot)', () => {
    const ProductResponseSchema = v.object({
      id: v.number(),
      name: v.string(),
      price: v.number(),
    });

    class ProductResponseDto extends createStandardDto(ProductResponseSchema) {}

    it('should serialize valid response data', async () => {
      const reflector = new Reflector();
      vi.spyOn(reflector, 'get').mockReturnValue({
        type: ProductResponseDto,
        isArray: false,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler({
        id: 1,
        name: 'Product',
        price: 99.99,
        internalCode: 'ABC123', // extra field
      });

      const result = await firstValueFrom(
        interceptor.intercept(context, callHandler),
      );

      expect(result).toEqual({ id: 1, name: 'Product', price: 99.99 });
      expect(result).not.toHaveProperty('internalCode');
    });
  });

  describe('edge cases', () => {
    it('should handle DTO without schema property gracefully', async () => {
      const reflector = new Reflector();

      class PlainDto {}

      vi.spyOn(reflector, 'get').mockReturnValue({
        type: PlainDto,
        isArray: false,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler({ any: 'data' });

      const result = await firstValueFrom(
        interceptor.intercept(context, callHandler),
      );

      // Should pass through when no schema found
      expect(result).toEqual({ any: 'data' });
    });

    it('should handle non-array data when isArray is true', async () => {
      const UserSchema = z.object({ id: z.string() });
      class UserDto extends createStandardDto(UserSchema) {}

      const reflector = new Reflector();
      vi.spyOn(reflector, 'get').mockReturnValue({
        type: UserDto,
        isArray: true,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      // Not an array
      const callHandler = createMockCallHandler({ id: '1' });

      const result = await firstValueFrom(
        interceptor.intercept(context, callHandler),
      );

      // Should serialize as single object when data is not array
      expect(result).toEqual({ id: '1' });
    });

    it('should handle null response', async () => {
      const UserSchema = z.object({ id: z.string() });
      class UserDto extends createStandardDto(UserSchema) {}

      const reflector = new Reflector();
      vi.spyOn(reflector, 'get').mockReturnValue({
        type: UserDto,
        isArray: false,
      });

      const interceptor = new StandardSerializerInterceptor(reflector);
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler(null);

      // Validation should fail for null
      await expect(
        firstValueFrom(interceptor.intercept(context, callHandler)),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
