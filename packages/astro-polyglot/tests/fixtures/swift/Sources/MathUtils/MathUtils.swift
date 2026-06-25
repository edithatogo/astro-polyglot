/// A utility struct providing mathematical operations.
///
/// This file demonstrates DocC documentation conventions
/// with `///` comments and ``- Parameter:`` / ``- Returns:`` tags.
public struct MathUtils {

    /// Adds two integers and returns the result.
    ///
    /// - Parameter a: The first operand.
    /// - Parameter b: The second operand.
    /// - Returns: The sum of `a` and `b`.
    public static func add(_ a: Int, _ b: Int) -> Int {
        return a + b
    }

    /// Divides one double by another.
    ///
    /// - Parameter numerator: The value to be divided.
    /// - Parameter denominator: The value to divide by.
    /// - Returns: The quotient of `numerator` divided by `denominator`.
    /// - Throws: `MathError.divisionByZero` if `denominator` is zero.
    public static func divide(_ numerator: Double, _ denominator: Double) throws -> Double {
        guard denominator != 0.0 else {
            throw MathError.divisionByZero
        }
        return numerator / denominator
    }

    /// A 2D point with x and y coordinates.
    public struct Point {
        /// The x-coordinate.
        public var x: Double
        /// The y-coordinate.
        public var y: Double

        /// Creates a point at the given coordinates.
        ///
        /// - Parameter x: The x-coordinate.
        /// - Parameter y: The y-coordinate.
        public init(x: Double, y: Double) {
            self.x = x
            self.y = y
        }

        /// Computes the Euclidean distance to another point.
        ///
        /// - Parameter other: The other point.
        /// - Returns: The distance between this point and `other`.
        public func distanceTo(_ other: Point) -> Double {
            let dx = self.x - other.x
            let dy = self.y - other.y
            return (dx * dx + dy * dy).squareRoot()
        }
    }

    /// Returns the larger of two integers.
    ///
    /// - Parameter a: The first integer.
    /// - Parameter b: The second integer.
    /// - Returns: The maximum of `a` and `b`.
    public static func max(_ a: Int, _ b: Int) -> Int {
        return a >= b ? a : b
    }
}

/// Errors that can occur during mathematical operations.
public enum MathError: Error {
    /// Thrown when attempting to divide by zero.
    case divisionByZero
}