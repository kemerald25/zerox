#!/bin/bash

# Auto-commit script to commit each modified file individually
# with commit message format "Modified{filename}"
# This script respects .gitignore files

echo "Auto-commit script started"

# Check if there are any changes to commit
if [[ -z $(git status -s) ]]; then
  echo "No changes to commit"
  exit 0
fi

# Get list of modified files (including new files, but excluding deleted files)
# The use of 'git status' already respects .gitignore
MODIFIED_FILES=$(git status -s | grep -v "^D" | awk '{print $2}')

# Exit if no modified files found
if [[ -z "$MODIFIED_FILES" ]]; then
  echo "No modified files found"
  exit 0
fi

# Process each modified file
for FILE in $MODIFIED_FILES; do
  echo "Processing file: $FILE"
  
  # Skip files if they match patterns in .gitignore but were forcibly tracked
  if git check-ignore -q "$FILE"; then
    echo "Skipping ignored file: $FILE"
    continue
  fi
  
  # Stage the file
  git add "$FILE"
  
  # Commit with the required message format
  git commit -m "Modified ${FILE}"
  
  echo "Committed: $FILE"
done

echo "Auto-commit script completed successfully"