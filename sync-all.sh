#!/bin/bash
# sync-all.sh — Merge main into all worktrees and regenerate branch labels
# Usage: ./sync-all.sh
# Run from the main worktree (desert-golfing/)

set -e

MAIN_DIR="/mnt/c/Users/augus/projectss/desert-golfing"
WORKTREES=(
  "/mnt/c/Users/augus/projectss/desert-golfing-art-direction"
  "/mnt/c/Users/augus/projectss/desert-golfing-gameplay"
  "/mnt/c/Users/augus/projectss/desert-golfing-level-design"
  "/mnt/c/Users/augus/projectss/desert-golfing-qa-testing"
)

echo "=== Syncing all worktrees with main ==="

# First, ensure main is up to date
cd "$MAIN_DIR"
echo ""
echo "--- Pulling main ---"
git pull --ff-only origin main 2>/dev/null || echo "  (no remote changes or not tracking)"

# Regenerate branch.json for main
branch=$(git rev-parse --abbrev-ref HEAD)
echo "{\"branch\": \"$branch\"}" > branch.json

for wt in "${WORKTREES[@]}"; do
  if [ ! -d "$wt" ]; then
    echo ""
    echo "--- SKIP: $wt (not found) ---"
    continue
  fi

  cd "$wt"
  branch=$(git rev-parse --abbrev-ref HEAD)
  echo ""
  echo "--- Merging main into $branch ---"

  # Check for uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "  WARNING: Uncommitted changes in $wt — skipping merge"
    echo "{\"branch\": \"$branch\"}" > branch.json
    continue
  fi

  # Merge main, auto-resolving branch.json and index.html conflicts
  if git merge main --no-edit 2>/dev/null; then
    echo "  Merged successfully"
  else
    # Check if conflicts are only in files we can auto-resolve
    conflicted=$(git diff --name-only --diff-filter=U 2>/dev/null)
    auto_resolved=true

    for f in $conflicted; do
      case "$f" in
        branch.json)
          # Always keep our branch.json (it's gitignored going forward)
          git checkout --ours "$f"
          git add "$f"
          echo "  Auto-resolved: $f (kept ours)"
          ;;
        *)
          echo "  CONFLICT in $f — needs manual resolution"
          auto_resolved=false
          ;;
      esac
    done

    if [ "$auto_resolved" = true ] && [ -n "$conflicted" ]; then
      git commit --no-edit
      echo "  Auto-resolved all conflicts"
    elif [ "$auto_resolved" = false ]; then
      echo "  Aborting merge due to unresolvable conflicts"
      git merge --abort
    fi
  fi

  # Regenerate branch.json
  echo "{\"branch\": \"$branch\"}" > branch.json
done

echo ""
echo "=== Sync complete ==="
