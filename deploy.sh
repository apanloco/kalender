#!/bin/sh
# Generate version.js from current git commit hash, then push.
echo "export const VERSION = '$(git rev-parse --short HEAD)';" > js/version.js
git add js/version.js
git commit -m "Update version to $(git rev-parse --short HEAD)"
git push
