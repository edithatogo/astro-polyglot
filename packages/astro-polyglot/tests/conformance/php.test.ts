import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("php", "PHPDoc", [
  path.resolve(import.meta.dirname, "../fixtures/php/MathUtils.php"),
]);