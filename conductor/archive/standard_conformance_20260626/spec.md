# Specification: Standard Conformance & Golden Fixture Testing

## Overview
Validates each handler correctly parses its target docstring **standard** — including hardware platform patterns (CUDA, ROCm, SYCL, Metal, NEON, SVE, OpenCL), Apple patterns (DocC, HeaderDoc, AppleScript), ARM patterns (CMSIS, TrustZone), and FPGA patterns (VHDL, Verilog, Chisel, HLS).

## Existing Handler Standards & Risk

| Handler | Standard(s) | Risk | Platform |
|---------|-------------|------|----------|
| Python | Google/NumPy/Sphinx | Medium | — |
| TypeScript | JSDoc | Low | — |
| Rust | Rustdoc | Low | CUDA via rustc |
| Go | Go comments | Low | — |
| Java | Javadoc | Low | — |
| Kotlin | KDoc | Low | — |
| C# | .NET XML | Low | GPU/CPU via .NET |
| **C++** | **Doxygen** | **Medium** | **CUDA, ROCm, SYCL, OpenMP, NEON, SVE, RISC-V V, HLS, Metal** |
| **Swift** | **DocC** | **Low** | **Metal, CoreML** |
| Julia | Base.Docs | Medium | — |
| R | roxygen2 | Low | — |
| **Scala** | **Scaladoc** | **Low** | **Chisel, SpinalHDL** |
| Ruby | YARD | Low | — |
| Dart | dartdoc | Low | — |
| PHP | PHPDoc | Low | — |
| Elixir | ExDoc | Low | — |
| Stata | .sthlp custom | **High** | — |
| SAS | Macro comments | **High** | — |

## Hardware Doc Pattern Conformance Fixtures

### GPU Platforms (via C++ handler — Doxygen patterns)
| Platform | Doc Pattern | Fixture |
|----------|------------|---------|
| **NVIDIA CUDA** | `/** @brief kernel @param grid @param ... */` | `fixtures/cuda/kernel.cu` |
| **AMD ROCm/HIP** | `/** @brief HIP kernel @param ... */` | `fixtures/hip/kernel.hip` |
| **Intel oneAPI/SYCL** | `/// SYCL kernel @param ...` | `fixtures/sycl/kernel.cpp` |
| **Apple Metal** | `/// Metal kernel @param ...` | `fixtures/metal/kernel.metal` |
| **Vulkan Compute** | `/** @brief compute shader */` | `fixtures/vulkan/shader.comp` |
| **OpenCL** | `/** @brief kernel @param ... */` | `fixtures/opencl/kernel.cl` |
| **OpenMP offload** | `/** @brief offload @param ... */` | `fixtures/omp/target.c` |

### CPU SIMD Platforms (via C++ handler — Doxygen intrinsic doc patterns)
| Platform | Intrinsic Example | Fixture |
|----------|-----------------|---------|
| **x86 SSE/AVX-512** | `_mm_add_ps` | `fixtures/x86/intrinsics.h` |
| **ARM NEON** | `vaddq_f32` | `fixtures/arm/neon.h` |
| **ARM SVE/SVE2** | `svadd_f32` | `fixtures/arm/sve.h` |
| **RISC-V Vector** | `__riscv_vadd` | `fixtures/riscv/vector.h` |
| **WebAssembly SIMD** | `i32x4.add` | `fixtures/wasm/simd.js` (via JS handler) |

### Apple Ecosystem Doc Patterns
| Platform | Handler | Fixture | Pattern |
|----------|---------|---------|---------|
| **Swift DocC** | Swift ✅ | `fixtures/apple/swift.docc` | Symbol links, `- Parameter:`, `- Returns:` |
| **ObjC HeaderDoc** | ObjC (Phase 3) | `fixtures/apple/header.h` | `@interface`, `@property`, `@method` |
| **Obj-C++** | C++ ✅ | `fixtures/apple/objc++.mm` | Mixed C++/ObjC |
| **Metal (MSL)** | C++ ✅ | `fixtures/apple/metal.msl` | MSL kernel docs |
| **AppleScript** | Natural Docs | `fixtures/apple/applescript.applescript` | `(* comment *)` |
| **CoreML** | Swift ✅ | `fixtures/apple/coreml.swift` | MLModel doc patterns |

### ARM Ecosystem Doc Patterns
| Platform | Handler | Fixture | Pattern |
|----------|---------|---------|---------|
| **CMSIS-Core** | C (Phase 3) | `fixtures/arm/cmsis_core.h` | `@brief`, `@details`, `@note` |
| **CMSIS-DSP** | C (Phase 3) | `fixtures/arm/cmsis_dsp.h` | DSP func docs |
| **CMSIS-NN** | C (Phase 3) | `fixtures/arm/cmsis_nn.h` | NN func docs |
| **mbed OS** | C++ ✅ | `fixtures/arm/mbed.cpp` | C++ class docs |
| **TrustZone** | C (Phase 3) | `fixtures/arm/trustzone.c` | Secure/non-secure |

### FPGA/ASIC Doc Patterns
| Platform | Handler | Fixture |
|----------|---------|---------|
| **VHDL** | VHDL (Phase 3) | `fixtures/fpga/entity.vhd` |
| **Verilog/SystemVerilog** | Verilog (Phase 3) | `fixtures/fpga/module.sv` |
| **HLS (Vitis/Quartus)** | C++ ✅ | `fixtures/fpga/hls.cpp` |
| **Chisel** | Scala ✅ | `fixtures/fpga/chisel.scala` |
| **SpinalHDL** | Scala ✅ | `fixtures/fpga/spinal.scala` |
| **nMigen/Amaranth** | Python ✅ | `fixtures/fpga/amaranth.py` |

### AI/NPU Doc Patterns
| Platform | Handler | Fixture |
|----------|---------|---------|
| **TensorRT** | C++ ✅ + Python ✅ | `fixtures/ai/tensorrt.cpp` |
| **OpenVINO** | C++ ✅ + Python ✅ | `fixtures/ai/openvino.cpp` |
| **TFLite** | C++ ✅ + Python ✅ | `fixtures/ai/tflite.cpp` |
| **ONNX Runtime** | C++/Python/C# ✅ | `fixtures/ai/onnx.cpp` |
| **Qualcomm SNPE** | C++ ✅ + Python ✅ | `fixtures/ai/snpe.cpp` |

### Quantum Doc Patterns
| Platform | Handler | Fixture |
|----------|---------|---------|
| **Qiskit** | Python ✅ | `fixtures/quantum/qiskit.py` |
| **Cirq** | Python ✅ | `fixtures/quantum/cirq.py` |
| **PennyLane** | Python ✅ | `fixtures/quantum/pennylane.py` |
| **Q#** | Q# (Phase 3) | `fixtures/quantum/qsharp.qs` |

## Acceptance Criteria
1. Each handler has golden fixture source files using standard-compliant docstrings
2. `describeConformance(language, standard)` test helper exists
3. Hardware platform fixtures cover: CUDA, ROCm, SYCL, Metal, NEON, SVE, RISC-V V, OpenCL, OpenMP, Vulkan
4. Apple fixtures cover: Swift DocC, ObjC HeaderDoc, Metal MSL, AppleScript, CoreML, Obj-C++
5. ARM fixtures cover: CMSIS-Core/DSP/NN, mbed, TrustZone
6. FPGA fixtures cover: VHDL, Verilog, HLS, Chisel, SpinalHDL, Amaranth
7. AI/NPU fixtures cover: TensorRT, OpenVINO, TFLite, ONNX Runtime, SNPE
8. Quantum fixtures cover: Qiskit, Cirq, PennyLane, Q#
9. All fixtures pass conformance for their respective handlers
10. Stata + SAS coverage >=90%
11. Test runner auto-skips handlers with missing CLI toolchains