"""
Shared logging configuration for the MCP server and agents.
Call setup_logging() at app start (e.g. from test_mcp_client) to enable detailed logs.
"""

import logging
import os
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger for backend packages. Call early (e.g. in test_mcp_client)."""
    fmt = "[%(asctime)s] [%(name)s] %(levelname)s: %(message)s"
    datefmt = "%H:%M:%S"
    # Use stderr so MCP stdio protocol (stdout) is not polluted when server runs as subprocess
    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt=datefmt,
        stream=sys.stderr,
        force=True,
    )
    log_file = os.environ.get("MCP_LOG_FILE")
    if log_file:
        fh = logging.FileHandler(log_file, mode="a", encoding="utf-8")
        fh.setFormatter(logging.Formatter(fmt, datefmt=datefmt))
        logging.getLogger().addHandler(fh)
    # Reduce noise from third-party libs
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
