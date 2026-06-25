module MathUtils

"""
    add(a, b)

Compute the sum of two numbers.

# Arguments
- `a::Number`: The first addend.
- `b::Number`: The second addend.

# Returns
The sum of `a` and `b`.

# Examples
```julia-repl
julia> add(2, 3)
5
```
"""
function add(a::Number, b::Number)
    return a + b
end

"""
    divide(a, b)

Divide two numbers with error handling.

# Arguments
- `a::Number`: The dividend.
- `b::Number`: The divisor.

# Returns
The quotient of `a` divided by `b`.

# Throws
- `DivideError`: If `b` is zero.
"""
function divide(a::Number, b::Number)
    if b == 0
        error("Division by zero")
    end
    return a / b
end

end