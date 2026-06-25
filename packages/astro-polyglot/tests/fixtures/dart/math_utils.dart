/// A utility class providing mathematical operations.
///
/// This file demonstrates dartdoc conventions with `///` doc comments.
class MathUtils {
  /// Adds two integers and returns the result.
  ///
  /// The [a] and [b] parameters are both expected to be integers.
  ///
  /// Returns the sum of [a] and [b].
  static int add(int a, int b) => a + b;

  /// Divides one double by another.
  ///
  /// Returns the quotient of [numerator] divided by [denominator].
  ///
  /// Throws an [ArgumentError] if [denominator] is zero.
  static double divide(double numerator, double denominator) {
    if (denominator == 0.0) {
      throw ArgumentError('Denominator must not be zero');
    }
    return numerator / denominator;
  }

  /// A 2D point with x and y coordinates.
  class Point {
    /// The x-coordinate.
    double x;
    /// The y-coordinate.
    double y;

    /// Creates a new Point at the given coordinates.
    Point(this.x, this.y);

    /// Computes the Euclidean distance to another [Point].
    ///
    /// Returns the distance between this point and [other].
    double distanceTo(Point other) {
      final dx = x - other.x;
      final dy = y - other.y;
      return (dx * dx + dy * dy);
    }
  }

  /// Returns the larger of two integers.
  ///
  /// Returns [a] if [a] >= [b], otherwise returns [b].
  static int max(int a, int b) => a >= b ? a : b;
}