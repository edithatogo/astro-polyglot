/**
 * @brief A simple Lex file for math operations.
 */

%{
#include <stdio.h>
%}

%%

[0-9]+ { printf("%s\n", yytext); }
\n     { /* ignore */ }
.      { /* ignore */ }

%%

/**
 * @brief Main entry point.
 * @return Exit code.
 */
int main(void) {
    yylex();
    return 0;
}
