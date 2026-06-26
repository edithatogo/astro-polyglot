/**
 * @brief A utility class for mathematical operations.
 */
@interface MathUtils : NSObject

/**
 * @brief Add two numbers.
 * @param a First number.
 * @param b Second number.
 * @return The sum.
 */
+ (double)add:(double)a to:(double)b;

/**
 * @brief Square a number.
 * @param x The input.
 * @return x squared.
 */
+ (double)square:(double)x;

@end
