#!/bin/bash
# .github/hooks/pre-push.sh
# Bash version — untuk CI/Linux environment
# Dipanggil oleh GitHub Actions workflow

set -euo pipefail

REMOTE_NAME="$1"
REMOTE_URL="$2"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  📋 CHANGELOG CHECK (pre-push)                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Get unpushed commits
UNPUSHED=$(git log "${REMOTE_NAME}/HEAD"..HEAD --oneline --no-merges 2>/dev/null || git log HEAD --oneline --no-merges --not --remotes 2>/dev/null || echo "")

if [ -z "$UNPUSHED" ]; then
    echo "✅ Tidak ada commit yang belum di-push."
    echo ""
    exit 0
fi

# Check for conventional commit prefixes
HAS_CHANGES=$(echo "$UNPUSHED" | grep -E "^(feat|fix|change|remove|docs|chore)(\(.*?\))?:" || true)

if [ -z "$HAS_CHANGES" ]; then
    echo "✅ Tidak ada conventional commit baru. CHANGELOG tidak perlu update."
    echo ""
    exit 0
fi

# Check if CHANGELOG.md was modified in the latest commits
CHANGELOG_MODIFIED=$(git diff --name-only HEAD~1..HEAD 2>/dev/null | grep "CHANGELOG.md" || true)

if [ -n "$CHANGELOG_MODIFIED" ]; then
    echo "✅ CHANGELOG.md sudah diupdate di commit ini."
    echo ""
    exit 0
fi

echo "⚠️  Ditemukan conventional commit yang belum dicatat di CHANGELOG.md:"
echo "$HAS_CHANGES" | while read -r line; do
    echo "   • $line"
done
echo ""
echo "📝 Rekomendasi: Update CHANGELOG.md atau biarkan CI yang update."
echo ""

# Don't block the push — CI workflow will handle CHANGELOG update
exit 0
