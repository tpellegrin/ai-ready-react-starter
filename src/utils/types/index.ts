/** Make IDE type display friendlier */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Values of an object */
export type Values<T> = T[keyof T];

/** Omit properties of U from T by setting them to never (used by XOR) */
type Without<T, U> = { [P in Exclude<keyof U, keyof T>]?: never } & T;

/**
 * Exclusive-or for object shapes:
 * only T or only U (not both). Primitives fall back to T | U.
 */
export type XOR<T, U> = T | U extends object
  ? Without<T, U> | Without<U, T>
  : T | U;

/** Expand one level (alias using a clearer name) */
export type Expand<T> = Simplify<T>;

/** Add a leading dot when non-empty */
export type DotPrefix<T extends string> = T extends '' ? '' : `.${T}`;

/**
 * DotNestedKeys:
 * - Walks objects
 * - Skips symbol keys and functions
 * - Optional: include array indices with IncludeArrays=true
 */
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Func = (...args: unknown[]) => unknown;

export type DotNestedKeys<T, IncludeArrays extends boolean = false> = T extends
  | Primitive
  | Func
  ? ''
  : T extends ReadonlyArray<infer V>
    ? IncludeArrays extends true
      ? // numeric indices + nested keys: "0", "0.foo"
        `${number}${DotPrefix<DotNestedKeys<V, IncludeArrays>>}`
      : DotNestedKeys<V, IncludeArrays>
    : {
          [K in Exclude<keyof T, symbol>]: T[K] extends Primitive | Func
            ? Extract<K, string>
            : `${Extract<K, string>}${DotPrefix<DotNestedKeys<T[K], IncludeArrays>>}`;
        }[Exclude<keyof T, symbol>] extends infer D
      ? Extract<D, string>
      : never;

/**
 * DeepPartial:
 * - Leaves functions intact
 * - Partials arrays/tuples elementwise
 * - Partials objects deeply
 */
export type DeepPartial<T> = T extends Func
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends object
      ? { [P in keyof T]?: DeepPartial<T[P]> }
      : T;

/**
 * KeysWithValueType:
 * - Returns the keys of T whose non-nullable value type extends V
 */
export type KeysWithValueType<T, V> = {
  [K in keyof T]-?: NonNullable<T[K]> extends V ? K : never;
}[keyof T];
