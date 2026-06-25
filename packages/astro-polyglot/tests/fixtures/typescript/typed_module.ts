/** A minimal typed TypeScript module used as a conformance fixture. */

/** Return a friendly greeting. */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

/** A simple calculator with typed methods. */
export class Calculator {
  /** Add two integers. */
  add(a: number, b: number): number {
    return a + b;
  }

  /** Divide two floats. */
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error("Cannot divide by zero");
    }
    return a / b;
  }
}