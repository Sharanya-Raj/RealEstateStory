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

# Load .env so OPENROUTER_API_KEY, GEMINI_API_KEY etc. are available
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_script_dir, ".env"))
except ImportError:
    pass

# Enable detailed logging for MCP, tools, and API calls
from log_config import setup_logging
setup_logging()

logger = logging.getLogger("test_mcp_client")

from fastmcp import Client
from main import ListingQuery


def _direct_call(address: str, budget: float) -> str:
    """Fallback: call the MCP tool directly (no server subprocess)."""
    from main import search_and_analyze_property, ListingQuery

    logger.info("DIRECT mode: calling search_and_analyze_property (no MCP subprocess)")
    query = ListingQuery(address=address, budget=budget)
    result = search_and_analyze_property(query)
    logger.info("search_and_analyze_property returned successfully")
    return result


async def _mcp_client_call(address: str, budget: float) -> str:
    """Call the MCP server via FastMCP Client (spawns mcp_server.py which uses main's mcp)."""
    server_path = os.path.join(_script_dir, "mcp_server.py")
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

    # uni = "princeton university"
    uni = "rutgers university"
    budget = 2500.0

    # When MCP_LOG_FILE is set, use DIRECT mode so server/agent logs are captured (subprocess logs aren't visible)
    use_mcp = os.environ.get("USE_MCP_CLIENT", "1") == "1"
    log_file = os.environ.get("MCP_LOG_FILE")
    if log_file and use_mcp:
        use_mcp = False
        # Resolve path same as log_config so we can tell the user where to look
        if not os.path.isabs(log_file):
            log_file = os.path.join(_script_dir, log_file)
        logger.info("MCP_LOG_FILE set: using DIRECT mode, logging to %s", os.path.abspath(log_file))
    logger.info("Mode: %s", "MCP (subprocess)" if use_mcp else "DIRECT (in-process)")

    print(f"\nCalling with: address={uni!r}, budget=${budget:.0f}/mo")
    print("Please wait... (this may take 30-60 seconds with real scrapers)")
    if use_mcp:
        print("Tip: Set MCP_LOG_FILE=mcp.log to capture full server/agent logs (switches to DIRECT mode).\n")
    elif log_file:
        _path = os.path.join(_script_dir, log_file) if not os.path.isabs(log_file) else log_file
        print(f"Logging to: {os.path.abspath(_path)}\n")
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

    # Parse result
    parsed = None
    if isinstance(result, str):
        try:
            parsed = json.loads(result)
        except json.JSONDecodeError:
            parsed = {"raw": result}
    else:
        parsed = result if isinstance(result, dict) else {"raw": str(result)}

    # --- Logs summary ---
    print("\n" + "=" * 60)
    print("  LOGS")
    print("=" * 60)
    if log_file:
        _path = os.path.join(_script_dir, log_file) if not os.path.isabs(log_file) else log_file
        print(f"  Log file: {os.path.abspath(_path)}")
    else:
        msg = "Logs: stderr"
        if use_mcp:
            msg += " (MCP subprocess logs not captured; set MCP_LOG_FILE=mcp.log for full logs)"
        else:
            msg += " (set MCP_LOG_FILE=mcp.log to capture to file)"
        print(f"  {msg}")
    print()

    # --- Listings analyzed summary ---
    if parsed and "listings" in parsed:
        listings_data = parsed["listings"]
        total = parsed.get("total_analyzed", len(listings_data))
        print("=" * 60)
        print(f"  LISTINGS ANALYZED ({total})")
        print("=" * 60)
        for i, item in enumerate(listings_data, 1):
            lst = item.get("listing", item) if isinstance(item, dict) else {}
            ins = item.get("insights", {}) if isinstance(item, dict) else {}
            addr = lst.get("address", ins.get("address", "Unknown"))
            rent = lst.get("base_rent", ins.get("rent", "—"))
            match = ins.get("matchScore", "—")
            true_cost = ins.get("trueCost", "—")
            print(f"  {i}. {addr}")
            print(f"     Rent: ${rent}  |  Match: {match}%  |  True cost: ${true_cost}")
        print()

    # Full JSON output
    print("=" * 60)
    print("  FULL OUTPUT (JSON)")
    print("=" * 60)
    print(json.dumps(parsed, indent=2))

    if parsed is not None:
        with open("result.json", "w") as f:
            json.dump(parsed, f, indent=2)
        print(f"\nSaved to result.json")


if __name__ == "__main__":
    main()
