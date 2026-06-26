# /**
#  * @brief A simple math utility library in Tcl.
#  */

# /**
#  * @brief Add two numbers.
#  * @param a First number.
#  * @param b Second number.
#  * @return The sum.
#  */
proc add {a b} {
    return [expr {$a + $b}]
}
