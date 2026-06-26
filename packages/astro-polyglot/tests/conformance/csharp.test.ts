import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("csharp", ".NET XML", [path.resolve(import.meta.dirname, "../fixtures/csharp/MathUtils.cs")]);
