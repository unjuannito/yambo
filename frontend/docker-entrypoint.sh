#!/bin/sh
# Substitute environment variables in the nginx config before starting supervisord.
# BACKEND_INTERNAL_URL must be set at runtime (docker-compose / k8s env).
set -e

if [ -z "${BACKEND_INTERNAL_URL}" ]; then
    echo "ERROR: BACKEND_INTERNAL_URL is not set. See .env.example." >&2
    exit 1
fi

# envsubst replaces ${BACKEND_INTERNAL_URL} in the nginx config in-place
# (operates on a copy so the original template survives container restarts)
envsubst '${BACKEND_INTERNAL_URL}' \
    < /etc/nginx/http.d/default.conf \
    > /tmp/nginx-default.conf
cp /tmp/nginx-default.conf /etc/nginx/http.d/default.conf

exec "$@"
