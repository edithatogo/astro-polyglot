#!/usr/bin/env python3
"""
Extract Python docstrings from a module or package using Griffe.
Outputs a JSON structure matching the ASTModule interface defined in
starlight-polyglot's mdx-generator.ts.

Usage:
    python3 python_extract.py --entry-points pkg1 pkg2 --output output.json
"""

import argparse
import json
import sys
from typing import Any

try:
    from griffe import load
    try:
        from griffe.dataclasses import Class, Function, Module
    except ModuleNotFoundError:
        from griffe import Class, Function, Module
except ImportError:
    print(json.dumps({"error": "griffe not installed. Run: pip install griffe"}))
    sys.exit(1)


def extract_module(griffe_mod: Module) -> dict[str, Any]:
    """Extract a griffe Module into our ASTModule JSON schema."""
    result: dict[str, Any] = {
        "name": griffe_mod.name,
        "docstring": griffe_mod.docstring.value if griffe_mod.docstring else None,
        "classes": [],
        "functions": [],
        "variables": [],
    }

    for member in griffe_mod.members.values():
        if isinstance(member, Class):
            result["classes"].append(extract_class(member))
        elif isinstance(member, Function):
            result["functions"].append(extract_function(member))

    return result


def extract_class(griffe_cls: Class) -> dict[str, Any]:
    """Extract a griffe Class into our ASTClass JSON schema."""
    result: dict[str, Any] = {
        "name": griffe_cls.name,
        "docstring": griffe_cls.docstring.value if griffe_cls.docstring else None,
        "methods": [],
        "properties": [],
    }

    for member in griffe_cls.members.values():
        if isinstance(member, Function):
            result["methods"].append(extract_function(member))

    return result


def extract_function(griffe_fn: Function) -> dict[str, Any]:
    """Extract a griffe Function into our ASTFunction JSON schema."""
    result: dict[str, Any] = {
        "name": griffe_fn.name,
        "docstring": griffe_fn.docstring.value if griffe_fn.docstring else None,
        "parameters": [],
    }

    # Build signature string
    params = []
    for param in griffe_fn.parameters or []:
        param_info = {
            "name": param.name,
            "type": str(param.annotation) if param.annotation else None,
            "description": None,
            "default": None,
        }
        if param.default is not None:
            param_info["default"] = str(param.default)
        result["parameters"].append(param_info)
        params.append(str(param))

    if griffe_fn.returns:
        result["signature"] = (
            f"{griffe_fn.name}({', '.join(params)}) -> {griffe_fn.returns}"
        )
        result["return_type"] = str(griffe_fn.returns)
    else:
        result["signature"] = f"{griffe_fn.name}({', '.join(params)})"

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract Python docstrings via Griffe")
    parser.add_argument(
        "--entry-points",
        nargs="+",
        required=True,
        help="Python module/package paths to document",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON file path (default: stdout)",
    )
    args = parser.parse_args()

    modules = []
    errors = []

    for entry_point in args.entry_points:
        try:
            griffe_mod = load(entry_point)
            modules.append(extract_module(griffe_mod))
        except Exception as e:
            errors.append({"entry_point": entry_point, "error": str(e)})

    output = {
        "modules": modules,
        "errors": errors if errors else None,
    }

    output_json = json.dumps(output, indent=2, default=str)
    if args.output:
        with open(args.output, "w") as f:
            f.write(output_json)
    else:
        print(output_json)

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
