// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MathUtils",
    products: [
        .library(name: "MathUtils", targets: ["MathUtils"]),
    ],
    targets: [
        .target(name: "MathUtils"),
    ]
)