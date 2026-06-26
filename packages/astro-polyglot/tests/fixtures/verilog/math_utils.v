/**
 * @brief A simple math module in Verilog.
 */

/**
 * @brief Add two 32-bit values.
 * @param a First operand.
 * @param b Second operand.
 * @return The sum.
 */
function [31:0] add;
  input [31:0] a, b;
  begin
    add = a + b;
  end
endfunction
