#!/usr/bin/env bash
set -euo pipefail

LOCALE_FILE="/workspace/frontend/app/i18n/locales/es.json"
SRC_DIR="/workspace/frontend/app"

if [ ! -f "$LOCALE_FILE" ]; then
    echo "Locale file not found: $LOCALE_FILE"
    exit 1
fi

export LC_ALL=C

echo "Extracting translation keys..."
locale_keys=$(jq -r 'paths(scalars) | join(".")' "$LOCALE_FILE" | sort -u)

echo "Scanning source for translation key usage (single pass)..."
used_keys=$(grep -RhoE \
    '\bt\(["'\''][A-Za-z0-9_.]+["'\'']|\bi18n\.t\(["'\''][A-Za-z0-9_.]+["'\'']|\bi18nKey=["'\''][A-Za-z0-9_.]+["'\'']' \
    "$SRC_DIR" 2>/dev/null |
    sed -E \
        -e 's/^t\(["'\'']//' \
        -e 's/^i18n\.t\(["'\'']//' \
        -e 's/^i18nKey=["'\'']//' \
        -e 's/["'\'']$//' |
    sort -u)

echo
echo "============================"
echo "Checking unused translations"
echo "============================"
unused_list=$(comm -23 <(printf '%s\n' "$locale_keys") <(printf '%s\n' "$used_keys"))
unused=0
if [ -n "$unused_list" ]; then
    while IFS= read -r key; do
        echo "❌ UNUSED: $key"
        unused=$((unused + 1))
    done <<< "$unused_list"
fi

echo
echo "============================"
echo "Checking missing translations"
echo "============================"
missing_list=$(comm -13 <(printf '%s\n' "$locale_keys") <(printf '%s\n' "$used_keys"))
if [ -n "$missing_list" ]; then
    while IFS= read -r key; do
        if [[ "$key" =~ ^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$ ]]; then
            echo "⚠️  MISSING: $key"
        fi
    done <<< "$missing_list"
fi

echo
echo "Finished."
echo "Unused keys: $unused"