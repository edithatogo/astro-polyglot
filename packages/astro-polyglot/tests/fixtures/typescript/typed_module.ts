/**
 * A typed TypeScript module used as a conformance fixture.
 *
 * This module provides math and string utility functions and classes,
 * all annotated with JSDoc documentation tags.
 *
 * @module math-utils
 */

/**
 * Return a friendly greeting.
 * @param name - The name of the person to greet.
 * @returns A greeting string.
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/**
 * Compute the sum of an array of numbers.
 * @param values - The numbers to sum.
 * @returns The total sum.
 */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * A simple calculator with typed methods.
 */
export class Calculator {
  /**
   * Add two integers.
   * @param a - First operand.
   * @param b - Second operand.
   * @returns The sum of a and b.
   */
  add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Divide two numbers.
   * @param a - Dividend.
   * @param b - Divisor.
   * @returns The quotient of a divided by b.
   * @throws {Error} If b is zero.
   */
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error("Cannot divide by zero");
    }
    return a / b;
  }
}

/**
 * A user entity with typed fields.
 */
export interface User {
  /** The unique identifier. */
  id: number;
  /** The display name. */
  name: string;
  /** Optional email address. */
  email?: string;
}