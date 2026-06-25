import { describeConformance } from "../helpers/conformance";

describeConformance("julia", "Base.Docs", [
  "tests/fixtures/julia/math_utils.jl",
]);