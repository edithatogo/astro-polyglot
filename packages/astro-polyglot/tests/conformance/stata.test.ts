import { describeConformance } from "../helpers/conformance";

describeConformance("stata", ".sthlp help system", ["tests/fixtures/stata/analysis.sthlp"]);
