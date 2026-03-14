#!/usr/bin/env python3
"""
check-migration-rollbacks.py
Checks that every 'risky' Liquibase changeSet in newly added/modified
migration files has an explicit <rollback> block.

Usage:
  python3 scripts/check-migration-rollbacks.py <base-ref>

  <base-ref> is used with `git diff --name-only <base-ref>...HEAD`
  to find the changed migration files.

  In Jenkins:  python3 scripts/check-migration-rollbacks.py origin/${CHANGE_TARGET}
  Locally:     python3 scripts/check-migration-rollbacks.py origin/develop

Exit code: 0 = all good, 1 = violations found.
"""

import sys
import subprocess
import os
import xml.etree.ElementTree as ET

MIGRATIONS_DIR = "backend/src/main/resources/db/changelog/changes"
NS = "http://www.liquibase.org/xml/ns/dbchangelog"

# These Liquibase refactoring types are automatically reversible —
# no explicit <rollback> needed.
AUTO_ROLLBACK_OPS = {
    "addColumn",
    "addForeignKeyConstraint",
    "addNotNullConstraint",
    "addPrimaryKey",
    "addUniqueConstraint",
    "addDefaultValue",
    "addAutoIncrement",
    "createIndex",
    "createSequence",
    "createTable",
    "createView",
    "renameColumn",
    "renameTable",
    "renameView",
}

# These operations CANNOT be automatically reversed by Liquibase.
# Any changeSet that contains one of these requires an explicit <rollback> block.
NEEDS_ROLLBACK_OPS = {
    "sql",
    "sqlFile",
    "insert",
    "update",
    "delete",
    "executeCommand",
    "dropTable",
    "dropColumn",
    "dropIndex",
    "dropForeignKeyConstraint",
    "dropPrimaryKey",
    "dropUniqueConstraint",
    "dropSequence",
    "dropView",
    "modifyDataType",
    "mergeColumns",
    "customChange",
    "alterSequence",
    "tagDatabase",
}

# Child tags that are not schema operations
META_TAGS = {"comment", "preConditions", "rollback", "validCheckSum", "where"}


def changed_migration_files(base_ref: str) -> list[str]:
    cmd = ["git", "diff", "--name-only", f"{base_ref}...HEAD", "--", MIGRATIONS_DIR]
    result = subprocess.run(cmd, capture_output=True, text=True)
    files = [f.strip() for f in result.stdout.splitlines() if f.strip().endswith(".xml")]
    return [f for f in files if os.path.isfile(f)]


def local_tag(element) -> str:
    """Strip XML namespace from tag name."""
    tag = element.tag
    if tag.startswith("{"):
        tag = tag.split("}", 1)[1]
    return tag


def check_file(path: str) -> list[str]:
    """Return a list of violation messages for the given migration file."""
    violations = []
    try:
        tree = ET.parse(path)
        root = tree.getroot()
    except ET.ParseError as e:
        return [f"{path}: XML parse error — {e}"]

    for changeset in root.iter(f"{{{NS}}}changeSet"):
        cs_id = changeset.get("id", "<no-id>")
        cs_author = changeset.get("author", "?")

        ops_present: set[str] = set()
        has_explicit_rollback = False

        for child in changeset:
            tag = local_tag(child)
            if tag == "rollback":
                has_explicit_rollback = True
            elif tag not in META_TAGS:
                ops_present.add(tag)

        if has_explicit_rollback:
            continue  # explicitly handled ✓

        risky = ops_present & NEEDS_ROLLBACK_OPS
        if risky:
            violations.append(
                f"  ❌  {path}\n"
                f"      changeSet id={cs_id!r} author={cs_author!r}\n"
                f"      Contains ops that need a rollback: {', '.join(sorted(risky))}\n"
                f"      → Add a <rollback> block to this changeSet."
            )

    return violations


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: check-migration-rollbacks.py <base-ref>", file=sys.stderr)
        sys.exit(1)

    base_ref = sys.argv[1]
    files = changed_migration_files(base_ref)

    if not files:
        print("✅  No new/modified migration files — nothing to check.")
        sys.exit(0)

    print(f"🔍  Checking {len(files)} migration file(s) against {base_ref!r}:")
    for f in files:
        print(f"    {f}")

    all_violations: list[str] = []
    for f in files:
        all_violations.extend(check_file(f))

    if all_violations:
        print(f"\n⚠️   {len(all_violations)} rollback violation(s) found:\n")
        for v in all_violations:
            print(v)
        print("\nAdd a <rollback> block to each flagged changeSet before merging.")
        sys.exit(1)
    else:
        print("\n✅  All new changesets have rollback coverage.")
        sys.exit(0)


if __name__ == "__main__":
    main()
