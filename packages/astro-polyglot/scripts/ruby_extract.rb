#!/usr/bin/env ruby
# frozen_string_literal: true

# ruby_extract.rb
# Extract Ruby documentation using YARD.
# Outputs JSON matching the ASTModule schema from starlight-polyglot.
#
# Usage:
#     ruby scripts/ruby_extract.rb entry_point1.rb entry_point2.rb
#
# This script:
#   1. Loads the given Ruby source files
#   2. Uses YARD to parse and extract documentation
#   3. Outputs ASTModule JSON structure to stdout
#
# Dependencies: gem install yard json

require 'json'

begin
  require 'yard'
rescue LoadError
  puts JSON.generate({
    errors: [{ entry_point: '', error: 'YARD not installed. Run: gem install yard' }]
  })
  exit 1
end

YARD::Config.options[:load_plugins] = false

# Extract a YARD CodeObject into our ASTFunction schema
def extract_function(obj)
  params = []
  if obj.respond_to?(:parameters) && obj.parameters
    obj.parameters.each do |p|
      name, default = p.is_a?(Array) ? p : [p, nil]
      param_info = {
        name: name.to_s,
        type: nil,
        description: nil,
        default: default
      }
      # Try to get type from @param tag
      if obj.respond_to?(:tags) && obj.tags(:param)
        tag = obj.tags(:param).find { |t| t.name == name.to_s }
        if tag
          param_info[:type] = tag.types ? tag.types.join(' | ') : nil
          param_info[:description] = tag.text.empty? ? nil : tag.text
        end
      end
      params << param_info
    end
  elsif obj.respond_to?(:tags) && obj.tags(:param)
    obj.tags(:param).each do |tag|
      params << {
        name: tag.name,
        type: tag.types ? tag.types.join(' | ') : nil,
        description: tag.text.empty? ? nil : tag.text,
        default: nil
      }
    end
  end

  # Build signature
  sig = obj.respond_to?(:name) ? obj.name.to_s : obj.path.to_s
  if obj.respond_to?(:parameters) && obj.parameters
    param_strs = obj.parameters.map do |p|
      p.is_a?(Array) ? "#{p[0]}#{p[1] ? " = #{p[1]}" : ''}" : p.to_s
    end
    sig = "#{obj.name}(#{param_strs.join(', ')})"
  end

  return_type = nil
  if obj.respond_to?(:tags) && obj.tags(:return).first
    tag = obj.tags(:return).first
    return_type = tag.types ? tag.types.join(' | ') : nil
  end

  {
    name: obj.respond_to?(:name) ? obj.name.to_s : obj.path.to_s,
    signature: sig,
    docstring: obj.docstring ? obj.docstring.to_s.strip : nil,
    parameters: params.empty? ? nil : params,
    return_type: return_type
  }
end

# Extract a YARD CodeObject into our ASTClass schema
def extract_class(obj)
  methods = []
  properties = []

  if obj.respond_to?(:meths)
    obj.meths.each do |m|
      next if m.visibility == :private && m.name.to_s.start_with?('_')
      methods << extract_function(m)
    end
  end

  if obj.respond_to?(:attributes)
    obj.attributes.each do |name, attr_hash|
      attr_hash.each do |type, attr_obj|
        next unless attr_obj
        # :R or :W for reader/writer
        properties << {
          name: name.to_s,
          type: attr_obj.respond_to?(:tag) && attr_obj.tag(:return) ? 
                  attr_obj.tag(:return).types&.join(' | ') : nil,
          docstring: attr_obj.docstring ? attr_obj.docstring.to_s.strip : nil
        }
      end
    end
  end

  # Also check constants
  if obj.respond_to?(:constants)
    obj.constants.each do |c|
      properties << {
        name: c.name.to_s,
        type: c.value ? c.value.class.name : nil,
        docstring: c.docstring ? c.docstring.to_s.strip : nil
      }
    end
  end

  {
    name: obj.name.to_s,
    docstring: obj.docstring ? obj.docstring.to_s.strip : nil,
    methods: methods.empty? ? nil : methods,
    properties: properties.empty? ? nil : properties
  }
end

# Extract documentation from a Ruby source file
def extract_file(file_path)
  mod_name = File.basename(file_path, '.rb')

  begin
    YARD::Registry.clear
    YARD::Parser::SourceParser.parse(file_path)
  rescue => e
    return {
      name: mod_name,
      docstring: nil,
      error: "Parse error: #{e.message}"
    }
  end

  classes = []
  functions = []
  variables = []

  YARD::Registry.all.each do |obj|
    next if obj.files.any? { |f| f[0] != file_path && !f[0].include?(mod_name) }

    case obj.type
    when :class, :module
      classes << extract_class(obj)
    when :method
      # Only top-level methods (not inside classes)
      if obj.scope == :instance && obj.namespace.root?
        functions << extract_function(obj)
      end
    when :constant
      variables << {
        name: obj.name.to_s,
        type: obj.value ? obj.value.class.name : nil,
        docstring: obj.docstring ? obj.docstring.to_s.strip : nil
      }
    end
  end

  # Remove duplicate entries from YARD's registry
  classes.uniq! { |c| c[:name] }
  functions.uniq! { |f| f[:name] }

  mod_doc = nil
  root = YARD::Registry.root
  if root && root.docstring
    mod_doc = root.docstring.to_s.strip
    mod_doc = nil if mod_doc.empty?
  end

  result = {
    name: mod_name,
    docstring: mod_doc,
    classes: classes.empty? ? nil : classes,
    functions: functions.empty? ? nil : functions,
    variables: variables.empty? ? nil : variables
  }

  result
end

def main
  if ARGV.empty?
    puts JSON.generate({
      errors: [{ entry_point: '', error: 'No entry points provided. Usage: ruby ruby_extract.rb file1.rb file2.rb' }]
    })
    exit 1
  end

  modules = []
  errors = []

  ARGV.each do |entry_point|
    unless File.exist?(entry_point)
      errors << { entry_point: entry_point, error: "File not found: #{entry_point}" }
      next
    end

    begin
      mod = extract_file(entry_point)
      if mod[:error]
        errors << { entry_point: entry_point, error: mod.delete(:error) }
      end
      modules << mod
    rescue => e
      errors << { entry_point: entry_point, error: e.message }
    end
  end

  output = {
    modules: modules.empty? ? nil : modules,
    errors: errors.empty? ? nil : errors
  }

  puts JSON.pretty_generate(output)

  exit 1 unless errors.empty?
end

main
