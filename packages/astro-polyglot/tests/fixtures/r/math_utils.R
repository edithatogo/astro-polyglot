#' A collection of math utility functions
#'
#' This file demonstrates roxygen2 documentation conventions
#' with `#''` tags for parameters, exports, and examples.
#'
#' @docType package
#' @name math_utils
NULL

#' Add two numbers
#'
#' Returns the sum of two numeric values.
#'
#' @param a A numeric value.
#' @param b A numeric value.
#'
#' @return The sum of \code{a} and \code{b}.
#' @export
#'
#' @examples
#' add(2, 3)
add <- function(a, b) {
  a + b
}

#' Divide two numbers
#'
#' Divides numerator by denominator.
#'
#' @param numerator The value to be divided.
#' @param denominator The value to divide by.
#'
#' @return The quotient of numerator divided by denominator.
#' @export
#'
#' @examples
#' divide(10, 2)
#' \dontrun{
#' divide(1, 0)
#' }
divide <- function(numerator, denominator) {
  if (denominator == 0) stop("Denominator must not be zero")
  numerator / denominator
}

#' Create a 2D point
#'
#' @param x The x-coordinate.
#' @param y The y-coordinate.
#'
#' @return A list with elements \code{x} and \code{y} representing a point.
#' @export
point <- function(x, y) {
  structure(list(x = x, y = y), class = "point")
}

#' Euclidean distance between two points
#'
#' @param p A point created with \code{\link{point}}.
#' @param q Another point.
#'
#' @return The Euclidean distance between \code{p} and \code{q}.
#' @export
#'
#' @examples
#' p <- point(0, 0)
#' q <- point(3, 4)
#' distance(p, q)
distance <- function(p, q) {
  sqrt((p$x - q$x)^2 + (p$y - q$y)^2)
}