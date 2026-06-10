#!/bin/zsh
# Bygg om bundlen, committa allt och pusha till GitHub (= uppdatera GitHub Pages).
# Användning: ./deploy.sh "valfritt commit-meddelande"
set -e
cd "$(dirname "$0")"

python3 build.py

MSG="${1:-Uppdatering $(date '+%Y-%m-%d %H:%M')}"
git add -A
git commit -m "$MSG" || { echo "Inget att committa."; exit 0; }
git push
echo "✓ Pushat — GitHub Pages uppdateras inom någon minut."
