import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("ruby", "YARD", [
  path.resolve(import.meta.dirname, "../fixtures/ruby/math_utils.rb"),
]);