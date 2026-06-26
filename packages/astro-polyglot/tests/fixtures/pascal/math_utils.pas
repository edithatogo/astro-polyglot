/**
 * @brief A simple math utility unit.
 */
unit MathUtils;

interface

  /**
   * @brief Add two integers.
   * @param a First operand.
   * @param b Second operand.
   * @return The sum.
   */
  function Add(a, b: Integer): Integer;

implementation

  function Add(a, b: Integer): Integer;
  begin
    Add := a + b;
  end;

end.
