#!/bin/bash
# Generate branch.json from current git branch
# Run this in any worktree to create/update the label
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "{\"branch\": \"$BRANCH\"}" > branch.json
echo "Generated branch.json: $BRANCH"
