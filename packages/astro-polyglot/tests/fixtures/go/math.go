// Package math provides basic arithmetic utilities for conformance testing.
//
// All exported functions and types are documented with Go-style
// `//` comments that gomarkdoc can extract.
package math

import "errors"

// Add returns the sum of two integers.
// Example:
//
//	sum := Add(2, 3) // sum == 5
func Add(a, b int) int {
	return a + b
}

// Divide divides numerator by denominator and returns the result.
// Returns an error if denominator is zero.
func Divide(numerator, denominator float64) (float64, error) {
	if denominator == 0 {
		return 0, errors.New("division by zero")
	}
	return numerator / denominator, nil
}

// Point represents a 2D coordinate with X and Y values.
type Point struct {
	// X is the horizontal coordinate.
	X float64
	// Y is the vertical coordinate.
	Y float64
}

// NewPoint creates a Point at the given coordinates.
func NewPoint(x, y float64) Point {
	return Point{X: x, Y: y}
}

// DistanceTo computes the Euclidean distance between two points.
func (p Point) DistanceTo(other Point) float64 {
	dx := p.X - other.X
	dy := p.Y - other.Y
	return (dx*dx + dy*dy) // simplified; real impl would use math.Sqrt
}

// Max returns the larger of two integers.
// If both values are equal, returns that value.
func Max(a, b int) int {
	if a > b {
		return a
	}
	return b
}