*! stata_extract.do
*! Extract Stata ado-file documentation and output JSON matching ASTModule schema.
*!
*! Usage:
*!     stata -b do scripts/stata_extract.do, arg(/path/to/mycommand.ado)
*!
*! This script:
*!   1. Reads the specified .ado file
*!   2. Parses Stata help header comments (/// style) and syntax lines
*!   3. Outputs valid JSON to stdout
*!
*! Dependencies: Built-in Stata commands only; no external packages needed.

capture program drop _extract_ado
program define _extract_ado
    syntax, Ado(string)

    local lines : fileread `"`ado'"'
    local linecount : word count `lines'

    local json_lines ""
    local in_function = 0
    local function_name ""
    local function_doc ""
    local function_syntax ""
    local param_list ""

    local n = 1
    while `n' <= `linecount' {
        local line : word `n' of `lines'

        * Check for program definition
        if ustrregexm(`"`line'"', "^program[[:space:]]+define[[:space:]]+([a-zA-Z_][a-zA-Z0-9_]*)") {
            local function_name = ustrregexs(1)
            local in_function = 1
            local function_doc ""
            local function_syntax ""
            local param_list ""
        }

        * Check for end of program
        if ustrregexm(`"`line'"', "^end[[:space:]]*$") & `in_function' {
            local in_function = 0
            local doc_clean : subinstr local function_doc `"""' `"\\\""' , all
            local doc_clean : subinstr local doc_clean `"'"' `"\\'"' , all
            local syntax_clean : subinstr local function_syntax `"""' `"\\\""' , all
            local syntax_clean : subinstr local syntax_clean `"'"' `"\\'"' , all

            local json_lines `"`json_lines'{"name":"`function_name'","signature":"`syntax_clean'","docstring":"`doc_clean'","parameters":`param_list',"return_type":null}, "'

            local function_name ""
            local function_doc ""
            local function_syntax ""
            local param_list ""
        }

        * Capture /// comments as docstring
        if ustrregexm(`"`line'"', "^///[[:space:]]*(.*)") {
            local comment_text = ustrregexs(1)
            local comment_clean : subinstr local comment_text `"""' `"\\\""' , all
            if strlen(`"`function_doc'"') > 0 {
                local function_doc `"`function_doc'\n`comment_clean'"'
            }
            else {
                local function_doc `"`comment_clean'"'
            }
        }

        * Capture syntax line
        if ustrregexm(`"`line'"', "^[[:space:]]*syntax[[:space:]]+(.*)") & `in_function' {
            local syn_text = ustrregexs(1)
            local syn_clean : subinstr local syn_text `"""' `"\\\""' , all
            local function_syntax `"`function_name' `syn_clean'"'

            * Parse parameters from syntax statement
            local plist "["
            if ustrregexm(`"`syn_text'"', "varlist") {
                local plist `"`plist'{"name":"varlist","type":"varlist","description":null,"default":null},"'
            }
            if ustrregexm(`"`syn_text'"', "if[^a-zA-Z]") {
                local plist `"`plist'{"name":"if","type":"exp","description":"if expression","default":null},"'
            }
            if ustrregexm(`"`syn_text'"', "in[^a-zA-Z]") {
                local plist `"`plist'{"name":"in","type":"range","description":"in range","default":null},"'
            }
            if ustrregexm(`"`syn_text'"', "using") {
                local plist `"`plist'{"name":"using","type":"string","description":"filename","default":null},"'
            }
            if ustrregexm(`"`syn_text'"', "weight") {
                local plist `"`plist'{"name":"weight","type":"weight","description":"weight expression","default":null},"'
            }
            if ustrregexm(`"`syn_text'"', "\[") | ustrregexm(`"`syn_text'"', "options") {
                local plist `"`plist'{"name":"options","type":"options","description":"optional options","default":null},"'
            }
            * Remove trailing comma
            if strlen(`"`plist'"') > 1 {
                local plist = substr(`"`plist'"', 1, strlen(`"`plist'"') - 1)
            }
            local plist `"`plist']"'
            if `"`plist'"' == "]" {
                local param_list "null"
            }
            else {
                local param_list `"`plist'"'
            }
        }

        local n = `n' + 1
    }

    * Remove trailing comma from json_lines
    if strlen(`"`json_lines'"') > 0 {
        local json_lines = substr(`"`json_lines'"', 1, strlen(`"`json_lines'"') - 1)
    }

    * Extract module name from filename
    local modname = substr(`"`ado'"', strrpos(`"`ado'"', "/") + 1, strlen(`"`ado'"'))
    local modname = substr(`"`modname'"', 1, strrpos(`"`modname'"', ".") - 1)
    if `"`modname'"' == "" {
        local modname "unknown"
    }

    local output `"{"modules":[{"name":"`modname'","docstring":null,"classes":[],"functions":[`json_lines'],"variables":[]}],"errors":null}"'
    display as text `"`output'"'
end

* Main execution: get arg from command line
local adopath `"`=strtrim(stritrim(`"`arg'"'))"'

if `"`adopath'"' == "" {
    capture local adopath `"`1'"'
}

if `"`adopath'"' == "" {
    display as error `"{"error":"No ado file path provided. Usage: stata -b do stata_extract.do, arg(/path/to/file.ado)"}"'
    exit 601
}

capture noisily {
    local filecheck : di fileread(`"`adopath'"')
    if `"`filecheck'"' == "" {
        display as error `"{"error":"File not found or empty: `adopath'"}"'
        exit 601
    }

    _extract_ado, ado(`"`adopath'"')
}
if _rc {
    display as error `"{"error":"Extraction failed for: `adopath'"}"'
    exit _rc
}

exit
