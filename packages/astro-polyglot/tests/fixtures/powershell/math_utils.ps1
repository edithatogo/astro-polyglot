<#
.SYNOPSIS
    A simple math utility module.
.DESCRIPTION
    Provides functions for basic arithmetic operations.
#>

<#
.SYNOPSIS
    Add two numbers.
.PARAMETER a
    First operand.
.PARAMETER b
    Second operand.
.EXAMPLE
    Add-TwoNumbers 1 2
#>
function Add-TwoNumbers {
    param($a, $b)
    return $a + $b
}
