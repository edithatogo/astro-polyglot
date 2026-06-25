/**
 * A utility object providing mathematical operations.
 *
 * This file demonstrates Scaladoc conventions with @param, @return,
 * @constructor, and @throws tags.
 */
object MathUtils {

  /**
   * Adds two integers and returns the result.
   *
   * @param a the first operand
   * @param b the second operand
   * @return the sum of a and b
   */
  def add(a: Int, b: Int): Int = a + b

  /**
   * Divides one double by another.
   *
   * @param numerator   the value to be divided
   * @param denominator the value to divide by
   * @return the quotient of numerator divided by denominator
   * @throws IllegalArgumentException if denominator is zero
   */
  def divide(numerator: Double, denominator: Double): Double = {
    require(denominator != 0.0, "Denominator must not be zero")
    numerator / denominator
  }

  /**
   * Represents a 2D point with x and y coordinates.
   *
   * @constructor Creates a new Point at the given coordinates.
   * @param x the x-coordinate
   * @param y the y-coordinate
   */
  class Point(val x: Double, val y: Double) {

    /**
     * Computes the Euclidean distance to another point.
     *
     * @param other the other point
     * @return the distance between this point and the other point
     */
    def distanceTo(other: Point): Double = {
      val dx = this.x - other.x
      val dy = this.y - other.y
      scala.math.sqrt(dx * dx + dy * dy)
    }
  }

  /**
   * Returns the larger of two integers.
   *
   * @param a the first integer
   * @param b the second integer
   * @return a if a >= b, otherwise b
   */
  def max(a: Int, b: Int): Int = if (a >= b) a else b
}