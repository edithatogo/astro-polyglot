defmodule MathUtils do
  @moduledoc """
  A utility module providing mathematical operations.

  This file demonstrates ExDoc documentation conventions
  with `@moduledoc`, `@doc`, and `@spec` annotations.
  """

  @doc """
  Adds two integers and returns the result.

  ## Parameters

    - a: The first operand.
    - b: The second operand.

  ## Returns

  The sum of `a` and `b`.
  """
  @spec add(integer, integer) :: integer
  def add(a, b) do
    a + b
  end

  @doc """
  Divides one float by another.

  ## Parameters

    - numerator: The value to be divided.
    - denominator: The value to divide by.

  ## Returns

  The quotient of `numerator` divided by `denominator`.

  ## Raises

    - `ArithmeticError` if denominator is zero.
  """
  @spec divide(float, float) :: float
  def divide(numerator, denominator) do
    if denominator == 0.0 do
      raise ArithmeticError, "Denominator must not be zero"
    end
    numerator / denominator
  end

  @doc """
  Returns the larger of two integers.
  """
  @spec max(integer, integer) :: integer
  def max(a, b) do
    if a >= b, do: a, else: b
  end
end

defmodule MathUtils.Point do
  @moduledoc """
  A 2D point with x and y coordinates.
  """

  defstruct [:x, :y]

  @doc """
  Creates a new Point at the given coordinates.

  ## Parameters

    - x: The x-coordinate.
    - y: The y-coordinate.
  """
  @spec new(float, float) :: %__MODULE__{}
  def new(x, y) do
    %__MODULE__{x: x, y: y}
  end

  @doc """
  Computes the Euclidean distance to another point.

  ## Parameters

    - other: The other point.

  ## Returns

  The distance between this point and the other point.
  """
  @spec distance_to(%__MODULE__{}, %__MODULE__{}) :: float
  def distance_to(%__MODULE__{x: x1, y: y1}, %__MODULE__{x: x2, y: y2}) do
    :math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
  end
end