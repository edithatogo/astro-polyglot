<?php
/**
 * A utility class providing mathematical operations.
 *
 * This file demonstrates PHPDoc conventions with @param, @return, @throws,
 * and @see tags.
 */
class MathUtils
{
    /**
     * Adds two integers and returns the result.
     *
     * @param int $a The first operand.
     * @param int $b The second operand.
     *
     * @return int The sum of a and b.
     */
    public static function add(int $a, int $b): int
    {
        return $a + $b;
    }

    /**
     * Divides one float by another.
     *
     * @param float $numerator   The value to be divided.
     * @param float $denominator The value to divide by.
     *
     * @return float The quotient of numerator divided by denominator.
     *
     * @throws InvalidArgumentException If denominator is zero.
     */
    public static function divide(float $numerator, float $denominator): float
    {
        if ($denominator === 0.0) {
            throw new InvalidArgumentException('Denominator must not be zero');
        }
        return $numerator / $denominator;
    }

    /**
     * Returns the larger of two integers.
     *
     * @param int $a The first integer.
     * @param int $b The second integer.
     *
     * @return int The maximum of a and b.
     */
    public static function max(int $a, int $b): int
    {
        return $a >= $b ? $a : $b;
    }
}

/**
 * Represents a 2D point with x and y coordinates.
 */
class Point
{
    /** @var float The x-coordinate. */
    public float $x;
    /** @var float The y-coordinate. */
    public float $y;

    /**
     * Creates a new Point at the given coordinates.
     *
     * @param float $x The x-coordinate.
     * @param float $y The y-coordinate.
     */
    public function __construct(float $x, float $y)
    {
        $this->x = $x;
        $this->y = $y;
    }

    /**
     * Computes the Euclidean distance to another Point.
     *
     * @param Point $other The other point.
     *
     * @return float The distance between this point and the other point.
     */
    public function distanceTo(Point $other): float
    {
        $dx = $this->x - $other->x;
        $dy = $this->y - $other->y;
        return sqrt($dx * $dx + $dy * $dy);
    }
}