/**
 * Standard Schema v1 interface
 * @see https://github.com/standard-schema/standard-schema
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  /**
   * The Standard Schema properties interface
   */
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output>;
  }

  /**
   * The result of a validation
   */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /**
   * Successful validation result
   */
  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  /**
   * Failed validation result
   */
  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  /**
   * A validation issue
   */
  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /**
   * A path segment with a key property
   */
  export interface PathSegment {
    readonly key: PropertyKey;
  }

  /**
   * Type metadata for input/output inference
   */
  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }
}

/**
 * Infers the input type from a Standard Schema
 */
export type InferInput<T extends StandardSchemaV1> = NonNullable<
  T['~standard']['types']
>['input'];

/**
 * Infers the output type from a Standard Schema
 */
export type InferOutput<T extends StandardSchemaV1> = NonNullable<
  T['~standard']['types']
>['output'];
