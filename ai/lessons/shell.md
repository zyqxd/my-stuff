# Lessons — Shell configuration

## Test every history entry point against the requested scope

Source: Atuin Up-arrow correction, 2026-07-31.

- When a user asks for directory-specific shell history, verify explicit history commands, Ctrl-R, and Up independently because integrations can configure each differently.
- Keep Up scoped to the current directory when requested; do not assume a local helper command makes the default key binding local.
- The initial setup left Atuin’s Up binding global despite `dhistory` being local, which the user observed immediately.
- Apply this to shell-history integrations. This correction establishes only Up as local; preserve Ctrl-R’s global scope unless the user requests otherwise.
