import { describeConformance } from "../helpers/conformance";

describeConformance("python", "Google-style", ["tests/fixtures/python/google_style.py"]);

describeConformance("python", "NumPy-style", ["tests/fixtures/python/numpy_style.py"]);

describeConformance("python", "Sphinx reST", ["tests/fixtures/python/sphinx_style.py"]);
