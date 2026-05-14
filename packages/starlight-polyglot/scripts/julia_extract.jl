#!/usr/bin/env julia
# Extract Julia module documentation using Base.Docs.
# Outputs JSON matching the ASTModule schema from starlight-polyglot.
#
# Usage:
#   julia julia_extract.jl ModuleName1 ModuleName2

using JSON
using Base.Docs

function extract_function(fn_name, fn_doc)
    params = []
    sig_str = string(fn_name)
    return_type = nothing

    fn_sym = Symbol(fn_name)
    if isdefined(Main, fn_sym)
        obj = getfield(Main, fn_sym)
        if isa(obj, Function)
            methods_info = methods(obj)
            if length(methods_info) > 0
                for m in methods_info
                    sig_str = string(m)
                    break
                end
            end

            for m in methods_info
                local mt = m
                local sig = mt.sig
                if sig isa Type
                    type_params = sig.parameters
                    if length(type_params) > 1
                        for i in 2:length(type_params)
                            param_type = string(type_params[i])
                            push!(params, Dict(
                                "name" => "arg$(i-1)",
                                "type" => param_type,
                                "description" => nothing,
                                "default" => nothing
                            ))
                        end
                    end
                end
                break
            end
        end
    end

    doc_text = nothing
    if isa(fn_doc, AbstractString)
        doc_text = fn_doc
    elseif isa(fn_doc, Docs.DocStr)
        doc_text = fn_doc.text
    elseif isa(fn_doc, Docs.MultiDoc)
        texts = [d.text for d in fn_doc.docs]
        doc_text = join(texts, "\n\n")
    end

    result = Dict(
        "name" => fn_name,
        "signature" => sig_str,
        "docstring" => doc_text,
        "parameters" => length(params) > 0 ? params : nothing,
        "return_type" => return_type
    )

    for (k, v) in result
        if v === nothing
            delete!(result, k)
        end
    end

    return result
end

function extract_module(mod_name)
    result = Dict(
        "name" => mod_name,
        "docstring" => nothing,
        "classes" => [],
        "functions" => [],
        "variables" => []
    )

    mod_sym = Symbol(mod_name)
    if !isdefined(Main, mod_sym)
        result["error"] = "Module $mod_name not found"
        return result
    end

    mod_obj = getfield(Main, mod_sym)
    if !isa(mod_obj, Module)
        result["error"] = "$mod_name is not a Module"
        return result
    end

    # Get module docstring
    mod_doc = Docs.doc(mod_obj)
    if isa(mod_doc, AbstractString)
        result["docstring"] = mod_doc
    end

    # Iterate through module bindings
    for name in names(mod_obj, all = true)
        name_str = string(name)
        startswith(name_str, '#') && continue
        startswith(name_str, '@') && continue
        name_str == "eval" && continue
        name_str == "include" && continue

        if isdefined(mod_obj, name)
            obj = getfield(mod_obj, name)

            if isa(obj, DataType) && !isa(obj, Union{Type{Union{}}, Union{}})
                # Treat as a type/struct
                doc_obj = Docs.doc(obj)
                doc_text = nothing
                if isa(doc_obj, AbstractString)
                    doc_text = doc_obj
                end

                methods_list = []
                for m in methods(obj)
                    push!(methods_list, Dict(
                        "name" => string(m),
                        "signature" => string(m),
                        "docstring" => nothing,
                        "parameters" => nothing,
                        "return_type" => nothing
                    ))
                end

                push!(result["classes"], Dict(
                    "name" => name_str,
                    "docstring" => doc_text,
                    "methods" => length(methods_list) > 0 ? methods_list : nothing,
                    "properties" => nothing
                ))
            elseif isa(obj, Function)
                doc_obj = Docs.doc(obj)
                fn_info = extract_function(name_str, doc_obj)
                push!(result["functions"], fn_info)
            else
                push!(result["variables"], Dict(
                    "name" => name_str,
                    "type" => string(typeof(obj)),
                    "docstring" => nothing
                ))
            end
        end
    end

    if length(result["classes"]) == 0
        result["classes"] = nothing
    end
    if length(result["functions"]) == 0
        result["functions"] = nothing
    end
    if length(result["variables"]) == 0
        result["variables"] = nothing
    end

    return result
end

function main()
    if length(ARGS) == 0
        println(JSON.json(Dict(
            "error" => "No module names provided. Usage: julia julia_extract.jl ModuleName1 ModuleName2"
        )))
        exit(1)
    end

    modules = []
    errors = []

    for mod_name in ARGS
        try
            mod_info = extract_module(mod_name)
            if haskey(mod_info, "error")
                push!(errors, Dict(
                    "entry_point" => mod_name,
                    "error" => mod_info["error"]
                ))
                delete!(mod_info, "error")
            end
            push!(modules, mod_info)
        catch e
            push!(errors, Dict(
                "entry_point" => mod_name,
                "error" => string(e)
            ))
        end
    end

    output = Dict(
        "modules" => length(modules) > 0 ? modules : nothing,
        "errors" => length(errors) > 0 ? errors : nothing
    )

    println(JSON.json(output))

    if length(errors) > 0
        exit(1)
    end
end

main()
