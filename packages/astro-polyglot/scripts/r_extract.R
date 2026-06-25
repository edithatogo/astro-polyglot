#!/usr/bin/env Rscript
# Extract R package documentation by parsing source files.
# Outputs JSON matching the ASTModule schema from starlight-polyglot.
#
# Usage:
#   Rscript r_extract.R /path/to/package1 /path/to/package2

library(jsonlite)

extract_function <- function(fn_name, fn_obj) {
  sig <- NULL
  params <- list()

  if (is.function(fn_obj)) {
    fmls <- formals(fn_obj)
    param_names <- names(fmls)
    param_list <- list()

    for (pname in param_names) {
      default_val <- if (is.symbol(fmls[[pname]])) "" else deparse(fmls[[pname]])[1]
      param_list[[length(param_list) + 1]] <- list(
        name = pname,
        type = NA,
        description = NA,
        default = if (nchar(default_val) > 0 && default_val != "") default_val else NA
      )
    }

    params <- param_list

    sig_parts <- paste0(
      sapply(param_names, function(p) {
        d <- fmls[[p]]
        if (is.symbol(d) && deparse(d) == "") p else paste0(p, " = ", deparse(d)[1])
      }),
      collapse = ", "
    )
    sig <- paste0(fn_name, "(", sig_parts, ")")
  }

  result <- list(
    name = fn_name,
    signature = sig,
    docstring = NA,
    parameters = if (length(params) > 0) params else NULL,
    return_type = NA
  )

  result <- result[!sapply(result, is.null)]
  return(result)
}

extract_class <- function(cls_name, cls_obj) {
  methods_list <- list()
  props_list <- list()

  if (inherits(cls_obj, "R6ClassGenerator") || inherits(cls_obj, "R6")) {
    cls_env <- NULL
    tryCatch(
      {
        if (inherits(cls_obj, "R6ClassGenerator")) {
          cls_env <- cls_obj$public_methods
        } else {
          cls_env <- cls_obj
        }
        method_names <- ls(cls_env)
        for (mname in method_names) {
          m_obj <- get(mname, envir = cls_env)
          fn_info <- extract_function(mname, m_obj)
          if (!is.null(fn_info$name)) {
            methods_list[[length(methods_list) + 1]] <- fn_info
          }
        }
      },
      error = function(e) {}
    )
  } else if (isS4(cls_obj)) {
    tryCatch(
      {
        snames <- slotNames(cls_obj)
        for (sname in snames) {
          props_list[[length(props_list) + 1]] <- list(
            name = sname,
            type = NA,
            docstring = NA
          )
        }
      },
      error = function(e) {}
    )
  }

  result <- list(
    name = cls_name,
    docstring = NA,
    methods = if (length(methods_list) > 0) methods_list else NULL,
    properties = if (length(props_list) > 0) props_list else NULL
  )

  result <- result[!sapply(result, is.null)]
  return(result)
}

extract_module <- function(pkg_path) {
  pkg_name <- basename(pkg_path)
  result <- list(
    name = pkg_name,
    docstring = NA,
    classes = list(),
    functions = list(),
    variables = list()
  )

  r_dir <- file.path(pkg_path, "R")
  if (!dir.exists(r_dir)) {
    result$error <- paste0("No R/ directory found in ", pkg_path)
    return(result)
  }

  r_files <- list.files(r_dir, pattern = "\\.R$", full.names = TRUE)

  for (r_file in r_files) {
    tryCatch(
      {
        env <- new.env(parent = baseenv())
        sys.source(r_file, envir = env, keep.source = TRUE)
        obj_names <- ls(env)

        for (oname in obj_names) {
          obj <- get(oname, envir = env)

          if (is.function(obj)) {
            is_class <- tryCatch(inherits(obj, "R6ClassGenerator"), error = function(e) FALSE)

            if (is_class) {
              cls_info <- extract_class(oname, obj)
              result$classes[[length(result$classes) + 1]] <- cls_info
            } else {
              fn_info <- extract_function(oname, obj)
              result$functions[[length(result$functions) + 1]] <- fn_info
            }
          } else if (is.environment(obj)) {
            cls_info <- extract_class(oname, obj)
            if (length(cls_info$methods) > 0 || length(cls_info$properties) > 0) {
              result$classes[[length(result$classes) + 1]] <- cls_info
            }
          } else {
            result$variables[[length(result$variables) + 1]] <- list(
              name = oname,
              type = typeof(obj),
              docstring = NA
            )
          }
        }
      },
      error = function(e) {
        # Skip files that fail to parse
      }
    )
  }

  result$classes <- if (length(result$classes) > 0) result$classes else NULL
  result$functions <- if (length(result$functions) > 0) result$functions else NULL
  result$variables <- if (length(result$variables) > 0) result$variables else NULL

  return(result)
}

main <- function() {
  args <- commandArgs(trailingOnly = TRUE)

  if (length(args) == 0) {
    cat(jsonlite::toJSON(
      list(error = "No package paths provided. Usage: Rscript r_extract.R /path/to/package"),
      auto_unbox = TRUE,
      pretty = TRUE
    ))
    quit(status = 1)
  }

  modules <- list()
  errors <- list()

  for (pkg_path in args) {
    if (!dir.exists(pkg_path)) {
      errors[[length(errors) + 1]] <- list(
        entry_point = pkg_path,
        error = paste0("Directory not found: ", pkg_path)
      )
      next
    }

    tryCatch(
      {
        mod <- extract_module(pkg_path)
        modules[[length(modules) + 1]] <- mod
      },
      error = function(e) {
        errors[[length(errors) + 1]] <<- list(
          entry_point = pkg_path,
          error = e$message
        )
      }
    )
  }

  output <- list(
    modules = if (length(modules) > 0) modules else NULL,
    errors = if (length(errors) > 0) errors else NULL
  )

  cat(jsonlite::toJSON(output, auto_unbox = TRUE, pretty = TRUE, na = "null"))

  if (length(errors) > 0) {
    quit(status = 1)
  }
}

main()
