#!/usr/bin/env elixir
# elixir_extract.exs
# Extract Elixir module documentation using Code module introspection.
# Outputs JSON matching the ASTModule schema from starlight-polyglot.
#
# Usage:
#     elixir scripts/elixir_extract.exs ModuleName1 ModuleName2
#
# This script:
#   1. Loads the given Elixir modules
#   2. Uses Code.fetch_docs/1 and module introspection to extract docs
#   3. Outputs ASTModule JSON structure to stdout
#
# Dependencies: Requires Elixir 1.10+ (stdlib only; includes minimal JSON encoder).

defmodule PolyglotExtract do
  @moduledoc false

  def run(module_names) do
    {modules, errors} =
      Enum.reduce(module_names, {[], []}, fn mod_name, {mod_acc, err_acc} ->
        module = String.to_existing_atom("Elixir.#{mod_name}")

        if Code.ensure_loaded?(module) do
          try do
            mod_info = extract_module(module, mod_name)
            {[mod_info | mod_acc], err_acc}
          rescue
            e -> {mod_acc, [%{entry_point: mod_name, error: Exception.message(e)} | err_acc]}
          end
        else
          {mod_acc, [%{entry_point: mod_name,
            error: "Module #{mod_name} not found or not loaded"} | err_acc]}
        end
      end)

    modules = if modules == [], do: nil, else: Enum.reverse(modules)
    errors = if errors == [], do: nil, else: Enum.reverse(errors)

    %{modules: modules, errors: errors}
    |> Jason.encode!(pretty: true)
    |> IO.puts()

    if errors != nil, do: System.halt(1)
  end

  defp extract_module(module, name) do
    mod_doc = get_doc(module)
    functions = extract_functions(module)
    types = extract_types(module)
    structs = extract_structs(module)
    all_classes = (types ++ structs)

    %{
      name: name,
      docstring: mod_doc,
      classes: if(all_classes == [], do: nil, else: all_classes),
      functions: if(functions == [], do: nil, else: functions),
      variables: nil
    }
  end

  defp get_doc(module) do
    case Code.fetch_docs(module) do
      {:docs_v1, _, _, _, %{"en" => doc}, _, _} when is_binary(doc) -> strip_doc(doc)
      {:docs_v1, _, _, _, doc, _, _} when is_binary(doc) -> strip_doc(doc)
      _ ->
        case Module.get_attribute(module, :moduledoc) do
          {_line, doc} when is_binary(doc) -> strip_doc(doc)
          doc when is_binary(doc) -> if doc != false, do: strip_doc(doc)
          _ -> nil
        end
    end
  end

  defp strip_doc(doc) do
    doc |> String.trim() |> String.replace(~r/^\s*\#\s*/m, "") |> String.trim()
    |> case do "" -> nil; d -> d end
  end

  defp extract_functions(module) do
    docs = Code.fetch_docs(module)
    funs = module.__info__(:functions) ++
           (module.__info__(:macros) |> Enum.map(fn {n, a} -> {n, a} end))
    funs = Enum.uniq_by(funs, fn {n, a} -> {n, a} end)

    doc_map = case docs do
      {:docs_v1, _, _, _, _, _, elems} ->
        elems
        |> Enum.filter(fn {{t, _, _}, _, _, _, _} -> t in [:function, :macro] end)
        |> Enum.map(fn {{_t, name, arity}, _, _, doc_anno, _} ->
          {{name, arity}, doc_anno}
        end)
        |> Map.new()
      _ -> %{}
    end

    Enum.map(funs, fn {name, arity} ->
      doc_anno = Map.get(doc_map, {name, arity})
      doc_text = case doc_anno do
        %{"en" => text} when is_binary(text) -> strip_doc(text)
        text when is_binary(text) -> strip_doc(text)
        _ -> nil
      end

      params = if arity > 0 do
        Enum.map(1..arity, fn i ->
          %{name: "arg#{i}", type: nil, description: nil, default: nil}
        end)
      end

      %{
        name: Atom.to_string(name),
        signature: "#{name}(#{Enum.map(1..arity, fn _ -> "_" end) |> Enum.join(", ")})",
        docstring: doc_text,
        parameters: if(params == [] || params == nil, do: nil, else: params),
        return_type: nil
      }
    end)
    |> Enum.sort_by(& &1.name)
  end

  defp extract_types(module) do
    case Code.fetch_docs(module) do
      {:docs_v1, _, _, _, _, _, elems} ->
        elems
        |> Enum.filter(fn {{t, _, _}, _, _, _, _} -> t == :type end)
        |> Enum.map(fn {{_t, name, _arity}, _, _, doc_anno, _} ->
          doc_text = case doc_anno do
            %{"en" => text} when is_binary(text) -> strip_doc(text)
            text when is_binary(text) -> strip_doc(text)
            _ -> nil
          end
          %{name: Atom.to_string(name), docstring: doc_text, methods: nil, properties: nil}
        end)
      _ -> []
    end
  end

  defp extract_structs(module) do
    fields = try do
      module.__struct__()
      |> Map.drop([:__struct__])
      |> Enum.map(fn {k, _v} -> %{name: Atom.to_string(k), type: "field", docstring: nil} end)
    rescue
      _ -> []
    catch
      _, _ -> []
    end

    if fields != [] do
      [%{name: inspect(module), docstring: nil, methods: nil,
        properties: if(fields == [], do: nil, else: fields)}]
    else
      []
    end
  end
end


# Main execution with JSON encoder fallback
args = System.argv()

if length(args) == 0 do
  IO.puts(~s({"modules":null,"errors":[{"entry_point":"","error":"No module names provided. Usage: elixir scripts/elixir_extract.exs ModuleName"}]}))
  System.halt(1)
end

try do
  Code.ensure_loaded!(Jason)
rescue
  _ ->
    defmodule Jason do
      def encode!(value, opts \\ []) do
        pretty = Keyword.get(opts, :pretty, false)
        do_encode(value, pretty, 0)
      end
      defp do_encode(nil, _, _), do: "null"
      defp do_encode(true, _, _), do: "true"
      defp do_encode(false, _, _), do: "false"
      defp do_encode(v, _, _) when is_number(v), do: to_string(v)
      defp do_encode(v, _, _) when is_atom(v), do: ~s("#{v}")
      defp do_encode(v, pretty, i) when is_binary(v) do
        ~s("#{String.replace(v, ~s("), ~s(\\"))}")
      end
      defp do_encode([], _, _), do: "[]"
      defp do_encode(list, true, i) when is_list(list) do
        items = Enum.map(list, fn item ->
          "\n" <> String.duplicate("  ", i + 1) <> do_encode(item, true, i + 1)
        end)
        Enum.join(items, ",") <> "\n" <> String.duplicate("  ", i) <> "]"
      end
      defp do_encode(list, false, i) when is_list(list) do
        "[" <> Enum.map(list, &do_encode(&1, false, i)) |> Enum.join(",") <> "]"
      end
      defp do_encode(%{}, _, _), do: "{}"
      defp do_encode(map, true, i) when is_map(map) do
        items = Enum.map(map, fn {k, v} ->
          key = if is_atom(k), do: ~s("#{k}"), else: do_encode(k, true, i + 1)
          val = do_encode(v, true, i + 1)
          "\n" <> String.duplicate("  ", i + 1) <> key <> ": " <> val
        end)
        Enum.join(items, ",") <> "\n" <> String.duplicate("  ", i) <> "}"
      end
      defp do_encode(map, false, i) when is_map(map) do
        items = Enum.map(map, fn {k, v} ->
          key = if is_atom(k), do: ~s("#{k}"), else: do_encode(k, false, i)
          val = do_encode(v, false, i)
          key <> ": " <> val
        end)
        "{" <> Enum.join(items, ",") <> "}"
      end
    end
end

Enum.each(args, fn name ->
  mod_name = String.to_atom("Elixir.#{name}")
  case Code.ensure_loaded(mod_name) do
    {:module, _} -> :ok
    {:error, _} ->
      if File.exists?("#{name}.ex"), do: Code.compile_file("#{name}.ex")
      if File.exists?("#{name}.exs"), do: Code.eval_file("#{name}.exs")
  end
end)

PolyglotExtract.run(args)
