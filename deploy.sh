#!/bin/zsh
# Rebuild the bundle, commit everything and push to GitHub (= update GitHub Pages).
# Usage: ./deploy.sh "optional commit message"
set -e
cd "$(dirname "$0")"

python3 build.py

MSG="${1:-Update $(date '+%Y-%m-%d %H:%M')}"
git add -A
git commit -m "$MSG" || { echo "Nothing to commit."; exit 0; }
git push
echo "✓ Pushed — GitHub Pages updates within a minute."
