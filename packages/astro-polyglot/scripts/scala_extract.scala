//> using scala "2.13"
//> using dep "org.scala-lang:scala-compiler:2.13.12"
//> using dep "org.json4s:json4s-native_2.13:4.0.6"

/**
 * scala_extract.scala
 * Extract Scala documentation using the Scala compiler API.
 * Outputs JSON matching the ASTModule schema from starlight-polyglot.
 *
 * Usage:
 *     scala-cli scripts/scala_extract.scala -- entry_point1 entry_point2
 *
 * This script:
 *   1. Compiles the given entry points using the Scala compiler
 *   2. Extracts doc comments, class/object/def/val definitions
 *   3. Outputs ASTModule JSON structure to stdout
 *
 * Dependencies: Requires scala-cli with scala-compiler on classpath.
 */

import scala.reflect.internal.util.BatchSourceFile
import scala.tools.nsc.{Global, Settings}
import scala.tools.nsc.reporters.ConsoleReporter
import scala.util.Try
import org.json4s._
import org.json4s.native.Serialization
import org.json4s.native.Serialization.{read, write}
import org.json4s.JsonDSL._

case class ASTModule(
  name: String,
  docstring: Option[String] = None,
  classes: Option[List[ASTClass]] = None,
  functions: Option[List[ASTFunction]] = None,
  variables: Option[List[ASTVariable]] = None
)

case class ASTClass(
  name: String,
  docstring: Option[String] = None,
  methods: Option[List[ASTFunction]] = None,
  properties: Option[List[ASTVariable]] = None
)

case class ASTFunction(
  name: String,
  signature: Option[String] = None,
  docstring: Option[String] = None,
  parameters: Option[List[ASTParameter]] = None,
  returnType: Option[String] = None
)

case class ASTParameter(
  name: String,
  `type`: Option[String] = None,
  description: Option[String] = None,
  default: Option[String] = None
)

case class ASTVariable(
  name: String,
  `type`: Option[String] = None,
  docstring: Option[String] = None
)

case class ExtractionError(
  entryPoint: String,
  error: String
)

case class Output(
  modules: Option[List[ASTModule]] = None,
  errors: Option[List[ExtractionError]] = None
)

class DocExtractor(sourcePaths: List[String]) {
  private val settings = new Settings()
  Option(System.getProperty("java.class.path")).foreach(cp => settings.classpath.value = cp)
  settings.usejavacp.value = true

  private val reporter = new ConsoleReporter(settings)
  private val global = new Global(settings, reporter)
  import global._

  def extract(): Output = {
    val sources = sourcePaths.flatMap { path =>
      Try {
        val file = new java.io.File(path)
        if (file.exists && file.isFile) {
          val content = scala.io.Source.fromFile(file, "UTF-8").mkString
          List(new BatchSourceFile(file, content))
        } else { System.err.println(s"File not found: $path"); Nil }
      }.getOrElse { System.err.println(s"Failed to read: $path"); Nil }
    }

    if (sources.isEmpty)
      return Output(errors = Some(List(ExtractionError("", "No valid source files"))))

    val run = new Run()
    run.compileSources(sources)
    val modules = scala.collection.mutable.ListBuffer[ASTModule]()

    for (unit <- run.units if !unit.isJava) {
      val modName = new java.io.File(unit.source.file.name).getName.replaceAll("\\.scala$", "")
      modules += extractModuleDefs(unit, modName)
    }

    Output(modules = if (modules.nonEmpty) Some(modules.toList) else None)
  }

  private def extractModuleDefs(unit: CompilationUnit, modName: String): ASTModule = {
    val classes = scala.collection.mutable.ListBuffer[ASTClass]()
    val functions = scala.collection.mutable.ListBuffer[ASTFunction]()
    val variables = scala.collection.mutable.ListBuffer[ASTVariable]()

    def docString(sym: Symbol): Option[String] = {
      global.exitingPhase(global.phaserSet.last) {
        global.docComments.get(sym).map(_.raw.stripPrefix("/**").stripSuffix("*/").trim)
      }.filter(_.nonEmpty)
    }

    def typeName(tpe: Type): String = tpe match {
      case NoType => "Unit"; case _ => tpe.dealiasWiden.toString
    }

    def extractParams(tpe: Type): List[ASTParameter] = tpe match {
      case MethodType(params, _) => params.map(p =>
        ASTParameter(p.name.toString, Some(typeName(p.info)),
          default = if (p.hasDefaultValue) Some(p.name.toString) else None))
      case PolyType(_, restpe) => extractParams(restpe)
      case _ => Nil
    }

    def returnType(tpe: Type): Option[String] = tpe match {
      case MethodType(_, restpe) => Some(typeName(restpe))
      case PolyType(_, restpe) => returnType(restpe)
      case NullaryMethodType(restpe) => Some(typeName(restpe))
      case _ => Some(typeName(tpe))
    }

    def signature(name: String, sym: Symbol): Option[String] = try {
      val params = sym.info.paramss.flatten.map(p => s"${p.name}: ${typeName(p.info)}")
      Some(s"$name(${params.mkString(", ")}): ${returnType(sym.info).getOrElse("Unit")}")
    } catch { case _: Throwable => Some(s"$name(...)") }

    for (defn <- unit.body) try {
      defn match {
        case cd: ClassDef if !cd.symbol.isModuleClass && !cd.symbol.isAnonymousClass =>
          val methods = scala.collection.mutable.ListBuffer[ASTFunction]()
          val properties = scala.collection.mutable.ListBuffer[ASTVariable]()
          for (member <- cd.symbol.info.decls.sorted if !member.name.toString.contains("$")) {
            if (member.isMethod && !member.isConstructor) {
              val mName = member.name.toString
              methods += ASTFunction(mName, signature(mName, member), docString(member),
                { val p = extractParams(member.info); if (p.isEmpty) None else Some(p) },
                returnType(member.info))
            } else if (member.isVal || member.isVar) {
              properties += ASTVariable(member.name.toString, Some(typeName(member.info)), docString(member))
            }
          }
          classes += ASTClass(cd.symbol.name.toString, docString(cd.symbol),
            if (methods.nonEmpty) Some(methods.toList) else None,
            if (properties.nonEmpty) Some(properties.toList) else None)

        case dd: DefDef if !dd.symbol.isConstructor && !dd.symbol.isGetter && !dd.symbol.isSetter
                            && !dd.symbol.name.toString.contains("$") =>
          val fnName = dd.symbol.name.toString
          functions += ASTFunction(fnName, signature(fnName, dd.symbol), docString(dd.symbol),
            { val p = extractParams(dd.symbol.info); if (p.isEmpty) None else Some(p) },
            returnType(dd.symbol.info))

        case vd: ValDef if !vd.symbol.isParameter && !vd.symbol.name.toString.contains("$") =>
          variables += ASTVariable(vd.symbol.name.toString, Some(typeName(vd.symbol.info)), docString(vd.symbol))

        case _ =>
      }
    } catch { case ex: Throwable => System.err.println(s"Error: ${ex.getMessage}") }

    ASTModule(modName,
      classes = if (classes.nonEmpty) Some(classes.toList) else None,
      functions = if (functions.nonEmpty) Some(functions.toList) else None,
      variables = if (variables.nonEmpty) Some(variables.toList) else None)
  }
}


object Main {
  def main(args: Array[String]): Unit = {
    if (args.isEmpty) {
      implicit val formats: Formats = DefaultFormats
      println(Serialization.write(Output(
        errors = Some(List(ExtractionError("", "No entry points. Usage: scala-cli scripts/scala_extract.scala -- file1.scala")))
      )))
      System.exit(1)
    }

    for (ep <- args) {
      if (!new java.io.File(ep).exists) {
        implicit val formats: Formats = DefaultFormats
        println(Serialization.write(Output(
          errors = Some(List(ExtractionError(ep, s"File not found: $ep")))
        )))
        System.exit(1)
      }
    }

    try {
      val output = new DocExtractor(args.toList).extract()
      implicit val formats: Formats = DefaultFormats
      println(Serialization.writePretty(output))
    } catch {
      case ex: Throwable =>
        implicit val formats: Formats = DefaultFormats
        println(Serialization.write(Output(
          errors = Some(List(ExtractionError(args.mkString(", "), s"Failed: ${ex.getMessage}")))
        )))
        System.exit(1)
    }
  }
}
