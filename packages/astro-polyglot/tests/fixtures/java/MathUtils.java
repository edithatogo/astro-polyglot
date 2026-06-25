/**
 * A utility class providing mathematical operations.
 *
 * <p>This class demonstrates Javadoc conventions with {@code @param},
 * {@code @return}, and {@code @throws} tags.</p>
 *
 * @since 1.0
 */
public class MathUtils {

    /**
     * Adds two integers and returns the result.
     *
     * @param a the first operand
     * @param b the second operand
     * @return the sum of a and b
     */
    public static int add(int a, int b) {
        return a + b;
    }

    /**
     * Divides one double by another.
     *
     * @param numerator   the value to be divided
     * @param denominator the value to divide by
     * @return the quotient of numerator divided by denominator
     * @throws IllegalArgumentException if denominator is zero
     */
    public static double divide(double numerator, double denominator) {
        if (denominator == 0.0) {
            throw new IllegalArgumentException("Denominator must not be zero");
        }
        return numerator / denominator;
    }

    /**
     * Represents a 2D point with x and y coordinates.
     */
    public static class Point {
        /** The x-coordinate. */
        public double x;
        /** The y-coordinate. */
        public double y;

        /**
         * Constructs a Point at the given coordinates.
         *
         * @param x the x-coordinate
         * @param y the y-coordinate
         */
        public Point(double x, double y) {
            this.x = x;
            this.y = y;
        }

        /**
         * Computes the Euclidean distance to another point.
         *
         * @param other the other point
         * @return the distance between this point and the other point
         */
        public double distanceTo(Point other) {
            double dx = this.x - other.x;
            double dy = this.y - other.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    /**
     * Returns the larger of two integers.
     *
     * @param a the first integer
     * @param b the second integer
     * @return a if a >= b, otherwise b
     */
    public static int max(int a, int b) {
        return a >= b ? a : b;
    }
}