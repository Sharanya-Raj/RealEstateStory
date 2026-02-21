#!/usr/bin/env python3
"""
Test script to call the Ghibli Nest MCP server.
User enters: University/location (e.g. Princeton University) and monthly rent budget.
The script sends this to the MCP agent and prints the full analysis.
"""

import asyncio
import json
import logging
import os
import sys

# Ensure backend is on path when run from project root or backend/
_script_dir = os.path.dirname(os.path.abspath(__file__))
if _script_dir not in sys.path:
    sys.path.insert(0, _script_dir)
os.chdir(_script_dir)

# Enable detailed logging for MCP, tools, and API calls
from log_config import setup_logging
setup_logging()

logger = logging.getLogger("test_mcp_client")

from fastmcp import Client
from server import ListingQuery


def _direct_call(address: str, budget: float) -> str:
    """Fallback: call the MCP tool directly (no server subprocess)."""
    from server import search_and_analyze_property, ListingQuery

    logger.info("DIRECT mode: calling search_and_analyze_property (no MCP subprocess)")
    query = ListingQuery(address=address, budget=budget)
    result = search_and_analyze_property(query)
    logger.info("search_and_analyze_property returned successfully")
    return result


async def _mcp_client_call(address: str, budget: float) -> str:
    """Call the MCP server via FastMCP Client (spawns server.py subprocess)."""
    server_path = os.path.join(_script_dir, "server.py")
    logger.info("MCP mode: spawning server subprocess %s", server_path)

    client = Client(server_path)

    async with client:
        logger.info("MCP tool call: search_and_analyze_property(address=%r, budget=%s)", address, budget)
        result = await client.call_tool(
            "search_and_analyze_property",
            {"query": {"address": address, "budget": budget}},
            timeout=120.0,
            raise_on_error=False,
        )
        if result.is_error:
            text = (
                getattr(result.content[0], "text", str(result.content))
                if result.content
                else "Unknown error"
            )
            logger.error("MCP tool failed: %s", text)
            raise RuntimeError(f"MCP tool failed: {text}")
        logger.info("MCP tool search_and_analyze_property completed successfully")
        return result.data if result.data is not None else (
            result.content[0].text if result.content else ""
        )


def main():
    logger.info("===== Ghibli Nest MCP Test Client starting =====")
    print("=" * 60)
    print("  Ghibli Nest - MCP Test Client")
    print("  Enter a University/location and rent budget to see the analysis")
    print("=" * 60)

    uni = "princeton university"
    budget = 2500.0

    # When MCP_LOG_FILE is set, use DIRECT mode so server/agent logs are captured (subprocess logs aren't visible)
    use_mcp = os.environ.get("USE_MCP_CLIENT", "1") == "1"
    if os.environ.get("MCP_LOG_FILE") and use_mcp:
        use_mcp = False
        logger.info("MCP_LOG_FILE set: using DIRECT mode so server/agent logs appear in the log file")
    logger.info("Mode: %s", "MCP (subprocess)" if use_mcp else "DIRECT (in-process)")

    print(f"\nCalling with: address={uni!r}, budget=${budget:.0f}/mo")
    print("Please wait... (this may take 30-60 seconds with real scrapers)")
    if use_mcp:
        print("Tip: Set MCP_LOG_FILE=mcp.log to capture full server/agent logs (switches to DIRECT mode).\n")
    else:
        print()

    try:
        if use_mcp:
            result = asyncio.run(_mcp_client_call(uni, budget))
        else:
            result = _direct_call(uni, budget)
    except Exception as e:
        print(f"Error: {e}")
        if use_mcp:
            print("\nTip: Set USE_MCP_CLIENT=0 to call the pipeline directly (no MCP server).")
        sys.exit(1)

    # Pretty-print if it's JSON
    if isinstance(result, str):
        try:
            parsed = json.loads(result)
            print(json.dumps(parsed, indent=2))
        except json.JSONDecodeError:
            print(result)
    else:
        print(json.dumps(result, indent=2) if isinstance(result, dict) else result)


if __name__ == "__main__":
    main()
