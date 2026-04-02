#!/usr/bin/env bash
# Claude Code status line: model name | context progress bar | session usage %

input=$(cat)

# ANSI color codes
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
DIM='\033[2m'
RESET='\033[0m'

model=$(echo "$input" | jq -r '.model.display_name // "Claude"')

used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Session cumulative token usage
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 1')

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

# Session usage: total tokens this session as % of context window
total_tokens=$((total_in + total_out))
if [ "$ctx_size" -gt 0 ] && [ "$total_tokens" -gt 0 ]; then
  session_pct=$(awk "BEGIN {printf \"%.0f\", ($total_tokens / $ctx_size) * 100}")
  session_display="session ${session_pct}%"
else
  session_display=""
fi

# Delimiter
delim="${DIM} | ${RESET}"

# Compose output
if [ -n "$session_display" ]; then
  printf "${CYAN}%s${RESET}${delim}${GREEN}%s${RESET}${delim}${YELLOW}%s${RESET}" \
    "$model" "$ctx_display" "$session_display"
else
  printf "${CYAN}%s${RESET}${delim}${GREEN}%s${RESET}" \
    "$model" "$ctx_display"
fi
