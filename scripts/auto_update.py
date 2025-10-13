"""Automated Git-based hot update utility.

This script periodically checks for updates in configured Git repositories
and runs deployment commands when new commits are detected. Configuration
is supplied via a JSON file; see the sibling `auto_update_config.json`
for a reference structure.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import signal
import subprocess
import sys
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple, Union


logger = logging.getLogger("auto_update")


class ConfigurationError(RuntimeError):
    """Raised when the configuration file is invalid."""


@dataclass
class Command:
    cmd: Union[str, List[str]]
    cwd: Optional[Path] = None
    shell: Optional[bool] = None
    env: Dict[str, str] = field(default_factory=dict)

    @staticmethod
    def from_raw(raw: Union[str, Dict[str, object]], base_dir: Path) -> "Command":
        if isinstance(raw, str):
            return Command(cmd=raw, cwd=base_dir)
        if isinstance(raw, dict):
            cmd = raw.get("cmd") or raw.get("command")
            if cmd is None:
                raise ConfigurationError("Command entries must include 'cmd' or 'command'.")
            # Handle cross-platform venv paths
            if isinstance(cmd, list):
                cmd = [part.replace("Scripts/python.exe", "bin/python") if isinstance(part, str) else part for part in cmd]
            cwd_raw = raw.get("cwd")
            cwd = base_dir / cwd_raw if isinstance(cwd_raw, str) else base_dir
            shell_raw = raw.get("shell")
            if shell_raw is None and isinstance(cmd, str):
                shell_raw = True
            env_raw = raw.get("env")
            if env_raw is not None and not isinstance(env_raw, dict):
                raise ConfigurationError("Command 'env' must be a mapping of string to string.")
            env = {str(k): str(v) for k, v in (env_raw or {}).items()}
            return Command(cmd=cmd, cwd=cwd, shell=shell_raw, env=env)
        raise ConfigurationError("Commands must be strings or objects.")


@dataclass
class Job:
    name: str
    repo_path: Path
    branch: str
    interval_seconds: int
    post_update_commands: List[Command]
    post_fetch_commands: List[Command]

    @staticmethod
    def from_dict(raw: Dict[str, object], base_dir: Path, default_interval: int, default_branch: str) -> "Job":
        try:
            name = str(raw.get("name"))
        except Exception as exc:  # pragma: no cover - defensive
            raise ConfigurationError("Each job must have a name.") from exc
        if not name:
            raise ConfigurationError("Each job must declare a non-empty 'name'.")

        repo_raw = raw.get("repo_path", ".")
        if not isinstance(repo_raw, str):
            raise ConfigurationError(f"Job '{name}' has invalid 'repo_path'.")
        repo_path = (base_dir / repo_raw).resolve()
        if not repo_path.exists():
            raise ConfigurationError(f"Job '{name}' repo path not found: {repo_path}")

        branch = str(raw.get("branch")) if raw.get("branch") else default_branch
        interval_raw = raw.get("interval_minutes") or raw.get("interval")
        interval_seconds = default_interval
        if interval_raw is not None:
            try:
                interval_seconds = parse_interval(interval_raw)
            except ValueError as exc:
                raise ConfigurationError(
                    f"Job '{name}' has invalid interval '{interval_raw}': {exc}"
                ) from exc

        post_update_raw = raw.get("post_update") or []
        post_fetch_raw = raw.get("post_fetch") or []
        if not isinstance(post_update_raw, list) or not isinstance(post_fetch_raw, list):
            raise ConfigurationError(
                f"Job '{name}' post_update/post_fetch must be lists of commands."  # noqa: E501
            )

        post_update_commands = [Command.from_raw(cmd, base_dir) for cmd in post_update_raw]
        post_fetch_commands = [Command.from_raw(cmd, base_dir) for cmd in post_fetch_raw]

        return Job(
            name=name,
            repo_path=repo_path,
            branch=branch,
            interval_seconds=interval_seconds,
            post_update_commands=post_update_commands,
            post_fetch_commands=post_fetch_commands,
        )


def parse_interval(value: Union[str, int, float]) -> int:
    if isinstance(value, (int, float)):
        seconds = int(float(value) * 60)  # treat numeric values as minutes
        if seconds <= 0:
            raise ValueError("Interval must be positive")
        return seconds
    if not isinstance(value, str):
        raise ValueError("Interval must be string or number")

    value = value.strip().lower()
    units = {"s": 1, "sec": 1, "secs": 1, "second": 1, "seconds": 1,
             "m": 60, "min": 60, "mins": 60, "minute": 60, "minutes": 60,
             "h": 3600, "hr": 3600, "hour": 3600, "hours": 3600}

    for suffix, multiplier in units.items():
        if value.endswith(suffix):
            number_part = value[: -len(suffix)].strip()
            amount = float(number_part) if number_part else 1
            seconds = int(amount * multiplier)
            if seconds <= 0:
                raise ValueError("Interval must be positive")
            return seconds

    # default to minutes if only numeric string provided
    seconds = int(float(value) * 60)
    if seconds <= 0:
        raise ValueError("Interval must be positive")
    return seconds


def run_command(command: Command, *, label: str = "command", timeout: Optional[int] = None) -> Tuple[int, str, str]:
    cwd = command.cwd or Path.cwd()
    if not cwd.exists():
        raise FileNotFoundError(f"Working directory does not exist: {cwd}")

    env = os.environ.copy()
    env.update(command.env)

    if isinstance(command.cmd, list):
        shell = command.shell if command.shell is not None else False
        cmd_to_run: Union[str, List[str]] = [str(part) for part in command.cmd]
    else:
        shell = command.shell if command.shell is not None else True
        cmd_to_run = command.cmd

    logger.debug("Running %s in %s: %s", label, cwd, cmd_to_run)
    try:
        proc = subprocess.run(
            cmd_to_run,
            cwd=str(cwd),
            shell=shell,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=timeout,
        )
        if proc.returncode != 0:
            logger.error("%s failed (exit %s)\nstdout: %s\nstderr: %s", label, proc.returncode, proc.stdout, proc.stderr)
        else:
            logger.debug("%s succeeded: %s", label, proc.stdout.strip())
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        logger.warning("%s timed out after %d seconds", label, timeout)
        return -1, "", f"Command timed out after {timeout} seconds"


def ensure_clean_worktree(repo_path: Path, job_name: str) -> bool:
    status_cmd = Command(cmd=["git", "status", "--porcelain"], cwd=repo_path, shell=False)
    code, stdout, _ = run_command(status_cmd, label=f"[{job_name}] git status")
    if code != 0:
        return False

    if stdout.strip():
        logger.warning("[%s] Repository has uncommitted changes (continuing without auto-stash): %s", job_name, stdout.strip())

    return True


def fetch_remote(job: Job) -> Optional[str]:
    if not ensure_clean_worktree(job.repo_path, job.name):
        return None

    fetch_cmd = Command(cmd=["git", "fetch"], cwd=job.repo_path, shell=False)
    code, stdout, stderr = run_command(fetch_cmd, label=f"[{job.name}] git fetch", timeout=60)
    if code != 0:
        logger.warning("[%s] Git fetch failed (exit %s), skipping update check. Error: %s", job.name, code, stderr.strip())
        return None

    for command in job.post_fetch_commands:
        run_command(command, label=f"[{job.name}] post-fetch command")

    local = rev_parse(job.repo_path, "HEAD", job.name)
    remote = rev_parse(job.repo_path, f"origin/{job.branch}", job.name)
    if local is None or remote is None:
        return None
    if local == remote:
        logger.info("[%s] No updates found.", job.name)
        return None
    logger.info("[%s] Update detected: %s -> %s", job.name, local[:7], remote[:7])
    return remote


def rev_parse(repo_path: Path, ref: str, job_name: str) -> Optional[str]:
    rev_cmd = Command(cmd=["git", "rev-parse", ref], cwd=repo_path, shell=False)
    code, stdout, _ = run_command(rev_cmd, label=f"[{job_name}] git rev-parse {ref}")
    if code != 0:
        return None
    return stdout.strip()


def pull_updates(job: Job) -> bool:
    pull_cmd = Command(cmd=["git", "pull"], cwd=job.repo_path, shell=False)
    code, stdout, stderr = run_command(pull_cmd, label=f"[{job.name}] git pull", timeout=120)
    if code != 0:
        logger.warning("[%s] Git pull failed (exit %s), skipping update. Error: %s", job.name, code, stderr.strip())
        return False

    for command in job.post_update_commands:
        run_command(command, label=f"[{job.name}] post-update command")

    logger.info("[%s] Update applied successfully.", job.name)
    return True


def worker(job: Job, stop_event: threading.Event, run_once: bool, start_mode: bool = False) -> None:
    logger.info(
        "[%s] Worker started (branch=%s, interval=%ss)",
        job.name,
        job.branch,
        job.interval_seconds,
    )

    if start_mode:
        # Run initial update on start (always pull to ensure post_update runs)
        try:
            pull_updates(job)
        except Exception:  # pragma: no cover - defensive
            logger.exception("[%s] Unexpected error during initial update.", job.name)

    while not stop_event.is_set():
        try:
            remote = fetch_remote(job)
            if remote:
                pull_updates(job)
        except Exception:  # pragma: no cover - defensive
            logger.exception("[%s] Unexpected error during update cycle.", job.name)
        if run_once:
            break
        stop_event.wait(job.interval_seconds)

    logger.info("[%s] Worker stopped.", job.name)


def load_jobs(config_path: Path) -> Tuple[List[Job], int]:
    if not config_path.exists():
        raise ConfigurationError(f"Configuration file not found: {config_path}")
    try:
        raw_config = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigurationError(f"Invalid JSON in {config_path}: {exc}") from exc

    default_interval = parse_interval(raw_config.get("default_interval", 10))
    default_branch = raw_config.get("default_branch", "main")

    jobs_raw = raw_config.get("jobs")
    if not isinstance(jobs_raw, list) or not jobs_raw:
        raise ConfigurationError("Configuration must include a non-empty 'jobs' list.")

    base_dir = config_path.parent.resolve()
    jobs = [Job.from_dict(job_raw, base_dir, default_interval, default_branch) for job_raw in jobs_raw]
    return jobs, default_interval


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s"))
    logger.setLevel(level)
    logger.handlers.clear()
    logger.addHandler(handler)


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Automated Git hot update runner")
    parser.add_argument(
        "--config",
        default=Path(__file__).with_name("auto_update_config.json"),
        type=Path,
        help="Path to configuration JSON file.",
    )
    parser.add_argument("--once", action="store_true", help="Run a single update cycle and exit")
    parser.add_argument("--start", action="store_true", help="Run initial update and start services, then monitor continuously")
    parser.add_argument("--job", action="append", help="Run only specific job names (can repeat)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args(list(argv) if argv is not None else None)

    configure_logging(args.verbose)

    try:
        jobs, _ = load_jobs(args.config)
    except ConfigurationError as exc:
        logger.error("Configuration error: %s", exc)
        return 2

    if args.job:
        selected = set(args.job)
        jobs = [job for job in jobs if job.name in selected]
        if not jobs:
            logger.error("No jobs matched the provided names: %s", ", ".join(sorted(selected)))
            return 3

    stop_event = threading.Event()

    def handle_signal(signum, _frame):
        logger.info("Signal %s received. Stopping workers...", signum)
        stop_event.set()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    threads = []
    for job in jobs:
        thread = threading.Thread(target=worker, args=(job, stop_event, args.once, args.start), daemon=True)
        thread.start()
        threads.append(thread)

    if args.once:
        for thread in threads:
            thread.join()
        return 0

    try:
        while any(thread.is_alive() for thread in threads):
            for thread in threads:
                thread.join(timeout=1)
    except KeyboardInterrupt:
        handle_signal(signal.SIGINT, None)
        for thread in threads:
            thread.join()

    return 0


if __name__ == "__main__":
    sys.exit(main())
