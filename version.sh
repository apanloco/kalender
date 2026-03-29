#!/bin/sh
# Stamp version.js with the current git commit hash.
# Run this before deploying. Don't commit the result.
echo "export const VERSION = '$(git rev-parse --short HEAD)';" > js/version.js
echo "version.js updated to $(git rev-parse --short HEAD)"
