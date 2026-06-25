{smcl}
{* 26jun2026}{...}
{hi:analyze_data}
{hline}
Analyze dataset and compute summary statistics

{synopsis}
{p 8 17 2}
{pstd}
analyze_data varname {ifin} [{weight}] [, {opts}]

{options}
{phang}{opt by(varname)}{p_end}
    Group results by variable.

{phang}{opt detail}{p_end}
    Report detailed statistics including skewness and kurtosis.

{phang}{opt graph}{p_end}
    Generate distribution plot.

{description}
{pstd}
{cmd:analyze_data} computes comprehensive summary statistics for the specified variable, including measures of central tendency, dispersion, and shape of the distribution. The command supports by-group analysis and optional graphical output.

{example}
{phang}
. sysuse auto, clear
. analyze_data mpg, detail graph
