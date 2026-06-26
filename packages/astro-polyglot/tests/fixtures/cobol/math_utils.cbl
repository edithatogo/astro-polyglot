      *> @brief A simple COBOL program for math.
       IDENTIFICATION DIVISION.
       PROGRAM-ID. MathUtils.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-RESULT PIC 9(4).

      *> @brief Add two numbers.
      *> @param a First operand.
      *> @param b Second operand.
      *> @return The sum.
       PROCEDURE DIVISION.
           MOVE 0 TO WS-RESULT
           STOP RUN.
