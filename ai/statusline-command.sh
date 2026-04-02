#!/usr/bin/env bash
# Claude Code status line: model | effort | context bar | cost | 5h usage %

input=$(cat)

# ANSI color codes
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
DIM='\033[2m'
RESET='\033[0m'

delim="${DIM} | ${RESET}"

model=$(echo "$input" | jq -r '.model.display_name // "Claude"')
effort=$(echo "$input" | jq -r '.effort_level // empty')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
five_hour_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')

# Build context progress bar (10 chars wide)
if [ -n "$used_pct" ]; then
  filled=$(echo "$used_pct" | awk '{printf "%d", int($1 / 10 + 0.5)}')
  [ "$filled" -gt 10 ] && filled=10
  empty=$((10 - filled))
  bar=""
  for i in $(seq 1 $filled); do bar="${bar}█"; done
  for i in $(seq 1 $empty);  do bar="${bar}░"; done
  ctx_display=$(printf "%s %.0f%%" "$bar" "$used_pct")
else
  ctx_display="░░░░░░░░░░ --%"
fi

# Session cost
cost_display=$(printf '$%.2f' "$cost")

# Compose output: model | effort | context bar | cost | 5h usage
output="${CYAN}${model}${RESET}"

if [ -n "$effort" ]; then
  output="${output}${delim}${DIM}${effort}${RESET}"
fi

output="${output}${delim}${GREEN}${ctx_display}${RESET}"
output="${output}${delim}${YELLOW}${cost_display}${RESET}"

if [ -n "$five_hour_pct" ]; then
  five_hour_fmt=$(printf '%.0f%%' "$five_hour_pct")
  output="${output}${delim}${RED}5h: ${five_hour_fmt}${RESET}"
fi

printf "%b" "$output"
