%macro analyze_data(data=, var=, group=, stats=mean median);
  /*============================================================================
  * MACRO: analyze_data
  * PURPOSE: Compute summary statistics for a specified variable
  * 
  * PARAMETERS:
  *   data  - Input dataset name (required)
  *   var   - Analysis variable name (required)   
  *   group - Grouping variable (optional)
  *   stats - Statistics to compute: mean, median, std, min, max, n
  *           Default: mean median
  *
  * RETURNS: Output dataset _stats_ with computed statistics
  *
  * EXAMPLE:
  *   %analyze_data(data=sashelp.class, var=height, group=sex, stats=mean std n)
  *============================================================================*/

  proc means data=&data n &stats;
    var &var;
    %if %length(&group) > 0 %then %do;
      class &group;
    %end;
  run;
%mend analyze_data;

%macro generate_report(data=, title=Summary Report);
  /*============================================================================
  * MACRO: generate_report
  * PURPOSE: Generate a formatted PDF report
  *
  * PARAMETERS:
  *   data  - Input dataset (required)
  *   title - Report title (optional, default: Summary Report)
  *
  * RETURNS: PDF file in current working directory
  *============================================================================*/

  ods pdf file="&title..pdf";
  title "&title";
  proc print data=&data;
  run;
  ods pdf close;
%mend generate_report;