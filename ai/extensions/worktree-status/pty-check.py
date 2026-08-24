"""
Renders the real footer in a pty and prints the two lines it produced.

Startup extensions (brain) can fire a real model turn, so this pins a cheap
model. Run from anywhere: python3 pty-check.py
"""
import os, pty, select, sys, time, fcntl, termios, struct, re

cwd = os.path.expanduser("~/world/trees/root/src/areas/clients/admin-web")
pi = os.path.expanduser("~/.pi/agent/npm/node_modules/.bin/pi")
pid, fd = pty.fork()
if pid == 0:
    os.chdir(cwd)
    os.environ["TERM"] = "xterm-256color"
    os.execv(pi, [pi, "--no-session", "--model", "claude-haiku-4-5"])
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 30, 100, 0, 0))

buf = b""
deadline = time.time() + 12
while time.time() < deadline:
    r, _, _ = select.select([fd], [], [], 0.5)
    if r:
        try: buf += os.read(fd, 65536)
        except OSError: break
    if time.time() > deadline - 6 and b"world/trees" in buf:
        break
os.write(fd, b"/exit\r")
time.sleep(1.5)
try:
    while True:
        r, _, _ = select.select([fd], [], [], 0.3)
        if not r: break
        chunk = os.read(fd, 65536)
        if not chunk: break
        buf += chunk
except OSError:
    pass
os.kill(pid, 9)

text = buf.decode("utf8", "replace")
plain = re.sub(r"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][B0]", "", text)
lines = [l.rstrip() for l in plain.split("\n")]
keep = [l for l in lines if ("world/trees" in l or "claude-" in l or "MCP" in l or "%/" in l)]
print("--- footer-ish lines seen ---")
for l in keep[-12:]:
    print(repr(l))
