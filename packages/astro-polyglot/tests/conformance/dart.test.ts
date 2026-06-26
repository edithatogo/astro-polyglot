import path from "node:path";
import { describeConformance } from "../helpers/conformance";

describeConformance("dart", "dartdoc", [path.resolve(import.meta.dirname, "../fixtures/dart/math_utils.dart")]);
