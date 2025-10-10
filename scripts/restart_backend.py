"""Helper utility to restart the backend server in the background.

This script keeps track of a PID file so that repeated invocations
will stop the previously launched process before starting a new one.
"""
from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable, Optional

PID_FILE = Path(__file__).with_name("backend.pid")
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
PYTHON_EXECUTABLE = Path(sys.executable)


def parse_args(argv: Optional[Iterable[str]]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Restart backend server process")
    parser.add_argument("--python", type=Path, default=PYTHON_EXECUTABLE, help="Python interpreter to use")
    parser.add_argument("--entry", default="run.py", help="Entry point script relative to backend directory")
    parser.add_argument("--host", default="0.0.0.0", help="Host passed to uvicorn runner")
    parser.add_argument("--port", default="8002", help="Port passed to uvicorn runner")
    parser.add_argument("--extra-args", nargs=argparse.REMAINDER, help="Additional arguments for the entry script")
    return parser.parse_args(list(argv) if argv is not None else None)


def is_process_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    else:
        return True


def stop_existing() -> None:
    if not PID_FILE.exists():
        return
    try:
        pid = int(PID_FILE.read_text().strip())
    except ValueError:
        PID_FILE.unlink(missing_ok=True)
        return

    if not is_process_alive(pid):
        PID_FILE.unlink(missing_ok=True)
        return

    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        pass

    for _ in range(40):  # wait up to 10 seconds
        if not is_process_alive(pid):
            break
        time.sleep(0.25)
    else:
        sigkill = getattr(signal, "SIGKILL", signal.SIGTERM)
        try:
            os.kill(pid, sigkill)
        except OSError:
            pass

    PID_FILE.unlink(missing_ok=True)


def start_backend(args: argparse.Namespace) -> None:
    interpreter = args.python
    if not interpreter.exists():
        raise FileNotFoundError(f"Python interpreter not found: {interpreter}")

    backend_path = BACKEND_DIR.resolve()
    entry_script = backend_path / args.entry
    if not entry_script.exists():
        raise FileNotFoundError(f"Backend entry script not found: {entry_script}")

    command = [
        str(interpreter),
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        args.host,
        "--port",
        str(args.port),
    ]
    if args.extra_args:
        command.extend(args.extra_args)

    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "DETACHED_PROCESS", 0)

    process = subprocess.Popen(
        command,
        cwd=str(backend_path),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
    )

    PID_FILE.write_text(str(process.pid), encoding="utf-8")


def main(argv: Optional[Iterable[str]] = None) -> int:
    args = parse_args(argv)
    try:
        stop_existing()
        start_backend(args)
    except Exception as exc:
        print(f"Failed to restart backend: {exc}", file=sys.stderr)
        return 1
    print("Backend restarted.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
