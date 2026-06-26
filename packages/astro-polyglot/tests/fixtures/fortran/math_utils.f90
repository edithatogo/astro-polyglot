!> @brief A module for mathematical operations.
module math_utils
  implicit none

contains

  !> @brief Add two real numbers.
  !! @param a First operand.
  !! @param b Second operand.
  !! @return The sum of a and b.
  function add(a, b) result(sum)
    real, intent(in) :: a, b
    real :: sum
    sum = a + b
  end function add

end module math_utils
