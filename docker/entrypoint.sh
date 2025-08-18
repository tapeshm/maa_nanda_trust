#!/usr/bin/env bash
set -e

USER_ID=${UID:-1000}
GROUP_ID=${GID:-1000}

# The pnpm store is a named volume owned by root. Fix its ownership.
chown -R $USER_ID:$GROUP_ID /home/devuser/.local/share/pnpm

# Step down from root and execute the main command as devuser.
# This ensures that any files created in /app (like node_modules)
# will be owned by the host user.
exec gosu devuser "$@"
