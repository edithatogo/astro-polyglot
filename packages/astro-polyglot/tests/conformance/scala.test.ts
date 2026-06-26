import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("scala", "Scaladoc", [path.resolve(import.meta.dirname, "../fixtures/scala/MathUtils.scala")]);
