#ifndef MATH_UTILS_H
#define MATH_UTILS_H

#include <vector>

/**
 * @brief A utility class for mathematical operations.
 * @details Provides static methods for common math functions
 *          with support for vector inputs.
 */
class MathUtils {
public:
    /**
     * @brief Compute the sum of all elements in a vector.
     * @param values A vector of double-precision numbers.
     * @return The arithmetic sum of all elements.
     */
    static double sum(const std::vector<double>& values);

    /**
     * @brief Find the maximum value in a vector.
     * @param values A vector of double-precision numbers.
     * @return The maximum element.
     * @warning Returns 0.0 if the vector is empty.
     */
    static double max(const std::vector<double>& values);
};

#endif
