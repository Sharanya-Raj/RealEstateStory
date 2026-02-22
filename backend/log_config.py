"""
Shared logging configuration.
Uses print-based logging that works reliably under uvicorn's reloader.
"""

import logging
import os
import sys
import time as _time


def _log(tag: str, msg: str) -> None:
    """Print a visible, timestamped log line that always appears in the terminal."""
    ts = _time.strftime("%H:%M:%S")
    safe_msg = msg.encode("ascii", errors="replace").decode("ascii")
    print(f"\n>> [{ts}] {tag} | {safe_msg}", flush=True)


class _PrintHandler(logging.Handler):
    """Routes Python logging through print() so it survives uvicorn's reloader."""
    def emit(self, record):
        try:
            msg = self.format(record)
            _log(record.name, msg)
        except Exception:
            self.handleError(record)


def setup_logging(level: int = logging.DEBUG) -> None:
    """Configure all loggers to use print-based output."""
    handler = _PrintHandler()
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter("%(message)s"))

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

    log_file = os.environ.get("MCP_LOG_FILE")
    if log_file:
        if not os.path.isabs(log_file):
            _backend_dir = os.path.dirname(os.path.abspath(__file__))
            log_file = os.path.join(_backend_dir, log_file)
        fmt = "[%(asctime)s] %(name)s | %(levelname)s | %(message)s"
        fh = logging.FileHandler(log_file, mode="a", encoding="utf-8")
        fh.setFormatter(logging.Formatter(fmt, datefmt="%H:%M:%S"))
        root.addHandler(fh)

    # Reduce noise from third-party libs
    for lib in ("httpx", "httpcore", "openai", "urllib3", "selenium",
                "undetected_chromedriver", "mcp", "watchfiles"):
        logging.getLogger(lib).setLevel(logging.WARNING)
