# @mag123c/nestjs-stdschema

Universal schema validation for NestJS using the [standard-schema](https://github.com/standard-schema/standard-schema) specification.

[![npm version](https://img.shields.io/npm/v/@mag123c/nestjs-stdschema.svg)](https://www.npmjs.com/package/@mag123c/nestjs-stdschema)
[![CI](https://github.com/mag123c/@mag123c/nestjs-stdschema/actions/workflows/ci.yml/badge.svg)](https://github.com/mag123c/@mag123c/nestjs-stdschema/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why This Package?

- **One package, 20+ validators**: Works with Zod, Valibot, ArkType, and any validator implementing the standard-schema spec
- **Zero vendor lock-in**: Switch validators without changing your NestJS code
- **Type-safe**: Full TypeScript support with automatic type inference
- **OpenAPI ready**: Automatic Swagger documentation via `@nestjs/swagger` integration
- **Minimal footprint**: No runtime dependencies on specific validators

## Installation

```bash
npm install @mag123c/nestjs-stdschema
# or
pnpm add @mag123c/nestjs-stdschema
# or
yarn add @mag123c/nestjs-stdschema
```

Then install your preferred validator:

```bash
# Zod
npm install zod

# Valibot
npm install valibot

# ArkType
npm install arktype
```

## Quick Start

### Basic Validation (Route Level)

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { StandardValidationPipe } from '@mag123c/nestjs-stdschema';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().optional(),
});

@Controller('users')
export class UsersController {
  @Post()
  create(
    @Body(new StandardValidationPipe(CreateUserSchema))
    body: z.infer<typeof CreateUserSchema>,
  ) {
    return body;
  }
}
```

### With DTO Class

```typescript
import { createStandardDto, StandardValidationPipe } from '@mag123c/nestjs-stdschema';
import { z } from 'zod';

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Create a DTO class with automatic type inference
class CreateUserDto extends createStandardDto(CreateUserSchema) {}

@Controller('users')
export class UsersController {
  @Post()
  create(
    @Body(new StandardValidationPipe(CreateUserDto.schema))
    body: CreateUserDto,
  ) {
    // body is fully typed as { name: string; email: string }
    return body;
  }
}
```

### Global Pipe

```typescript
import { StandardValidationPipe } from '@mag123c/nestjs-stdschema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global pipe requires @Schema decorator or createStandardDto
  app.useGlobalPipes(new StandardValidationPipe());

  await app.listen(3000);
}
```

### With Valibot

```typescript
import { StandardValidationPipe } from '@mag123c/nestjs-stdschema';
import * as v from 'valibot';

const CreateUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});

@Post()
create(
  @Body(new StandardValidationPipe(CreateUserSchema))
  body: v.InferOutput<typeof CreateUserSchema>,
) {
  return body;
}
```

## Response Serialization

Strip sensitive fields from responses using `StandardSerializerInterceptor`:

```typescript
import {
  StandardSerializerInterceptor,
  ResponseSchema,
  createStandardDto,
} from '@mag123c/nestjs-stdschema';
import { z } from 'zod';

const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  // email and password are excluded
});

class UserResponseDto extends createStandardDto(UserResponseSchema) {}

@Controller('users')
@UseInterceptors(StandardSerializerInterceptor)
export class UsersController {
  @Get(':id')
  @ResponseSchema(UserResponseDto)
  findOne(@Param('id') id: string) {
    // Even if this returns { id, name, email, password },
    // only { id, name } will be sent to the client
    return this.userService.findOne(id);
  }

  @Get()
  @ResponseSchema([UserResponseDto]) // Array response
  findAll() {
    return this.userService.findAll();
  }
}
```

## API Reference

### StandardValidationPipe

```typescript
new StandardValidationPipe(schema?, options?)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `errorHttpStatusCode` | `HttpStatus` | `400` | HTTP status code for validation errors |
| `exceptionFactory` | `(issues) => any` | - | Custom exception factory |
| `validateCustomDecorators` | `boolean` | `false` | Validate custom decorator parameters |
| `expectedType` | `Type<any>` | - | Override metatype for validation |

### createStandardDto

```typescript
function createStandardDto<T extends StandardSchemaV1>(
  schema: T,
  options?: { openapi?: OpenAPIMetadata }
): StandardDtoClass<T>;
```

Creates a DTO class from a schema with:
- Static `schema` property
- Automatic type inference
- OpenAPI metadata generation

### Decorators

| Decorator | Description |
|-----------|-------------|
| `@Schema(schema)` | Attach schema to existing class |
| `@ResponseSchema(dto)` | Define response schema for serialization |
| `@ResponseSchema([dto])` | Define array response schema |

### Utilities

| Function | Description |
|----------|-------------|
| `getSchema(target)` | Get schema from DTO class |
| `schemaToOpenAPI(schema, metadata?)` | Convert schema to OpenAPI format |

### Type Utilities

```typescript
import { InferInput, InferOutput } from '@mag123c/nestjs-stdschema';

type Input = InferInput<typeof MySchema>;   // Input type
type Output = InferOutput<typeof MySchema>; // Output type
```

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email"
    },
    {
      "path": ["age"],
      "message": "Expected number, received string"
    }
  ]
}
```

### Custom Error Format

```typescript
new StandardValidationPipe(schema, {
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
  exceptionFactory: (issues) => {
    return new UnprocessableEntityException({
      code: 'VALIDATION_ERROR',
      errors: issues.map(issue => ({
        field: issue.path?.join('.') ?? 'root',
        message: issue.message,
      })),
    });
  },
});
```

## OpenAPI Integration

DTOs created with `createStandardDto` automatically work with `@nestjs/swagger`:

```typescript
import { createStandardDto } from '@mag123c/nestjs-stdschema';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Zod v4+ automatically generates OpenAPI schema
class UserDto extends createStandardDto(UserSchema) {}

// For validators without toJSONSchema, provide manual metadata
class UserDto extends createStandardDto(ValibotSchema, {
  openapi: {
    name: { type: 'string', example: 'John' },
    email: { type: 'string', format: 'email' },
  },
}) {}
```

## Supported Validators

Any validator implementing the [standard-schema](https://github.com/standard-schema/standard-schema) specification:

| Validator | Version | Status |
|-----------|---------|--------|
| [Zod](https://github.com/colinhacks/zod) | ^3.24.0 | Tested |
| [Valibot](https://github.com/fabian-hiller/valibot) | ^1.0.0 | Tested |
| [ArkType](https://github.com/arktypeio/arktype) | ^2.0.0 | Compatible |
| [TypeBox](https://github.com/sinclairzx81/typebox) | ^0.32.0 | Compatible |
| And 20+ more... | | |

## Requirements

- Node.js >= 18
- NestJS >= 10.0.0
- TypeScript >= 5.0

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## License

[MIT](LICENSE)
