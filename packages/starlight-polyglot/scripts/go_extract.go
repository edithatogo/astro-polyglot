//go:build ignore
// +build ignore

// Extract Go package documentation using go/doc and go/parser.
// Outputs JSON matching the ASTModule schema from starlight-polyglot.
//
// Usage:
//     go run scripts/go_extract.go --module-path ./...
//
// This script:
//   1. Walks the given module/package path
//   2. Uses go/doc to extract documentation from each package
//   3. Outputs ASTModule JSON structure to stdout

package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/doc"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

// ── ASTModule schema (mirrors mdx-generator.ts) ─────────────────────────

type ASTModule struct {
	Name      string        `json:"name"`
	Docstring *string       `json:"docstring,omitempty"`
	Classes   []ASTClass    `json:"classes,omitempty"`
	Functions []ASTFunction `json:"functions,omitempty"`
	Variables []ASTVariable `json:"variables,omitempty"`
}

type ASTClass struct {
	Name       string         `json:"name"`
	Docstring  *string        `json:"docstring,omitempty"`
	Methods    []ASTFunction  `json:"methods,omitempty"`
	Properties []ASTVariable  `json:"properties,omitempty"`
}

type ASTFunction struct {
	Name       string         `json:"name"`
	Signature  *string        `json:"signature,omitempty"`
	Docstring  *string        `json:"docstring,omitempty"`
	Parameters []ASTParameter `json:"parameters,omitempty"`
	ReturnType *string        `json:"return_type,omitempty"`
}

type ASTParameter struct {
	Name        string  `json:"name"`
	Type        *string `json:"type,omitempty"`
	Description *string `json:"description,omitempty"`
	Default     *string `json:"default,omitempty"`
}

type ASTVariable struct {
	Name      string  `json:"name"`
	Type      *string `json:"type,omitempty"`
	Docstring *string `json:"docstring,omitempty"`
}

type ExtractionError struct {
	EntryPoint string `json:"entry_point"`
	Error      string `json:"error"`
}

type Output struct {
	Modules []ASTModule       `json:"modules,omitempty"`
	Errors  []ExtractionError `json:"errors,omitempty"`
}

// ── Helpers ─────────────────────────────────────────────────────────────

func strPtr(s string) *string {
	if s == "" { return nil }
	return &s
}

func exprString(expr ast.Expr) string {
	switch e := expr.(type) {
	case *ast.Ident:      return e.Name
	case *ast.StarExpr:   return "*" + exprString(e.X)
	case *ast.SelectorExpr: return exprString(e.X) + "." + e.Sel.Name
	case *ast.ArrayType:  return "[]" + exprString(e.Elt)
	case *ast.MapType:    return "map[" + exprString(e.Key) + "]" + exprString(e.Value)
	case *ast.InterfaceType: return "interface{}"
	case *ast.Ellipsis:   return "..." + exprString(e.Elt)
	case *ast.FuncType:   return "func"
	default:              return fmt.Sprintf("%T", e)
	}
}


func buildFuncSignature(fn *doc.Func) *string {
	if fn == nil || fn.Decl == nil || fn.Decl.Type == nil { return nil }
	parts := []string{}
	if fn.Decl.Type.Params != nil {
		for _, param := range fn.Decl.Type.Params.List {
			typeStr := exprString(param.Type)
			for _, name := range param.Names {
				parts = append(parts, fmt.Sprintf("%s %s", name.Name, typeStr))
			}
		}
	}
	params := strings.Join(parts, ", ")
	sig := fmt.Sprintf("%s(%s)", fn.Name, params)
	if fn.Decl.Type.Results != nil && len(fn.Decl.Type.Results.List) > 0 {
		resultParts := []string{}
		for _, r := range fn.Decl.Type.Results.List {
			resultParts = append(resultParts, exprString(r.Type))
		}
		sig += " " + strings.Join(resultParts, ", ")
	}
	return strPtr(sig)
}

func extractFuncParams(fn *doc.Func) []ASTParameter {
	if fn == nil || fn.Decl == nil || fn.Decl.Type == nil || fn.Decl.Type.Params == nil {
		return nil
	}
	var params []ASTParameter
	for _, p := range fn.Decl.Type.Params.List {
		typeStr := exprString(p.Type)
		for _, name := range p.Names {
			t := typeStr
			params = append(params, ASTParameter{Name: name.Name, Type: &t})
		}
	}
	return params
}

func extractReturnType(fn *doc.Func) *string {
	if fn == nil || fn.Decl == nil || fn.Decl.Type == nil || fn.Decl.Type.Results == nil {
		return nil
	}
	var types []string
	for _, r := range fn.Decl.Type.Results.List {
		types = append(types, exprString(r.Type))
	}
	if len(types) == 0 { return nil }
	return strPtr(strings.Join(types, ", "))
}


// ── Package extraction ──────────────────────────────────────────────────

func extractPackage(pkgPath string) (*ASTModule, error) {
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, pkgPath, nil, parser.ParseComments)
	if err != nil { return nil, fmt.Errorf("failed to parse %s: %w", pkgPath, err) }
	var astPkg *ast.Package
	for _, p := range pkgs {
		if astPkg == nil || p.Name == "main" { astPkg = p }
	}
	if astPkg == nil { return nil, fmt.Errorf("no Go package found in %s", pkgPath) }
	docPkg := doc.New(astPkg, pkgPath, doc.AllDecls)

	modName := docPkg.Name
	if modName == "" { modName = filepath.Base(pkgPath) }
	mod := ASTModule{Name: modName}
	if docPkg.Doc != "" { d := strings.TrimSpace(docPkg.Doc); mod.Docstring = &d }

	for _, fn := range docPkg.Funcs {
		fnInfo := ASTFunction{
			Name: fn.Name, Signature: buildFuncSignature(fn),
			Parameters: extractFuncParams(fn), ReturnType: extractReturnType(fn),
		}
		if fn.Doc != "" { d := strings.TrimSpace(fn.Doc); fnInfo.Docstring = &d }
		mod.Functions = append(mod.Functions, fnInfo)
	}

	for _, t := range docPkg.Types {
		cls := ASTClass{Name: t.Name}
		if t.Doc != "" { d := strings.TrimSpace(t.Doc); cls.Docstring = &d }
		for _, m := range t.Methods {
			method := ASTFunction{
				Name: m.Name, Signature: buildFuncSignature(m),
				Parameters: extractFuncParams(m), ReturnType: extractReturnType(m),
			}
			if m.Doc != "" { d := strings.TrimSpace(m.Doc); method.Docstring = &d }
			cls.Methods = append(cls.Methods, method)
		}
		if t.Decl != nil {
			for _, spec := range t.Decl.Specs {
				if typeSpec, ok := spec.(*ast.TypeSpec); ok {
					if structType, ok := typeSpec.Type.(*ast.StructType); ok {
						for _, field := range structType.Fields.List {
							fieldType := exprString(field.Type)
							for _, name := range field.Names {
								prop := ASTVariable{Name: name.Name, Type: &fieldType}
								if field.Doc != nil {
									if d := strings.TrimSpace(field.Doc.Text()); d != "" { prop.Docstring = &d }
								}
								cls.Properties = append(cls.Properties, prop)
							}
						}
					}
				}
			}
		}
		mod.Classes = append(mod.Classes, cls)
	}

	for _, v := range docPkg.Consts {
		for _, name := range v.Names {
			vi := ASTVariable{Name: name, Type: strPtr("const")}
			if v.Doc != "" { d := strings.TrimSpace(v.Doc); vi.Docstring = &d }
			mod.Variables = append(mod.Variables, vi)
		}
	}
	for _, v := range docPkg.Vars {
		for _, name := range v.Names {
			vi := ASTVariable{Name: name, Type: strPtr("var")}
			if v.Doc != "" { d := strings.TrimSpace(v.Doc); vi.Docstring = &d }
			mod.Variables = append(mod.Variables, vi)
		}
	}

	if len(mod.Classes) == 0 { mod.Classes = nil }
	if len(mod.Functions) == 0 { mod.Functions = nil }
	if len(mod.Variables) == 0 { mod.Variables = nil }
	return &mod, nil
}

func walkPackages(modulePath string) ([]ASTModule, error) {
	var modules []ASTModule
	err := filepath.Walk(modulePath, func(path string, info os.FileInfo, err error) error {
		if err != nil { return err }
		if !info.IsDir() { return nil }
		if strings.HasPrefix(info.Name(), ".") || info.Name() == "vendor" || info.Name() == "testdata" {
			return filepath.SkipDir
		}
		entries, err := os.ReadDir(path)
		if err != nil { return nil }
		hasGo := false
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".go") { hasGo = true; break }
		}
		if !hasGo { return nil }
		mod, err := extractPackage(path)
		if err != nil { return nil }
		modules = append(modules, *mod)
		return nil
	})
	return modules, err
}

func main() {
	modulePath := flag.String("module-path", "", "Go module or package path")
	output := flag.String("output", "", "Output file path (default: stdout)")
	flag.Parse()

	if *modulePath == "" {
		b, _ := json.MarshalIndent(Output{Errors: []ExtractionError{{EntryPoint: "", Error: "No --module-path argument"}}}, "", "  ")
		fmt.Println(string(b)); os.Exit(1)
	}

	resolvedPath := *modulePath
	if !filepath.IsAbs(resolvedPath) {
		if cwd, err := os.Getwd(); err == nil { resolvedPath = filepath.Join(cwd, resolvedPath) }
	}

	info, err := os.Stat(resolvedPath)
	if err != nil {
		b, _ := json.MarshalIndent(Output{Errors: []ExtractionError{{EntryPoint: *modulePath, Error: err.Error()}}}, "", "  ")
		fmt.Println(string(b)); os.Exit(1)
	}

	var modules []ASTModule
	if info.IsDir() {
		modules, err = walkPackages(resolvedPath)
	} else {
		var mod *ASTModule
		mod, err = extractPackage(filepath.Dir(resolvedPath))
		if err == nil { modules = append(modules, *mod) }
	}
	if err != nil {
		b, _ := json.MarshalIndent(Output{Errors: []ExtractionError{{EntryPoint: *modulePath, Error: err.Error()}}}, "", "  ")
		fmt.Println(string(b)); os.Exit(1)
	}

	out := Output{}
	if len(modules) > 0 { out.Modules = modules }
	b, err := json.MarshalIndent(out, "", "  ")
	if err != nil { fmt.Fprintf(os.Stderr, "JSON error: %s\n", err); os.Exit(1) }
	if *output != "" { os.WriteFile(*output, b, 0644) } else { fmt.Println(string(b)) }
}
