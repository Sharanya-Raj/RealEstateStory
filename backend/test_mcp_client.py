#!/usr/bin/env python3
"""
Test script for the Ghibli Nest pipeline.

Usage:
    python test_mcp_client.py              # runs both test cases
    python test_mcp_client.py rutgers      # Rutgers only
    python test_mcp_client.py princeton    # Princeton only

Environment variables:
    USE_MCP_CLIENT=0    Call pipeline directly instead of spawning MCP subprocess
    MCP_LOG_FILE=mcp.log  Capture full logs to file (forces DIRECT mode)
"""

import asyncio
import json
import logging
import os
import sys
from dataclasses import dataclass

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


# ── Test case definitions ────────────────────────────────────────────────────

@dataclass
class TestCase:
    name: str                       # display name
    address: str                    # college / search address
    budget: float                   # max monthly rent
    roommates: str = "solo"         # "solo" | "1+" | "2+"
    parking: str = "not_needed"     # "not_needed" | "1" | "2"
    max_distance_miles: float = 30.0
    result_file: str = "result.json"


TEST_CASES = {
    "rutgers": TestCase(
        name="Rutgers University — solo, no parking, $2,500, 10 mi",
        address="rutgers university",
        budget=2500.0,
        roommates="solo",
        parking="not_needed",
        max_distance_miles=10.0,
        result_file="result_rutgers.json",
    ),
    "princeton": TestCase(
        name="Princeton University — 1+ roommate, 1 parking spot, $3,500, 5 mi",
        address="princeton university",
        budget=3500.0,
        roommates="1+",
        parking="1",
        max_distance_miles=5.0,
        result_file="result_princeton.json",
    ),
}


# ── Core call helpers ────────────────────────────────────────────────────────

def _build_query(tc: TestCase) -> ListingQuery:
    return ListingQuery(
        address=tc.address,
        budget=tc.budget,
        roommates=tc.roommates,
        parking=tc.parking,
        max_distance_miles=tc.max_distance_miles,
    )


def _direct_call(tc: TestCase) -> str:
    """Call the pipeline in-process (no MCP subprocess)."""
    from main import search_and_analyze_property

    logger.info("DIRECT mode: calling search_and_analyze_property for %r", tc.address)
    result = search_and_analyze_property(_build_query(tc))
    logger.info("search_and_analyze_property returned successfully")
    return result


async def _mcp_client_call(tc: TestCase) -> str:
    """Call via FastMCP Client (spawns mcp_server.py subprocess)."""
    server_path = os.path.join(_script_dir, "mcp_server.py")
    logger.info("MCP mode: spawning server subprocess %s", server_path)
    client = Client(server_path)
    q = _build_query(tc)
    async with client:
        logger.info(
            "MCP tool call: search_and_analyze_property(address=%r, budget=%s, roommates=%s, parking=%s, max_dist=%s)",
            q.address, q.budget, q.roommates, q.parking, q.max_distance_miles,
        )
        result = await client.call_tool(
            "search_and_analyze_property",
            {"query": {
                "address": q.address,
                "budget": q.budget,
                "roommates": q.roommates,
                "parking": q.parking,
                "max_distance_miles": q.max_distance_miles,
            }},
            timeout=180.0,
            raise_on_error=False,
        )
        if result.is_error:
            text = (
                getattr(result.content[0], "text", str(result.content))
                if result.content else "Unknown error"
            )
            logger.error("MCP tool failed: %s", text)
            raise RuntimeError(f"MCP tool failed: {text}")
        logger.info("MCP tool completed successfully")
        return result.data if result.data is not None else (
            result.content[0].text if result.content else ""
        )


# ── Per-test runner ──────────────────────────────────────────────────────────

def _run_test(tc: TestCase, use_mcp: bool, log_file: str | None) -> bool:
    """Run a single test case. Returns True on success."""
    sep = "=" * 60
    print(f"\n{sep}")
    print(f"  TEST: {tc.name}")
    print(sep)
    print(f"  Address : {tc.address}")
    print(f"  Budget  : ${tc.budget:.0f}/mo (max)")
    print(f"  Roomates: {tc.roommates}  |  Parking: {tc.parking}  |  Max dist: {tc.max_distance_miles} mi")
    print(f"  Mode    : {'MCP subprocess' if use_mcp else 'DIRECT (in-process)'}")
    if log_file:
        _p = os.path.join(_script_dir, log_file) if not os.path.isabs(log_file) else log_file
        print(f"  Log file: {os.path.abspath(_p)}")
    print()

    logger.info("--- Running test: %s ---", tc.name)

    try:
        if use_mcp:
            raw = asyncio.run(_mcp_client_call(tc))
        else:
            raw = _direct_call(tc)
    except Exception as e:
        print(f"  ERROR: {e}")
        logger.error("Test failed: %s", e)
        return False

    # Parse
    try:
        parsed = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        parsed = {"raw": raw}

    # Summary table
    if parsed and "listings" in parsed:
        listings_data = parsed["listings"]
        total = parsed.get("total_analyzed", len(listings_data))
        db_inserted = parsed.get("db_inserted")
        print(f"  Listings analyzed: {total}" + (f"  |  DB inserted: {db_inserted}" if db_inserted is not None else ""))
        print(f"  {'#':<3}  {'Address':<40}  {'Rent':>7}  {'Match':>6}  {'True cost':>10}")
        print(f"  {'-'*3}  {'-'*40}  {'-'*7}  {'-'*6}  {'-'*10}")
        for i, item in enumerate(listings_data, 1):
            lst = item.get("listing", {}) if isinstance(item, dict) else {}
            ins = item.get("insights", {}) if isinstance(item, dict) else {}
            addr = (lst.get("address") or ins.get("address") or "Unknown")[:40]
            rent = lst.get("base_rent") or ins.get("rent") or "—"
            match = ins.get("matchScore", "—")
            true_cost = ins.get("trueCost", "—")
            print(f"  {i:<3}  {addr:<40}  ${rent!s:>6}  {match!s:>5}%  ${true_cost!s:>9}")
    elif parsed and "error" in parsed:
        print(f"  Pipeline returned error: {parsed['error']}")
    print()

    # Save JSON
    out_path = os.path.join(_script_dir, tc.result_file)
    with open(out_path, "w") as f:
        json.dump(parsed, f, indent=2)
    print(f"  Saved full output → {out_path}")
    return True


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    logger.info("===== Ghibli Nest MCP Test Client starting =====")

    # Pick which tests to run from CLI arg
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    if arg in TEST_CASES:
        to_run = [TEST_CASES[arg]]
    elif arg == "all":
        to_run = list(TEST_CASES.values())
    else:
        print(f"Unknown test {arg!r}. Available: {', '.join(TEST_CASES)} or 'all'")
        sys.exit(1)

    # Mode
    use_mcp = os.environ.get("USE_MCP_CLIENT", "1") == "1"
    log_file = os.environ.get("MCP_LOG_FILE")
    if log_file and use_mcp:
        use_mcp = False
        if not os.path.isabs(log_file):
            log_file = os.path.join(_script_dir, log_file)
        logger.info("MCP_LOG_FILE set → DIRECT mode, logging to %s", os.path.abspath(log_file))
    logger.info("Mode: %s", "MCP (subprocess)" if use_mcp else "DIRECT (in-process)")

    print("=" * 60)
    print("  Ghibli Nest — Test Runner")
    print(f"  Running: {arg}  |  Mode: {'MCP' if use_mcp else 'DIRECT'}")
    if use_mcp:
        print("  Tip: set MCP_LOG_FILE=mcp.log for full agent logs (forces DIRECT mode)")
    print("=" * 60)

    passed = 0
    for tc in to_run:
        ok = _run_test(tc, use_mcp, log_file)
        passed += int(ok)

    print("\n" + "=" * 60)
    print(f"  Results: {passed}/{len(to_run)} tests passed")
    print("=" * 60)
    if passed < len(to_run):
        sys.exit(1)


if __name__ == "__main__":
    main()
