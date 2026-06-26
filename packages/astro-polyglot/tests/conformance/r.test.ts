import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("r", "roxygen2", [path.resolve(import.meta.dirname, "../fixtures/r/math_utils.R")]);
