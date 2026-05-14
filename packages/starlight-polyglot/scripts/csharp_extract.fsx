#!/usr/bin/env dotnet fsi
/// Extract C#/.NET XML documentation and output as JSON matching ASTModule schema.
/// Usage: dotnet fsi csharp_extract.fsx --project /path/to/project.csproj [--output output.json]

open System
open System.IO
open System.Text.RegularExpressions
open System.Xml.Linq

type Parameter = {
    name: string
    typ: string option
    description: string option
    default: string option
}

type Function = {
    name: string
    signature: string option
    docstring: string option
    parameters: Parameter list option
    return_type: string option
}

type Class = {
    name: string
    docstring: string option
    methods: Function list option
    properties: Map<string, string option> list option
}

type Module = {
    name: string
    docstring: string option
    classes: Class list option
    functions: Function list option
    variables: Map<string, string option> list option
}

type ExtractionError = {
    entry_point: string
    error: string
}

type Output = {
    modules: Module list option
    errors: ExtractionError list option
}

let parseXmlDoc (xmlPath: string) : Module list =
    let doc = XDocument.Load(xmlPath)
    let members = doc.Descendants(XName.Get "member") |> Seq.toList

    // Collect all member data
    let memberList =
        members
        |> List.map (fun m ->
            let name = m.Attribute(XName.Get "name") |> fun a -> if a <> null then a.Value else ""
            let summary = m.Element(XName.Get "summary") |> fun e -> if e <> null then Some(e.Value.Trim()) else None
            let returns = m.Element(XName.Get "returns") |> fun e -> if e <> null then Some(e.Value.Trim()) else None
            let parameters =
                m.Elements(XName.Get "param")
                |> Seq.map (fun p -> (p.Attribute(XName.Get "name") |> fun a -> if a <> null then a.Value else ""), p.Value.Trim())
                |> Seq.toList
            (name, summary, returns, parameters)
        )

    let namespaceMap = System.Collections.Generic.Dictionary<string, Module>()
    let typeMap = System.Collections.Generic.Dictionary<string, Class>()

    for (name, summary, returns, parameters) in memberList do
        let parts = name.Split(':')
        if parts.Length >= 2 then
            let prefix = parts.[0]
            let fullName = String.Join(":", parts.[1..])

            match prefix with
            | "T" ->
                let lastDot = fullName.LastIndexOf('.')
                let ns = if lastDot >= 0 then fullName.Substring(0, lastDot) else ""
                let tname = if lastDot >= 0 then fullName.Substring(lastDot + 1) else fullName
                if not (namespaceMap.ContainsKey(ns)) then
                    namespaceMap.[ns] <- { name = if ns = "" then "Global" else ns; docstring = None; classes = None; functions = None; variables = None }
                typeMap.[fullName] <- { name = tname; docstring = summary; methods = None; properties = None }

            | "M" ->
                let parenIdx = fullName.IndexOf('(')
                let methodPath = if parenIdx >= 0 then fullName.Substring(0, parenIdx) else fullName
                let lastDot = methodPath.LastIndexOf('.')
                let parentType = if lastDot >= 0 then methodPath.Substring(0, lastDot) else ""
                let methodName = if lastDot >= 0 then methodPath.Substring(lastDot + 1) else methodPath

                if typeMap.ContainsKey(parentType) then
                    let existing = typeMap.[parentType]
                    let fnBody: Function = {
                        name = methodName; signature = None; docstring = summary
                        parameters = if parameters.Length > 0 then Some(parameters |> List.map (fun (pn, pt) -> { name = pn; typ = None; description = if pt <> "" then Some pt else None; default = None })) else None
                        return_type = returns
                    }
                    let methods = defaultArg existing.methods []
                    typeMap.[parentType] <- { existing with methods = Some(methods @ [fnBody]) }

            | "P" | "F" ->
                let lastDot = fullName.LastIndexOf('.')
                let parentType = if lastDot >= 0 then fullName.Substring(0, lastDot) else ""
                let propName = if lastDot >= 0 then fullName.Substring(lastDot + 1) else fullName

                if typeMap.ContainsKey(parentType) then
                    let existing = typeMap.[parentType]
                    let prop = Map [("name", Some propName); ("docstring", summary)]
                    let props = defaultArg existing.properties []
                    typeMap.[parentType] <- { existing with properties = Some(props @ [prop]) }

            | _ -> ()

    // Assign types to modules
    for (KeyValue(fullName, cls)) in typeMap do
        let lastDot = fullName.LastIndexOf('.')
        let ns = if lastDot >= 0 then fullName.Substring(0, lastDot) else ""
        if namespaceMap.ContainsKey(ns) then
            let existing = namespaceMap.[ns]
            let classes = defaultArg existing.classes []
            namespaceMap.[ns] <- { existing with classes = Some(classes @ [cls]) }

    namespaceMap.Values |> Seq.toList


let main (args: string[]) =
    let rec parseArgs remaining project output =
        match remaining with
        | "--project" :: path :: rest -> parseArgs rest (Some path) output
        | "--output" :: path :: rest -> parseArgs rest project (Some path)
        | [] -> project, output
        | _ -> project, output

    let projectOpt, outputOpt = parseArgs (args |> Array.toList) None None

    match projectOpt with
    | None ->
        let err: Output = { modules = None; errors = Some [{ entry_point = ""; error = "No project path. Usage: --project /path/to/project.csproj" }] }
        let json = System.Text.Json.JsonSerializer.Serialize(err, System.Text.Json.JsonSerializerOptions(WriteIndented = true))
        Console.WriteLine(json)
        Environment.Exit(1)

    | Some projectPath ->
        if not (File.Exists(projectPath)) then
            let err: Output = { modules = None; errors = Some [{ entry_point = projectPath; error = sprintf "File not found: %s" projectPath }] }
            let json = System.Text.Json.JsonSerializer.Serialize(err, System.Text.Json.JsonSerializerOptions(WriteIndented = true))
            Console.WriteLine(json)
            Environment.Exit(1)

        let projectDir = Path.GetDirectoryName(projectPath)
        let projectName = Path.GetFileNameWithoutExtension(projectPath)

        let xmlDocPath =
            match outputOpt with
            | Some p when File.Exists(p) -> Some p
            | _ ->
                let searchPaths = [ Path.Combine(projectDir, "bin", "Release"); Path.Combine(projectDir, "bin", "Debug") ]
                let mutable found = None
                for basePath in searchPaths do
                    if Directory.Exists(basePath) then
                        for f in Directory.GetFiles(basePath, "*.xml", SearchOption.AllDirectories) do
                            if found = None && Path.GetFileName(f).StartsWith(projectName) then
                                found <- Some f
                found

        match xmlDocPath with
        | None ->
            let err: Output = { modules = None; errors = Some [{ entry_point = projectPath; error = "XML doc not found. Build project with GenerateDocumentationFile=true." }] }
            let json = System.Text.Json.JsonSerializer.Serialize(err, System.Text.Json.JsonSerializerOptions(WriteIndented = true))
            Console.WriteLine(json)
            Environment.Exit(1)

        | Some xmlPath ->
            try
                let mods = parseXmlDoc xmlPath
                let output: Output = { modules = Some mods; errors = None }
                let json = System.Text.Json.JsonSerializer.Serialize(output, System.Text.Json.JsonSerializerOptions(WriteIndented = true))
                Console.WriteLine(json)
            with e ->
                let err: Output = { modules = None; errors = Some [{ entry_point = xmlPath; error = sprintf "Parse error: %s" e.Message }] }
                let json = System.Text.Json.JsonSerializer.Serialize(err, System.Text.Json.JsonSerializerOptions(WriteIndented = true))
                Console.WriteLine(json)
                Environment.Exit(1)

main fsi.CommandLineArgs.[1..]
