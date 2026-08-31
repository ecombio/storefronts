import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Typed wrapper for Response.json() / Request.json(). Hydrogen's Oxygen
 * runtime types (@shopify/oxygen-workers-types) declare a global Response
 * whose .json() returns Promise<unknown>, which merges with lib.dom.d.ts's
 * Promise<any> and can win out — so plain `await res.json()` often
 * resolves to `{}`/`unknown` instead of something usable. This casts
 * to the caller-specified shape at the point of use.
 *
 * The parameter is typed structurally ({json(): Promise<unknown>}) rather
 * than as `Response` specifically, so this also covers `Request.json()`
 * (loader/action body parsing) with the same helper — both Request and
 * Response satisfy this shape, and the underlying fix (casting the
 * resolved value to T) applies identically to either.
 *
 * Note: this is a type-level assertion only, not runtime validation —
 * same trust level as `any`, just scoped to the shape you specify.
 */
export async function readJson<T>(source: {json(): Promise<unknown>}): Promise<T> {
  return source.json() as Promise<T>;
}
