# A utility module providing mathematical operations.
#
# This file demonstrates YARD documentation conventions
# with @param, @return, @raise, and @example tags.
module MathUtils
  # Adds two integers and returns the result.
  #
  # @param a [Integer] The first operand.
  # @param b [Integer] The second operand.
  # @return [Integer] The sum of a and b.
  # @example Add two numbers
  #   MathUtils.add(2, 3) #=> 5
  def self.add(a, b)
    a + b
  end

  # Divides one number by another.
  #
  # @param numerator [Float] The value to be divided.
  # @param denominator [Float] The value to divide by.
  # @return [Float] The quotient of numerator divided by denominator.
  # @raise [ZeroDivisionError] If denominator is zero.
  def self.divide(numerator, denominator)
    raise ZeroDivisionError, "Denominator must not be zero" if denominator == 0
    numerator / denominator
  end

  # A 2D point with x and y coordinates.
  class Point
    # @return [Float] The x-coordinate.
    attr_accessor :x

    # @return [Float] The y-coordinate.
    attr_accessor :y

    # Creates a new Point at the given coordinates.
    #
    # @param x [Float] The x-coordinate.
    # @param y [Float] The y-coordinate.
    def initialize(x, y)
      @x = x
      @y = y
    end

    # Computes the Euclidean distance to another point.
    #
    # @param other [Point] The other point.
    # @return [Float] The distance between this point and the other point.
    def distance_to(other)
      dx = @x - other.x
      dy = @y - other.y
      Math.sqrt(dx * dx + dy * dy)
    end
  end

  # Returns the larger of two integers.
  #
  # @param a [Integer] The first integer.
  # @param b [Integer] The second integer.
  # @return [Integer] The maximum of a and b.
  def self.max(a, b)
    a >= b ? a : b
  end
end