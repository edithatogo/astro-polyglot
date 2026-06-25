#!/usr/bin/env php
<?php
/**
 * php_extract.php
 * Extract PHP documentation using ReflectionClass, ReflectionMethod, etc.
 * Outputs JSON matching the ASTModule schema from starlight-polyglot.
 *
 * Usage:
 *     php scripts/php_extract.php entry_point1.php entry_point2.php
 *
 * This script:
 *   1. Includes the given PHP source files
 *   2. Uses reflection to extract class/function/variable documentation
 *   3. Outputs ASTModule JSON structure to stdout
 *
 * Dependencies: Requires PHP 8.0+ with Reflection extension (built-in).
 */

function extractDocstring(Reflector $ref): ?string
{
    $doc = $ref->getDocComment();
    if ($doc === false || $doc === '') return null;
    $doc = preg_replace('/^\s*\/\*\*/', '', $doc);
    $doc = preg_replace('/\*\/\s*$/', '', $doc);
    $doc = preg_replace('/^\s*\*\s?/m', '', $doc);
    $doc = trim($doc);
    return $doc === '' ? null : $doc;
}

function extractParameter(ReflectionParameter $param): array
{
    $info = ['name' => $param->getName(), 'type' => null,
             'description' => null, 'default' => null];
    if ($param->hasType()) {
        $type = $param->getType();
        $info['type'] = $type instanceof \ReflectionNamedType
            ? $type->getName() : (string) $type;
    }
    if ($param->isDefaultValueAvailable()) {
        $default = $param->getDefaultValue();
        if (is_null($default)) $info['default'] = 'null';
        elseif (is_bool($default)) $info['default'] = $default ? 'true' : 'false';
        elseif (is_string($default)) $info['default'] = "'" . addslashes($default) . "'";
        elseif (is_array($default)) $info['default'] = '[]';
        elseif (is_int($default) || is_float($default)) $info['default'] = (string) $default;
        else $info['default'] = gettype($default);
    }
    return $info;
}

function extractFunction(ReflectionFunctionAbstract $fn): array
{
    $params = [];
    $sigParts = [];
    foreach ($fn->getParameters() as $param) {
        $pInfo = extractParameter($param);
        $params[] = $pInfo;
        $pStr = '';
        if ($param->hasType()) {
            $type = $param->getType();
            $pStr .= ($type instanceof \ReflectionNamedType ? $type->getName() : (string) $type) . ' ';
        }
        $pStr .= '$' . $param->getName();
        if ($param->isDefaultValueAvailable()) {
            $default = $param->getDefaultValue();
            if (is_null($default)) $pStr .= ' = null';
            elseif (is_bool($default)) $pStr .= ' = ' . ($default ? 'true' : 'false');
            elseif (is_string($default)) $pStr .= " = '" . addslashes($default) . "'";
            else $pStr .= ' = ' . (string) $default;
        }
        if ($param->isVariadic()) $pStr = '...' . $pStr;
        $sigParts[] = $pStr;
    }
    $returnType = null;
    if ($fn->hasReturnType()) {
        $rt = $fn->getReturnType();
        $returnType = $rt instanceof \ReflectionNamedType ? $rt->getName() : (string) $rt;
    }
    $sig = $fn->getName() . '(' . implode(', ', $sigParts) . ')';
    if ($returnType !== null) $sig .= ': ' . $returnType;

    return [
        'name' => $fn->getName(), 'signature' => $sig,
        'docstring' => extractDocstring($fn),
        'parameters' => empty($params) ? null : $params,
        'return_type' => $returnType,
    ];
}

function extractClass(ReflectionClass $cls): array
{
    $methods = [];
    $properties = [];
    foreach ($cls->getMethods() as $method) {
        if ($method->isPublic() || $method->isProtected()) {
            $methods[] = extractFunction($method);
        }
    }
    foreach ($cls->getProperties() as $prop) {
        if ($prop->isPublic() || $prop->isProtected()) {
            $type = null;
            if ($prop->hasType()) {
                $t = $prop->getType();
                $type = $t instanceof \ReflectionNamedType ? $t->getName() : (string) $t;
            }
            $properties[] = ['name' => $prop->getName(), 'type' => $type,
                             'docstring' => extractDocstring($prop)];
        }
    }
    foreach ($cls->getReflectionConstants() as $const) {
        if ($const->isPublic()) {
            $properties[] = ['name' => $const->getName(),
                             'type' => gettype($const->getValue()),
                             'docstring' => extractDocstring($const)];
        }
    }
    return [
        'name' => $cls->getShortName(), 'docstring' => extractDocstring($cls),
        'methods' => empty($methods) ? null : $methods,
        'properties' => empty($properties) ? null : $properties,
    ];
}

function extractFile(string $filePath): array
{
    $modName = pathinfo($filePath, PATHINFO_FILENAME);
    $classesBefore = get_declared_classes();
    $functionsBefore = get_defined_functions()['user'];
    $source = file_get_contents($filePath);
    if ($source === false) {
        return ['name' => $modName, 'error' => 'Failed to read file'];
    }

    try { include_once $filePath; } catch (\Throwable $e) {}

    $classesAfter = get_declared_classes();
    $functionsAfter = get_defined_functions()['user'];
    $newClasses = array_values(array_diff($classesAfter, $classesBefore));
    $newFunctions = array_values(array_diff($functionsAfter, $functionsBefore));
    $classes = [];
    $functions = [];
    $variables = [];

    foreach ($newClasses as $clsName) {
        try {
            $refClass = new ReflectionClass($clsName);
            $filename = $refClass->getFileName();
            if ($filename !== false && realpath($filename) === realpath($filePath)) {
                $classes[] = extractClass($refClass);
            }
        } catch (\ReflectionException $e) {}
    }

    foreach ($newFunctions as $fnName) {
        try {
            $refFn = new ReflectionFunction($fnName);
            $filename = $refFn->getFileName();
            if ($filename !== false && realpath($filename) === realpath($filePath)) {
                $functions[] = extractFunction($refFn);
            }
        } catch (\ReflectionException $e) {}
    }

    // Token-based extraction for variables and constants
    $tokens = @token_get_all($source);
    $docBuffer = null;
    $count = count($tokens);

    for ($i = 0; $i < $count; $i++) {
        $token = $tokens[$i];
        if (!is_array($token)) continue;

        if ($token[0] === T_DOC_COMMENT) {
            $text = $token[1];
            $text = preg_replace('/^\s*\/\*\*/', '', $text);
            $text = preg_replace('/\*\/\s*$/', '', $text);
            $text = preg_replace('/^\s*\*\s?/m', '', $text);
            $docBuffer = trim($text);
            $docBuffer = $docBuffer === '' ? null : $docBuffer;
        }

        // define('NAME', value)
        if ($token[0] === T_STRING && strtoupper($token[1]) === 'DEFINE') {
            $j = $i + 1;
            while ($j < $count && !(is_array($tokens[$j]) && $tokens[$j][0] === T_CONSTANT_ENCAPSED_STRING)) {
                $j++;
            }
            if ($j < $count) {
                $constName = trim($tokens[$j][1], "'\"");
                $variables[] = ['name' => $constName, 'type' => 'constant',
                                'docstring' => $docBuffer];
                $docBuffer = null;
            }
        }

        // Global $var assignments
        if ($token[0] === T_VARIABLE && $token[1] !== '$this' && $token[1] !== '$GLOBALS') {
            $varName = substr($token[1], 1);
            // Check if at global scope
            $depth = 0;
            $isGlobal = true;
            for ($j = $i - 1; $j >= 0; $j--) {
                $t = $tokens[$j];
                if (is_array($t)) {
                    if ($t[0] === T_FUNCTION || $t[0] === T_CLASS) {
                        $isGlobal = false; break;
                    }
                } else {
                    if ($t === '}') $depth++;
                    elseif ($t === '{') { if ($depth <= 0) { $isGlobal = false; break; } $depth--; }
                }
            }
            if ($isGlobal) {
                $variables[] = ['name' => '$' . $varName, 'type' => 'mixed',
                                'docstring' => $docBuffer];
                $docBuffer = null;
            }
        }

        if ($token[0] !== T_DOC_COMMENT && $token[0] !== T_WHITESPACE && $token[0] !== T_COMMENT) {
            $docBuffer = null;
        }
    }

    return [
        'name' => $modName,
        'classes' => empty($classes) ? null : $classes,
        'functions' => empty($functions) ? null : $functions,
        'variables' => empty($variables) ? null : $variables,
    ];
}

function main(): void
{
    global $argv;
    $args = array_slice($argv ?? [], 1);

    if (empty($args)) {
        echo json_encode([
            'errors' => [['entry_point' => '',
              'error' => 'No entry points. Usage: php php_extract.php file1.php file2.php']],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
        exit(1);
    }

    $modules = [];
    $errors = [];

    foreach ($args as $ep) {
        if (!file_exists($ep)) {
            $errors[] = ['entry_point' => $ep, 'error' => "File not found: $ep"];
            continue;
        }
        try {
            $mod = extractFile($ep);
            if (isset($mod['error'])) {
                $errors[] = ['entry_point' => $ep, 'error' => $mod['error']];
                unset($mod['error']);
            }
            $modules[] = $mod;
        } catch (\Throwable $e) {
            $errors[] = ['entry_point' => $ep, 'error' => $e->getMessage()];
        }
    }

    echo json_encode([
        'modules' => empty($modules) ? null : $modules,
        'errors' => empty($errors) ? null : $errors,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

    if (!empty($errors)) exit(1);
}

main();

