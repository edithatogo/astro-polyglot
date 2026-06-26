/**
 * @brief A simple Yacc grammar for math expressions.
 */

%{
#include <stdio.h>
%}

%token NUMBER

%%

expression: NUMBER
          | expression '+' NUMBER { $$ = $1 + $3; }
          ;

%%

/**
 * @brief Main entry point.
 * @return Exit code.
 */
int main(void) {
    yyparse();
    return 0;
}
