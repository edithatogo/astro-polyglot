--! @brief A simple math package for VHDL.
library ieee;
use ieee.std_logic_1164.all;

package math_utils is

  --! @brief Add two std_logic_vector values.
  --! @param a First operand.
  --! @param b Second operand.
  --! @return The sum.
  function add(a, b : std_logic_vector) return std_logic_vector;

end package math_utils;
