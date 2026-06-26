import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("typescript", "JSDoc", [
  path.resolve(import.meta.dirname, "../fixtures/typescript/typed_module.ts"),
]);
