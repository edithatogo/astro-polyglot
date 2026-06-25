//! Extract Rust crate documentation using rustdoc JSON output.
//! Outputs JSON matching the ASTModule schema from starlight-polyglot.
//!
//! Usage:
//!     cd scripts/rust_extract && cargo run -- --crate-path /path/to/crate
//!
//! This script:
//!   1. Runs `cargo +nightly doc --no-deps --document-private-items --output-format json`
//!   2. Parses the generated JSON file at target/doc/<crate_name>.json
//!   3. Outputs the ASTModule JSON structure to stdout

use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, exit};

use serde::{Deserialize, Serialize};

// ── ASTModule schema (mirrors mdx-generator.ts) ─────────────────────────

#[derive(Serialize, Deserialize, Debug)]
struct ASTModule {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    docstring: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    classes: Option<Vec<ASTClass>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    functions: Option<Vec<ASTFunction>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    variables: Option<Vec<ASTVariable>>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ASTClass {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    docstring: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    methods: Option<Vec<ASTFunction>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    properties: Option<Vec<ASTVariable>>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ASTFunction {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    docstring: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parameters: Option<Vec<ASTParameter>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    return_type: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ASTParameter {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "type")]
    param_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    default: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ASTVariable {
    name: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "type")]
    var_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    docstring: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct ExtractionError {
    entry_point: String,
    error: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Output {
    #[serde(skip_serializing_if = "Option::is_none")]
    modules: Option<Vec<ASTModule>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    errors: Option<Vec<ExtractionError>>,
}

// ── RustDoc JSON schema types ────────────────────────────────────────────

#[derive(Deserialize, Debug)]
struct RustDocCrate {
    root: String,
    version: String,
}

#[derive(Deserialize, Debug)]
struct RustDocDecl {
    #[serde(default)]
    params: Option<Vec<RustDocParam>>,
    output: Option<RustDocType>,
}

#[derive(Deserialize, Debug)]
struct RustDocParam {
    name: String,
    #[serde(rename = "type")]
    param_type: String,
}

#[derive(Deserialize, Debug)]
struct RustDocType {
    name: Option<String>,
    kind: Option<String>,
}

#[derive(Deserialize, Debug)]
struct RustDocHeader {
    constness: Option<String>,
    asyncness: Option<String>,
    safety: Option<String>,
    abi: Option<String>,
}

#[derive(Deserialize, Debug)]
struct RustDocItem {
    id: String,
    crate_id: u32,
    name: Option<String>,
    kind: String,
    visibility: Option<String>,
    docs: Option<String>,
    #[serde(default)]
    inner: Option<Vec<RustDocItem>>,
    decl: Option<RustDocDecl>,
    header: Option<RustDocHeader>,
}

#[derive(Deserialize, Debug)]
struct RustDocOutput {
    format_version: u32,
    #[serde(rename = "crate")]
    crate_info: RustDocCrate,
    index: HashMap<String, RustDocItem>,
}


// ── Extraction helpers ──────────────────────────────────────────────────

fn build_rust_signature(item: &RustDocItem) -> Option<String> {
    let decl = item.decl.as_ref()?;
    let params = decl.params.as_ref().map(|p| {
        p.iter().map(|p| format!("{}: {}", p.name, p.param_type))
            .collect::<Vec<_>>().join(", ")
    }).unwrap_or_default();
    let output = decl.output.as_ref().and_then(|o| o.name.as_deref()).unwrap_or("");
    let header = item.header.as_ref();
    let mut prefix = String::new();
    if let Some(h) = header {
        if h.asyncness.as_deref() == Some("async") { prefix.push_str("async "); }
        if h.safety.as_deref() == Some("unsafe") { prefix.push_str("unsafe "); }
    }
    let name = item.name.as_deref().unwrap_or("unknown");
    if !output.is_empty() && output != "()" && output != "unit" {
        Some(format!("{}fn {}({}) -> {}", prefix, name, params, output))
    } else {
        Some(format!("{}fn {}({})", prefix, name, params))
    }
}

fn extract_rust_parameters(item: &RustDocItem) -> Option<Vec<ASTParameter>> {
    let params = item.decl.as_ref()?.params.as_ref()?;
    if params.is_empty() { return None; }
    Some(params.iter().map(|p| ASTParameter {
        name: p.name.clone(),
        param_type: Some(p.param_type.clone()),
        description: None, default: None,
    }).collect())
}

fn extract_module(item: &RustDocItem) -> ASTModule {
    let mut m = ASTModule {
        name: item.name.clone().unwrap_or_else(|| "unknown".to_string()),
        docstring: item.docs.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
        classes: Some(vec![]), functions: Some(vec![]), variables: Some(vec![]),
    };
    if let Some(children) = &item.inner {
        for child in children {
            match child.kind.as_str() {
                "struct" | "enum" | "union" | "trait" => {
                    let mut cls = ASTClass {
                        name: child.name.clone().unwrap_or_else(|| "unknown".to_string()),
                        docstring: child.docs.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
                        methods: Some(vec![]), properties: Some(vec![]),
                    };
                    if let Some(fields) = &child.inner {
                        for field in fields {
                            match field.kind.as_str() {
                                "field" => {
                                    let ft = field.decl.as_ref().and_then(|d| d.output.as_ref()).and_then(|o| o.name.clone());
                                    cls.properties.as_mut().unwrap().push(ASTVariable {
                                        name: field.name.clone().unwrap_or_else(|| "unknown".to_string()),
                                        var_type: ft,
                                        docstring: field.docs.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
                                    });
                                }
                                "method" => {
                                    cls.methods.as_mut().unwrap().push(ASTFunction {
                                        name: field.name.clone().unwrap_or_else(|| "unknown".to_string()),
                                        signature: build_rust_signature(field),
                                        docstring: field.docs.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
                                        parameters: extract_rust_parameters(field),
                                        return_type: extract_return_type(field),
                                    });
                                }
                                _ => {}
                            }
                        }
                    }
                    m.classes.as_mut().unwrap().push(cls);
                }
                "function" => {
                    m.functions.as_mut().unwrap().push(ASTFunction {
                        name: child.name.clone().unwrap_or_else(|| "unknown".to_string()),
                        signature: build_rust_signature(child),
                        docstring: child.docs.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
                        parameters: extract_rust_parameters(child),
                        return_type: extract_return_type(child),
                    });
                }
                "constant" | "static" => {
                    let vt = child.decl.as_ref().and_then(|d| d.output.as_ref()).and_then(|o| o.name.clone());
                    m.variables.as_mut().unwrap().push(ASTVariable {
                        name: child.name.clone().unwrap_or_else(|| "unknown".to_string()),
                        var_type: vt,
                        docstring: child.docs.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
                    });
                }
                _ => {}
            }
        }
    }
    if m.classes.as_ref().map_or(true, |c| c.is_empty()) { m.classes = None; }
    if m.functions.as_ref().map_or(true, |c| c.is_empty()) { m.functions = None; }
    if m.variables.as_ref().map_or(true, |c| c.is_empty()) { m.variables = None; }
    m
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let crate_path_str = if args.len() > 1 && args[1] == "--crate-path" {
        args.get(2).cloned()
    } else {
        None
    }.unwrap_or_else(|| {
        let err = Output { modules: None, errors: Some(vec![ExtractionError {
            entry_point: "".into(),
            error: "No --crate-path argument. Usage: cargo run -- --crate-path /path/to/crate".into(),
        }])};
        println!("{}", serde_json::to_string_pretty(&err).unwrap());
        exit(1);
    });

    let crate_path = Path::new(&crate_path_str);
    if !crate_path.exists() {
        let err = Output { modules: None, errors: Some(vec![ExtractionError {
            entry_point: crate_path_str.clone(),
            error: format!("Crate path does not exist: {}", crate_path.display()),
        }])};
        println!("{}", serde_json::to_string_pretty(&err).unwrap());
        exit(1);
    }

    let crate_name = crate_path.file_name().and_then(|s| s.to_str()).unwrap_or("crate");

    let manifest = if crate_path.join("Cargo.toml").exists() {
        crate_path.join("Cargo.toml")
    } else if crate_path.extension().map_or(false, |e| e == "toml") {
        crate_path.to_path_buf()
    } else {
        let err = Output { modules: None, errors: Some(vec![ExtractionError {
            entry_point: crate_path_str.clone(),
            error: "No Cargo.toml found in the specified path".into(),
        }])};
        println!("{}", serde_json::to_string_pretty(&err).unwrap());
        exit(1);
    };

    // Run cargo doc with JSON output format
    let status = Command::new("cargo")
        .args(["+nightly", "doc", "--no-deps",
               "--document-private-items", "--output-format", "json"])
        .arg("--manifest-path").arg(&manifest)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    match status {
        Ok(s) if !s.success() => {
            let err = Output { modules: None, errors: Some(vec![ExtractionError {
                entry_point: crate_path_str.clone(),
                error: format!("cargo doc failed with exit code: {:?}", s.code()),
            }])};
            println!("{}", serde_json::to_string_pretty(&err).unwrap());
            exit(1);
        }
        Err(e) => {
            let err = Output { modules: None, errors: Some(vec![ExtractionError {
                entry_point: crate_path_str.clone(),
                error: format!("Failed to run cargo doc: {}", e),
            }])};
            println!("{}", serde_json::to_string_pretty(&err).unwrap());
            exit(1);
        }
        _ => {}
    }

    // Find and parse the JSON output
    let json_path = match find_rustdoc_json(crate_path, crate_name) {
        Some(p) => p,
        None => {
            let err = Output { modules: None, errors: Some(vec![ExtractionError {
                entry_point: crate_path_str.clone(),
                error: "Could not find rustdoc JSON output in target/doc/".into(),
            }])};
            println!("{}", serde_json::to_string_pretty(&err).unwrap());
            exit(1);
        }
    };

    let json_content = match fs::read_to_string(&json_path) {
        Ok(c) => c,
        Err(e) => {
            let err = Output { modules: None, errors: Some(vec![ExtractionError {
                entry_point: json_path.to_string_lossy().to_string(),
                error: format!("Failed to read JSON output: {}", e),
            }])};
            println!("{}", serde_json::to_string_pretty(&err).unwrap());
            exit(1);
        }
    };

    let rustdoc: RustDocOutput = match serde_json::from_str(&json_content) {
        Ok(d) => d,
        Err(e) => {
            let err = Output { modules: None, errors: Some(vec![ExtractionError {
                entry_point: json_path.to_string_lossy().to_string(),
                error: format!("Failed to parse rustdoc JSON: {}", e),
            }])};
            println!("{}", serde_json::to_string_pretty(&err).unwrap());
            exit(1);
        }
    };

    // Extract all modules from the index
    let mut modules: Vec<ASTModule> = vec![];
    let mut seen_names = std::collections::HashSet::new();
    for item in rustdoc.index.values() {
        if item.kind == "module" || item.kind == "crate" {
            let name = item.name.clone().unwrap_or_default();
            if !seen_names.contains(&name) {
                seen_names.insert(name);
                modules.push(extract_module(item));
            }
        }
    }

    let output = Output {
        modules: if modules.is_empty() { None } else { Some(modules) },
        errors: None,
    };
    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}

fn find_rustdoc_json(crate_path: &Path, crate_name: &str) -> Option<PathBuf> {
    let c = crate_path.join("target/doc").join(format!("{crate_name}.json"));
    if c.exists() { return Some(c); }
    if let Some(parent) = crate_path.parent() {
        let c = parent.join("target/doc").join(format!("{crate_name}.json"));
        if c.exists() { return Some(c); }
    }
    for dd in &[crate_path.join("target/doc"), crate_path.parent().map(|p| p.join("target/doc")).unwrap_or_default()] {
        if dd.exists() {
            if let Ok(entries) = fs::read_dir(dd) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "json") {
                        let fname = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                        if !fname.starts_with('.') { return Some(path); }
                    }
                }
            }
        }
    }
    None
}


fn extract_return_type(item: &RustDocItem) -> Option<String> {
    item.decl.as_ref()?.output.as_ref()?.name.clone()
}
