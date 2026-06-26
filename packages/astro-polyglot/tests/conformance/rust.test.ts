import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("rust", "Rustdoc CommonMark", [path.resolve(import.meta.dirname, "../fixtures/rust/src/lib.rs")]);
