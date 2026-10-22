#!/usr/bin/env python3
"""
reorder-dump.py — Reorders INSERT blocks in a yambo anonymized SQL dump
according to the canonical parent→child dependency order.

Usage:
    python3 scripts/reorder-dump.py [input.sql] [output.sql]

Defaults:
    input  = yambo-anon-dump.sql
    output = yambo-anon-dump.sql  (in-place, original backed up to .bak)
"""

import re
import sys
import shutil
from pathlib import Path

# ---------------------------------------------------------------------------
# Canonical insert order (parent → child)
# ---------------------------------------------------------------------------
TABLE_ORDER = [
    # 2.1 Master / catalogue
    "profile",
    "permission",
    "settings",
    # 2.2 Users / files
    "user",
    "uploaded_file",
    # 2.3 Security & user relations
    "profile_permission",
    "user_profile",
    "user_permission",
    # 2.4 Projects
    "project",
    "project_group",
    "user_project_group",
    # 2.5 Families / products
    "family_product",
    "family_product_project",
    "product",
    "family_product_watcher",
    # 2.6 Activity
    "activity",
    # 2.7 Orders
    "order",
    "order_product",
    "order_status_history",
    # 2.8 Issues
    "issue",
    "issue_comment",
    "issue_order_product",
    "issue_watcher",
    # 2.9 Views
    "product_view",
    # 2.10 Invitations
    "invitations",
    "invitation_profile",
    "invitation_registration",
    "nominative_invitations",
    "nominative_invitation_profile",
    # 2.11 Conditional permissions
    "condition",
    # 2.12 SEO
    "seo_metadata",
    # 2.13 Audit / login / tokens
    "user_login_history",
    "password_reset_token",
]

# Tables that should NOT be reordered (skipped from seed)
SKIP_TABLES = {"databasechangelog", "databasechangeloglock"}

# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------
# Match block headers.  INSERT bodies are extracted by slicing between headers,
# so multi-line INSERT values (with embedded newlines) are handled correctly.
HEADER_RE = re.compile(
    r"--\n-- Data for Name: (\w+); Type: TABLE DATA; Schema: public; Owner: -\n--\n"
)

# Marks the start of the post-INSERT footer (sequence SETs, dump complete…)
FOOTER_RE = re.compile(
    r"\n--\n-- (?:Name: \w+; Type: SEQUENCE SET|PostgreSQL database dump complete)"
)


def parse(content: str):
    """
    Returns (preamble, {table_name: block_text}, footer)

    block_text = header comment + all INSERT lines (including multi-line values).
    footer     = sequence SET sections + dump-complete + unrestrict + reset.
    """
    headers = list(HEADER_RE.finditer(content))
    if not headers:
        raise ValueError("No '-- Data for Name:' blocks found in file.")

    preamble = content[: headers[0].start()]

    # Determine where the footer starts (first sequence-set / dump-complete comment)
    footer_match = FOOTER_RE.search(content, headers[-1].end())
    footer_start = footer_match.start() + 1 if footer_match else len(content)  # +1 to skip leading \n
    footer = content[footer_start:]

    blocks: dict[str, str] = {}

    for i, m in enumerate(headers):
        table = m.group(1)
        body_start = m.end()

        # Body ends at next header, or at the footer boundary
        if i + 1 < len(headers):
            body_end = headers[i + 1].start()
        else:
            body_end = footer_start

        raw_body = content[body_start:body_end].rstrip("\n")
        insert_body = raw_body.strip("\n")  # remove leading blank line too

        if insert_body:
            blocks[table] = m.group(0) + "\n" + insert_body
        else:
            blocks[table] = m.group(0).rstrip("\n")  # empty table

    return preamble, blocks, footer


# ---------------------------------------------------------------------------
# Reordering
# ---------------------------------------------------------------------------
def reorder(blocks: dict[str, str]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    # First: tables in the canonical order (skip non-seed tables)
    for table in TABLE_ORDER:
        if table in SKIP_TABLES:
            continue
        if table in blocks:
            ordered.append(blocks[table])
            seen.add(table)

    # Then: any tables present in the dump but not listed in TABLE_ORDER
    # (append at the end so nothing is silently dropped)
    extras = [t for t in blocks if t not in seen and t not in SKIP_TABLES]
    if extras:
        print(f"[warn] Tables not in canonical order (appended at end): {extras}", file=sys.stderr)
        for table in extras:
            ordered.append(blocks[table])

    return ordered


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    input_path  = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("yambo-anon-dump.sql")
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else input_path

    if not input_path.exists():
        print(f"[error] Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    content = input_path.read_text(encoding="utf-8")
    preamble, blocks, footer = parse(content)

    missing = [t for t in TABLE_ORDER if t not in blocks and t not in SKIP_TABLES]
    if missing:
        print(f"[info]  Tables in order list but absent from dump (skipped): {missing}", file=sys.stderr)

    ordered_blocks = reorder(blocks)

    # Back up original if writing in-place
    if input_path == output_path:
        backup = input_path.with_suffix(".sql.bak")
        shutil.copy2(input_path, backup)
        print(f"[info]  Backup written to {backup}", file=sys.stderr)

    parts = [preamble.rstrip("\n")]
    for block in ordered_blocks:
        parts.append("\n\n" + block)
    parts.append(footer)

    output_path.write_text("".join(parts), encoding="utf-8")
    print(f"[ok]    Reordered dump written to {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
