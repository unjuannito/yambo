#!/bin/sh
# Substitute environment variables in the nginx config before starting supervisord.
# BACKEND_INTERNAL_URL must be set at runtime (docker-compose / k8s env).
set -e

if [ -z "${BACKEND_INTERNAL_URL}" ]; then
    echo "ERROR: BACKEND_INTERNAL_URL is not set. See .env.example." >&2
    exit 1
fi

# envsubst replaces ${BACKEND_INTERNAL_URL} and writes the result to /tmp.
# nginx-main.conf includes from /tmp/nginx-http.d/ so we never write back
# to the root-owned /etc/nginx/http.d/ directory.
mkdir -p /tmp/nginx-http.d
envsubst '${BACKEND_INTERNAL_URL}' \
    < /etc/nginx/http.d/default.conf \
    > /tmp/nginx-http.d/default.conf

exec "$@"
