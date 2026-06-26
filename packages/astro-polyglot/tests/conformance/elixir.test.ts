import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("elixir", "ExDoc", [path.resolve(import.meta.dirname, "../fixtures/elixir/lib/math_utils.ex")]);
