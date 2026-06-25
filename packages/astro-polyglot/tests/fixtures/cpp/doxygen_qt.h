#ifndef MATH_QT_STYLE_H
#define MATH_QT_STYLE_H

#include <vector>

//! A statistics helper class.
/*! Provides methods for computing descriptive statistics. */
class StatsHelper {
public:
    //! Compute the mean of a data set.
    //! @param data Vector of numeric observations.
    //! @return The arithmetic mean.
    static double mean(const std::vector<double>& data);

    //! Compute the variance.
    //! @param data Vector of numeric observations.
    //! @param bias If true, use population variance (n). Otherwise sample (n-1).
    //! @return The variance value.
    static double variance(const std::vector<double>& data, bool bias = false);
};

#endif