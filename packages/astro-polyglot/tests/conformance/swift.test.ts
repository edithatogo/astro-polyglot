import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("swift", "DocC", [
  path.resolve(import.meta.dirname, "../fixtures/swift/Sources/MathUtils/MathUtils.swift"),
]);
