/// A collection of math utility functions for conformance testing.
///
/// This crate demonstrates Rustdoc documentation conventions
/// with `///` doc comments and CommonMark formatting.
///
/// # Examples
///
/// ```
/// use math_utils::add;
/// assert_eq!(add(2, 3), 5);
/// ```

/// Adds two integers together.
///
/// # Arguments
///
/// * `a` - The first operand.
/// * `b` - The second operand.
///
/// # Returns
///
/// The sum of `a` and `b`.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Divides two floating-point numbers.
///
/// # Arguments
///
/// * `numerator` - The value to be divided.
/// * `denominator` - The value to divide by.
///
/// # Returns
///
/// The quotient of `numerator` divided by `denominator`.
///
/// # Panics
///
/// Panics if `denominator` is zero.
pub fn divide(numerator: f64, denominator: f64) -> f64 {
    if denominator == 0.0 {
        panic!("denominator must not be zero");
    }
    numerator / denominator
}

/// A simple 2D point with x and y coordinates.
pub struct Point {
    /// The x-coordinate.
    pub x: f64,
    /// The y-coordinate.
    pub y: f64,
}

impl Point {
    /// Create a new `Point` at the given coordinates.
    ///
    /// # Arguments
    ///
    /// * `x` - The x-coordinate.
    /// * `y` - The y-coordinate.
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    /// Compute the Euclidean distance from this point to another.
    ///
    /// # Arguments
    ///
    /// * `other` - The other point.
    ///
    /// # Returns
    ///
    /// The distance between the two points.
    pub fn distance_to(&self, other: &Point) -> f64 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

/// Represents the result of a comparison.
pub enum Comparison {
    /// The first value is less than the second.
    Less,
    /// The two values are equal.
    Equal,
    /// The first value is greater than the second.
    Greater,
}

/// Compares two integers and returns a `Comparison`.
///
/// # Arguments
///
/// * `a` - First integer.
/// * `b` - Second integer.
///
/// # Returns
///
/// `Comparison::Less` if `a < b`, `Comparison::Equal` if `a == b`,
/// or `Comparison::Greater` if `a > b`.
pub fn compare(a: i32, b: i32) -> Comparison {
    if a < b {
        Comparison::Less
    } else if a == b {
        Comparison::Equal
    } else {
        Comparison::Greater
    }
}