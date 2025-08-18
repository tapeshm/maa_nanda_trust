# Cloudflare Worker + Tailwind local-dev image (Node 22-slim)
FROM node:22-slim

ARG UID=1000
ARG GID=1000

# 1. As ROOT: Install packages and create the user
RUN apt-get update && apt-get install -y --no-install-recommends \
  tini gosu \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd -g $GID -o devgroup && \
  useradd -u $UID -g $GID -o -s /bin/bash devuser

# 2. As ROOT: Enable corepack
RUN corepack enable

# As ROOT: Create a skeleton home directory and pnpm store for devuser
RUN mkdir -p /home/devuser/.local/share/pnpm && \
  chown -R devuser:devgroup /home/devuser

# Set environment variables
ENV PNPM_HOME=/home/devuser/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=development
ENV FORCE_COLOR=1
ENV WRANGLER_SEND_METRICS=false

# 3. Set the working directory
WORKDIR /app

# 4. Copy all source code. We are NOT running 'pnpm install' here.
# Copy entrypoint first to ensure it's present, then the rest.
COPY ./docker/entrypoint.sh /app/docker/entrypoint.sh
COPY . .

# 5. As root, ensure the entrypoint is executable
RUN chmod +x /app/docker/entrypoint.sh

# The container will start as root and run this entrypoint
ENTRYPOINT ["tini", "--", "/app/docker/entrypoint.sh"]

# The command that the entrypoint will execute after stepping down to devuser
EXPOSE 8787
CMD ["sh", "-c", "pnpm install && pnpm dev"]
