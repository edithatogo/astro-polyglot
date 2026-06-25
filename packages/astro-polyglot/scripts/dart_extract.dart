#!/usr/bin/env dart
/// dart_extract.dart
/// Extract Dart documentation using regex-based parser (no external deps).
/// Outputs JSON matching the ASTModule schema from starlight-polyglot.
///
/// Usage:
///     dart run scripts/dart_extract.dart entry_point1.dart
///
/// Dependencies: Base Dart SDK only (no pub packages required).

import 'dart:convert';
import 'dart:io';

class ASTModule {
  final String name;
  final String? docstring;
  final List<ASTClass>? classes;
  final List<ASTFunction>? functions;
  final List<ASTVariable>? variables;
  ASTModule({required this.name, this.docstring, this.classes,
    this.functions, this.variables});
  Map<String, dynamic> toJson() => {
    'name': name, if (docstring != null) 'docstring': docstring,
    if (classes != null && classes!.isNotEmpty)
      'classes': classes!.map((c) => c.toJson()).toList(),
    if (functions != null && functions!.isNotEmpty)
      'functions': functions!.map((f) => f.toJson()).toList(),
    if (variables != null && variables!.isNotEmpty)
      'variables': variables!.map((v) => v.toJson()).toList(),
  };
}

class ASTClass {
  final String name; final String? docstring;
  final List<ASTFunction>? methods; final List<ASTVariable>? properties;
  ASTClass({required this.name, this.docstring, this.methods, this.properties});
  Map<String, dynamic> toJson() => {
    'name': name, if (docstring != null) 'docstring': docstring,
    if (methods != null && methods!.isNotEmpty)
      'methods': methods!.map((m) => m.toJson()).toList(),
    if (properties != null && properties!.isNotEmpty)
      'properties': properties!.map((p) => p.toJson()).toList(),
  };
}

class ASTFunction {
  final String name; final String? signature; final String? docstring;
  final List<ASTParameter>? parameters; final String? returnType;
  ASTFunction({required this.name, this.signature, this.docstring,
    this.parameters, this.returnType});
  Map<String, dynamic> toJson() => {
    'name': name, if (signature != null) 'signature': signature,
    if (docstring != null) 'docstring': docstring,
    if (parameters != null && parameters!.isNotEmpty)
      'parameters': parameters!.map((p) => p.toJson()).toList(),
    if (returnType != null) 'return_type': returnType,
  };
}

class ASTParameter {
  final String name; final String? type; final String? description;
  final String? defaultVal;
  ASTParameter({required this.name, this.type, this.description, this.defaultVal});
  Map<String, dynamic> toJson() => {
    'name': name, if (type != null) 'type': type,
    if (description != null) 'description': description,
    if (defaultVal != null) 'default': defaultVal,
  };
}

class ASTVariable {
  final String name; final String? type; final String? docstring;
  ASTVariable({required this.name, this.type, this.docstring});
  Map<String, dynamic> toJson() => {
    'name': name, if (type != null) 'type': type,
    if (docstring != null) 'docstring': docstring,
  };
}

class ExtractionError {
  final String entryPoint; final String error;
  ExtractionError({required this.entryPoint, required this.error});
  Map<String, dynamic> toJson() => {'entry_point': entryPoint, 'error': error};
}

class Output {
  final List<ASTModule>? modules; final List<ExtractionError>? errors;
  Output({this.modules, this.errors});
  Map<String, dynamic> toJson() => {
    if (modules != null && modules!.isNotEmpty)
      'modules': modules!.map((m) => m.toJson()).toList(),
    if (errors != null && errors!.isNotEmpty)
      'errors': errors!.map((e) => e.toJson()).toList(),
  };
}

ASTModule extractFile(String filePath) {
  final content = File(filePath).readAsStringSync();
  final modName = filePath.split(RegExp(r'[/\\]')).last.replaceAll('.dart', '');
  final classes = <ASTClass>[];
  final functions = <ASTFunction>[];
  final variables = <ASTVariable>[];
  final lines = content.split('\n');
  String? currentDoc;
  bool inBlockDoc = false;

  for (int i = 0; i < lines.length; i++) {
    final line = lines[i];
    final trimmed = line.trim();

    if (trimmed.startsWith('///')) {
      final text = trimmed.substring(3).trim();
      currentDoc = (currentDoc == null) ? text : '$currentDoc\n$text';
      continue;
    }
    if (trimmed.startsWith('/**')) {
      inBlockDoc = true;
      currentDoc = trimmed.substring(3).replaceAll('*/', '').replaceAll('*', '').trim();
      if (trimmed.contains('*/')) inBlockDoc = false;
      continue;
    }
    if (inBlockDoc) {
      if (trimmed.contains('*/')) {
        inBlockDoc = false;
        final endIdx = trimmed.indexOf('*/');
        currentDoc = '${currentDoc ?? ''}\n${trimmed.substring(0, endIdx).replaceAll('*', '').trim()}';
      } else {
        currentDoc = '${currentDoc ?? ''}\n${trimmed.replaceAll('*', '').trim()}';
      }
      continue;
    }
    if (trimmed.isEmpty || trimmed.startsWith('//') || trimmed.startsWith('import') ||
        trimmed.startsWith('export') || trimmed.startsWith('library') || trimmed.startsWith('part')) {
      continue;
    }

    final classMatch = RegExp(r'^(?:abstract\s+)?(?:class|mixin)\s+(\w+)').firstMatch(trimmed);
    if (classMatch != null) {
      final clsName = classMatch.group(1)!;
      final doc = currentDoc; currentDoc = null;
      final clsMethods = <ASTFunction>[]; final clsProps = <ASTVariable>[];
      _extractClassBody(lines, i, clsMethods, clsProps);
      classes.add(ASTClass(name: clsName, docstring: doc,
        methods: clsMethods.isEmpty ? null : clsMethods,
        properties: clsProps.isEmpty ? null : clsProps));
      continue;
    }

    final enumMatch = RegExp(r'^enum\s+(\w+)').firstMatch(trimmed);
    if (enumMatch != null) {
      classes.add(ASTClass(name: enumMatch.group(1)!, docstring: currentDoc));
      currentDoc = null; continue;
    }

    final funcMatch = RegExp(r'^([A-Za-z<>\[\],\s]+)\s+(\w+)\s*\(([^)]*)\)\s*(\{|async|=>)').firstMatch(trimmed);
    if (funcMatch != null && !trimmed.startsWith('typedef')) {
      final fnName = funcMatch.group(2)!;
      final beforeName = funcMatch.group(1)?.trim() ?? '';
      functions.add(ASTFunction(name: fnName,
        signature: trimmed.split(RegExp(r'\s*\{')).first.trim(),
        docstring: currentDoc,
        parameters: _parseParams(funcMatch.group(3) ?? ''),
        returnType: (beforeName.isNotEmpty && beforeName != 'factory') ? beforeName : null));
      currentDoc = null; continue;
    }

    final varMatch = RegExp(
      r'^(?:final|const|var|late\s+)?([A-Za-z<>[\]]+\s+)?(\w+)\s*=\s*[^;]+;'
    ).firstMatch(trimmed);
    if (varMatch != null && !trimmed.contains('(') && !trimmed.startsWith('typedef')) {
      variables.add(ASTVariable(name: varMatch.group(2)!,
        type: varMatch.group(1)?.trim() ?? 'dynamic', docstring: currentDoc));
      currentDoc = null;
    }

    if (trimmed.isNotEmpty && !trimmed.startsWith('//')) currentDoc = null;
  }

  return ASTModule(name: modName,
    classes: classes.isEmpty ? null : classes,
    functions: functions.isEmpty ? null : functions,
    variables: variables.isEmpty ? null : variables);
}

void _extractClassBody(List<String> lines, int startIdx,
    List<ASTFunction> methods, List<ASTVariable> props) {
  String? doc; int depth = 0; bool inBody = false;
  for (int i = startIdx; i < lines.length; i++) {
    final trimmed = lines[i].trim();
    if (trimmed.startsWith('///')) {
      final t = trimmed.substring(3).trim();
      doc = (doc == null) ? t : '$doc\n$t'; continue;
    }
    if (trimmed.startsWith('/**')) {
      doc = trimmed.substring(3).replaceAll('*/', '').replaceAll('*', '').trim();
      if (!trimmed.contains('*/')) {
        int j = i + 1;
        while (j < lines.length) {
          if (lines[j].trim().contains('*/')) {
            doc = '${doc ?? ''}\n${lines[j].trim().substring(0, lines[j].trim().indexOf('*/')).replaceAll('*', '').trim()}';
            i = j; break;
          }
          doc = '${doc ?? ''}\n${lines[j].trim().replaceAll('*', '').trim()}'; j++;
        }
      }
      continue;
    }
    for (var ch in lines[i].runes) { if (ch == 0x7B) depth++; if (ch == 0x7D) depth--; }
    if (!inBody && trimmed.endsWith('{') && depth > 0) { inBody = true; continue; }
    if (!inBody) { doc = null; continue; }
    if (depth <= 1 && trimmed == '}') break;

    final fnMatch = RegExp(r'^([A-Za-z<>\[\],\s]+)\s+(\w+)\s*\(([^)]*)\)').firstMatch(trimmed);
    if (fnMatch != null && !trimmed.startsWith('typedef')) {
      final fnName = fnMatch.group(2)!;
      if (!fnName.startsWith('_')) {
        methods.add(ASTFunction(name: fnName,
          signature: trimmed.split(RegExp(r'\s*\{')).first.trim(),
          docstring: doc,
          parameters: _parseParams(fnMatch.group(3) ?? ''),
          returnType: fnMatch.group(1)?.trim()));
        doc = null;
      }
      continue;
    }
    final pMatch = RegExp(r'^(?:final|var|late\s+)?([A-Za-z<>[\]]+\s+)?(\w+)\s*[=;]').firstMatch(trimmed);
    if (pMatch != null && !trimmed.contains('(') && !trimmed.startsWith('typedef') && !trimmed.contains('=>')) {
      props.add(ASTVariable(name: pMatch.group(2)!,
        type: pMatch.group(1)?.trim() ?? 'dynamic', docstring: doc));
      doc = null;
    }
    if (trimmed.isNotEmpty && !trimmed.startsWith('//')) doc = null;
  }
}

List<ASTParameter>? _parseParams(String s) {
  if (s.trim().isEmpty) return null;
  final result = <ASTParameter>[];
  for (final part in s.split(',')) {
    final p = part.trim(); if (p.isEmpty) continue;
    var m = RegExp(r'^\{(.+)\}$').firstMatch(p);
    if (m != null) {
      final sp = m.group(1)!.trim().split(RegExp(r'\s+'));
      result.add(ASTParameter(name: sp.last.replaceAll(',', ''),
        type: sp.length > 1 ? sp.reversed.skip(1).toList().reversed.join(' ') : null));
      continue;
    }
    m = RegExp(r'^\[(.+)\]$').firstMatch(p);
    if (m != null) {
      final inner = m.group(1)!.trim(); final eq = inner.indexOf('=');
      final sp = (eq > 0 ? inner.substring(0, eq).trim() : inner).split(RegExp(r'\s+'));
      result.add(ASTParameter(name: sp.last,
        type: sp.length > 1 ? sp[0] : null,
        defaultVal: eq > 0 ? inner.substring(eq + 1).trim() : null));
      continue;
    }
    final sp = p.split(RegExp(r'\s+'));
    result.add(ASTParameter(name: sp.last.replaceAll(',', ''),
      type: sp.length > 1 ? sp.reversed.skip(1).toList().reversed.join(' ') : null));
  }
  return result.isEmpty ? null : result;
}

Future<void> main(List<String> args) async {
  if (args.isEmpty) {
    print(jsonEncode(Output(errors: [ExtractionError(entryPoint: '',
      error: 'No entry points. Usage: dart run scripts/dart_extract.dart file.dart')])));
    exit(1);
  }
  final modules = <ASTModule>[]; final errors = <ExtractionError>[];
  for (final ep in args) {
    if (!File(ep).existsSync()) {
      errors.add(ExtractionError(entryPoint: ep, error: 'File not found: $ep'));
      continue;
    }
    try { modules.add(extractFile(ep)); }
    catch (e) { errors.add(ExtractionError(entryPoint: ep, error: 'Failed: $e')); }
  }
  print(jsonEncode(Output(
    modules: modules.isEmpty ? null : modules,
    errors: errors.isEmpty ? null : errors)));
  if (errors.isNotEmpty) exit(1);
}
