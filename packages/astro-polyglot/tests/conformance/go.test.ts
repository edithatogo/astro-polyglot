import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("go", "Go comments", [path.resolve(import.meta.dirname, "../fixtures/go/math.go")]);
