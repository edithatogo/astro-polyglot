"""A minimal typed Python module used as a conformance fixture."""

def greet(name: str) -> str:
    """Return a friendly greeting."""
    return f"Hello, {name}!"


class Calculator:
    """A simple calculator with typed methods."""

    def add(self, a: int, b: int) -> int:
        """Add two integers."""
        return a + b

    def divide(self, a: float, b: float) -> float:
        """Divide two floats."""
        if b == 0.0:
            raise ValueError("Cannot divide by zero")
        return a / b