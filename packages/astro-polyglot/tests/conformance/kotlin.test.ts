import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("kotlin", "KDoc", [
  path.resolve(import.meta.dirname, "../fixtures/kotlin/src/main/kotlin/MathUtils.kt"),
]);
