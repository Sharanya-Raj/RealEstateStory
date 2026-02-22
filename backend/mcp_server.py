#!/usr/bin/env python3
"""MCP stdio server entry point. Imports mcp from main and runs it."""
import sys
import os

_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)
os.chdir(_script_dir)

# Load .env and configure logging before importing main (so MCP_LOG_FILE works)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_script_dir, ".env"))
except ImportError:
    pass
from log_config import setup_logging
setup_logging()

from main import mcp
mcp.run()
