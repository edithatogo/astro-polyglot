import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("java", "Javadoc", [
  path.resolve(import.meta.dirname, "../fixtures/java/MathUtils.java"),
]);