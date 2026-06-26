import { describeConformance } from "../helpers/conformance";

describeConformance("fortran", "Doxygen", [
  "tests/fixtures/fortran/math_utils.f90",
]);
