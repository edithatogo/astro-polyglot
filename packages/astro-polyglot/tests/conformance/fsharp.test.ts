import { describeConformance } from "../helpers/conformance";

describeConformance("fsharp", ".NET XML", [
  "tests/fixtures/fsharp/math_utils.fs",
]);
