/*!
 * sas_extract.sas
 * Extract SAS program documentation and output JSON matching ASTModule schema.
 *
 * Usage:
 *     sas scripts/sas_extract.sas -sysparm /path/to/program.sas
 *
 * This script:
 *   1. Reads the specified SAS program file
 *   2. Parses header comments, macro definitions, and PROC steps
 *   3. Outputs valid JSON to stdout (printed to log) and a file
 *
 * Dependencies: Uses Base SAS only; no external packages.
 */

%macro extract_sas(progpath=);
    filename _sasfile "&progpath";

    %global _modname _json_out;
    %let _modname = %sysfunc(scan(&progpath, -1, /\));
    %let _modname = %sysfunc(scan(&_modname, 1, .));
    %if &_modname = %then %let _modname = unknown;

    data _null_;
        infile _sasfile length=len truncover;
        input line $varying32767. len;

        retain json_funcs json_classes json_vars
               in_macro macro_name macro_doc
               doc_lines;

        if _n_ = 1 then do;
            json_funcs = '';
            json_classes = '';
            json_vars = '';
            in_macro = 0;
            macro_name = '';
            macro_doc = '';
            doc_lines = 0;
        end;

        trimmed = strip(line);
        proc_line = trimmed;

        /* Strip block comments */
        retain in_block 0;
        if in_block then do;
            if index(trimmed, '*/') > 0 then do;
                in_block = 0;
                proc_line = substr(trimmed, index(trimmed, '*/') + 2);
                if trim(proc_line) = '' then return;
            end;
            else return;
        end;
        if index(trimmed, '/*') > 0 and index(trimmed, '*/') = 0 then do;
            in_block = 1;
            proc_line = substr(trimmed, 1, index(trimmed, '/*') - 1);
            if trim(proc_line) = '' then return;
        end;

        /* Strip inline comments */
        if index(proc_line, '/*') > 0 then
            proc_line = substr(proc_line, 1, index(proc_line, '/*') - 1);

        /* Capture comment lines as docstring */
        if substr(strip(proc_line), 1, 1) = '*' 
           and index(proc_line, ';') = 0 then do;
            comment_text = substr(proc_line, 2);
            comment_text = strip(comment_text);
            if doc_lines = 0 then
                macro_doc = comment_text;
            else if comment_text ne '' then
                macro_doc = catx(' ', macro_doc, comment_text);
            doc_lines + 1;
            return;
        end;
        else do;
            if doc_lines > 0 and in_macro then do;
                /* end of doc block preceding a macro */;
            end;
            doc_lines = 0;
        end;

        proc_up = upcase(strip(proc_line));

        /* %MACRO definition */
        if substr(proc_up, 1, 6) = '%MACRO' then do;
            macro_name = scan(proc_line, 2, ' (');
            in_macro = 1;
            macro_doc = '';
        end;

        /* %MEND statement */
        if in_macro and substr(proc_up, 1, 5) = '%MEND' then do;
            in_macro = 0;
            if macro_name ne '' then do;
                doc_clean = compress(macro_doc, '09'x);
                doc_clean = tranwrd(doc_clean, '\', '\\');
                doc_clean = tranwrd(doc_clean, '"', '\"');
                doc_clean = tranwrd(strip(doc_clean), '0A'x, '\n');

                if json_funcs = '' then
                    json_funcs = cats(
                        '{"name":"', strip(macro_name),
                        '","signature":"%', strip(macro_name), '(...)"',
                        ',"docstring":"', strip(doc_clean),
                        '","parameters":null,"return_type":null}');
                else
                    json_funcs = cats(json_funcs, ',',
                        '{"name":"', strip(macro_name),
                        '","signature":"%', strip(macro_name), '(...)"',
                        ',"docstring":"', strip(doc_clean),
                        '","parameters":null,"return_type":null}');
            end;
            macro_name = '';
            macro_doc = '';
        end;

        /* DATA step name */
        if substr(proc_up, 1, 5) = 'DATA ' and not in_macro then do;
            dset_name = scan(proc_line, 2, ' (;');
            if dset_name ne '' and dset_name ne 'NULL' then do;
                if json_funcs = '' then
                    json_funcs = cats(
                        '{"name":"', strip(dset_name),
                        '","signature":"data ', strip(dset_name), '"',
                        ',"docstring":"","parameters":null,"return_type":"dataset"}');
                else
                    json_funcs = cats(json_funcs, ',',
                        '{"name":"', strip(dset_name),
                        '","signature":"data ', strip(dset_name), '"',
                        ',"docstring":"","parameters":null,"return_type":"dataset"}');
            end;
        end;

        /* PROC step name */
        if substr(proc_up, 1, 5) = 'PROC ' and not in_macro then do;
            proc_name = scan(proc_up, 2, ' (;');
            if proc_name ne '' and proc_name ne 'OPTIONS' then do;
                func_name = cats('proc_', lowcase(strip(proc_name)));
                if json_funcs = '' then
                    json_funcs = cats(
                        '{"name":"', strip(func_name),
                        '","signature":"proc ', strip(proc_name), ' ..."',
                        ',"docstring":"","parameters":null,"return_type":null}');
                else
                    json_funcs = cats(json_funcs, ',',
                        '{"name":"', strip(func_name),
                        '","signature":"proc ', strip(proc_name), ' ..."',
                        ',"docstring":"","parameters":null,"return_type":null}');
            end;
        end;

        call symputx('_funcs_json', json_funcs, 'G');
        call symputx('_docstring', strip(coalescec(macro_doc, '')), 'G');
    run;

    /* Build final JSON */
    %let _funcs_json = %superq(_funcs_json);
    %let _docstring = %superq(_docstring);
    %let _docstring = %sysfunc(tranwrd(%str(&_docstring), %str(%"), %str(\")));

    %let _json_output = {"modules":[{"name":"&_modname","docstring":"&_docstring","classes":[],"functions":[&_funcs_json],"variables":[]}],"errors":null};

    data _null_;
        file "sas_extract_output.json";
        put "&_json_output";
    run;

    %put &_json_output;
    filename _sasfile clear;
%mend extract_sas;

%macro main;
    %let progpath = %sysget(SYSPARM);
    %if &progpath = %then %do;
        %put {"error":"No program path provided. Usage: sas scripts/sas_extract.sas -sysparm /path/to/program.sas"};
        %abort 1;
    %end;

    %if not %sysfunc(fileexist(&progpath)) %then %do;
        %put {"error":"File not found: &progpath"};
        %abort 1;
    %end;

    %extract_sas(progpath=&progpath);
%mend main;

%main;
