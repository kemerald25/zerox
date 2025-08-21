#!/bin/bash

# File watcher script that triggers auto-commit when files change
# To stop this script, press Ctrl+C
# This script respects .gitignore patterns

echo "Starting file watcher for auto-commits..."

# Check if fswatch is installed
if ! command -v fswatch &> /dev/null; then
  echo "Error: fswatch is not installed. Please install it first."
  echo "On macOS, you can install it with: brew install fswatch"
  exit 1
fi

# Set up variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_COMMIT_SCRIPT="$SCRIPT_DIR/auto-commit.sh"

# Make sure auto-commit.sh exists and is executable
if [[ ! -x "$AUTO_COMMIT_SCRIPT" ]]; then
  echo "Error: auto-commit.sh not found or not executable"
  exit 1
fi

# Create exclude patterns from .gitignore
IGNORE_PATTERN="(\.git|\.cursor)"

# Add gitignore patterns to the exclude list if .gitignore exists
if [[ -f .gitignore ]]; then
  echo "Using patterns from .gitignore"
  # Convert .gitignore patterns to fswatch compatible format
  GITIGNORE_PATTERNS=$(grep -v "^#" .gitignore | grep -v "^$" | sed 's/^\///g' | tr '\n' '|' | sed 's/|$//')
  if [[ ! -z "$GITIGNORE_PATTERNS" ]]; then
    IGNORE_PATTERN="$IGNORE_PATTERN|$GITIGNORE_PATTERNS"
  fi
fi

echo "Ignoring patterns: $IGNORE_PATTERN"

# Run the file watcher
echo "Watching for file changes (press Ctrl+C to stop)..."
fswatch -o . --exclude="$IGNORE_PATTERN" | while read -r; do
  # Add a small delay to group changes
  sleep 1
  
  # Run the auto-commit script
  "$AUTO_COMMIT_SCRIPT"
done