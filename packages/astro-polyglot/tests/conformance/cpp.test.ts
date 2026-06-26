import { describeConformance } from "../helpers/conformance";

describeConformance("cpp", "Doxygen Javadoc-style", ["tests/fixtures/cpp/doxygen_javadoc.h"]);

describeConformance("cpp", "Doxygen QT-style", ["tests/fixtures/cpp/doxygen_qt.h"]);
