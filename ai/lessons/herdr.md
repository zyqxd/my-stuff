# Lessons — Herdr

## Left-click success rules out disabled mouse capture

Source: Herdr right-click troubleshooting correction, 2026-07-27.

When left-click works in Herdr but right-click does not, do not keep diagnosing `ui.mouse_capture`. Mouse capture is already active. Inspect the host terminal’s pointer bindings first; iTerm2’s default unmodified right-button action opens its own context menu and prevents Herdr from receiving that event.

Rules for myself:

- Use working mouse buttons to isolate event delivery before changing application settings.
- For iTerm2, inspect **Settings → Pointer → Pointer Actions** and the `PointerActions` preference before blaming Herdr.
- Distinguish host-terminal interception from Herdr context-menu eligibility and World worktree-provider behavior.
