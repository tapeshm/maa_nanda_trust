#!/usr/bin/env bash
set -e

USER_ID=${UID:-1000}
GROUP_ID=${GID:-1000}

# Ensure PNPM store exists and is owned by the dev user
install -d -m 700 -o $USER_ID -g $GROUP_ID /home/devuser/.local/share/pnpm || true
if [ -n "$PNPM_STORE_DIR" ]; then
  install -d -m 700 -o $USER_ID -g $GROUP_ID "$PNPM_STORE_DIR" || true
fi

# Ensure container-managed node_modules volume is writable by dev user
install -d -m 775 -o $USER_ID -g $GROUP_ID /app/node_modules || true
chown -R $USER_ID:$GROUP_ID /app/node_modules || true

# Ensure Codex dir for 'node' user exists and is writable (for mounted auth.json)
install -d -m 700 -o node -g node /home/node/.codex || true

# Step down from root and execute the main command as devuser.
# This ensures that any files created in /app (like node_modules)
# will be owned by the host user.
exec gosu devuser "$@"
