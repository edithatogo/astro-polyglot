/**
 * A simple math utility module with JSDoc annotations.
 * @module math-utils
 */

/**
 * Add two numbers.
 * @param {number} a - First operand.
 * @param {number} b - Second operand.
 * @returns {number} The sum of a and b.
 */
export function add(a, b) {
  return a + b;
}

/**
 * A calculator class with typed methods.
 * @class
 */
export class Calculator {
  /**
   * Add two integers.
   * @param {number} a - First operand.
   * @param {number} b - Second operand.
   * @returns {number} The sum.
   */
  add(a, b) {
    return a + b;
  }
}
