/// <summary>
/// A utility class providing mathematical operations.
/// This class demonstrates .NET XML documentation conventions.
/// </summary>
public static class MathUtils
{
    /// <summary>
    /// Adds two integers and returns the result.
    /// </summary>
    /// <param name="a">The first operand.</param>
    /// <param name="b">The second operand.</param>
    /// <returns>The sum of a and b.</returns>
    public static int Add(int a, int b) => a + b;

    /// <summary>
    /// Divides one double by another.
    /// </summary>
    /// <param name="numerator">The value to be divided.</param>
    /// <param name="denominator">The value to divide by.</param>
    /// <returns>The quotient of numerator divided by denominator.</returns>
    /// <exception cref="System.DivideByZeroException">Thrown when denominator is zero.</exception>
    public static double Divide(double numerator, double denominator)
    {
        if (denominator == 0.0)
            throw new System.DivideByZeroException("Denominator must not be zero");
        return numerator / denominator;
    }

    /// <summary>
    /// Represents a 2D point with X and Y coordinates.
    /// </summary>
    public struct Point
    {
        /// <summary>The X-coordinate.</summary>
        public double X { get; set; }
        /// <summary>The Y-coordinate.</summary>
        public double Y { get; set; }

        /// <summary>
        /// Initializes a new Point at the given coordinates.
        /// </summary>
        /// <param name="x">The X-coordinate.</param>
        /// <param name="y">The Y-coordinate.</param>
        public Point(double x, double y)
        {
            X = x;
            Y = y;
        }

        /// <summary>
        /// Computes the Euclidean distance to another Point.
        /// </summary>
        /// <param name="other">The other point.</param>
        /// <returns>The distance between this point and the other point.</returns>
        public double DistanceTo(Point other)
        {
            double dx = this.X - other.X;
            double dy = this.Y - other.Y;
            return System.Math.Sqrt(dx * dx + dy * dy);
        }
    }

    /// <summary>
    /// Returns the larger of two integers.
    /// </summary>
    /// <param name="a">The first integer.</param>
    /// <param name="b">The second integer.</param>
    /// <returns>The maximum of a and b.</returns>
    public static int Max(int a, int b) => a >= b ? a : b;
}