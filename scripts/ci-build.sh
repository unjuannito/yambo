#!/bin/bash
# ============================================================================
# scripts/ci-build.sh — build + test + sonar en el build host.
# Ejecutado por Jenkins vía SSH al build host. TODA la config viene de
# variables de entorno (nada hardcodeado).
#
# Variables requeridas:
#   REGISTRY_URL      (p.ej. http://192.168.1.21:5000  — credencial yambo-registry)
#   REGISTRY_USER     (credencial yambo-registry-user)
#   REGISTRY_PASS     (credencial yambo-registry-pass)
#   SONAR_URL         (credencial yambo-sonar-url)
#   SONAR_TOKEN       (credencial yambo-sonar-token)
#   SONAR_PROJECT_KEY_BE / SONAR_PROJECT_KEY_FE
#   FRONTEND_TAG / BACKEND_TAG
#   FE_CHANGED / BE_CHANGED    ('true'/'false')
#   BRANCH_NAME / IS_PR / CHANGE_ID / CHANGE_BRANCH / CHANGE_TARGET
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/root/tools/jdk21/bin:/usr/local/bin:$PATH"

echo "── CI build @ $(hostname) ──────────────────────────────"
echo "  repo:  $(git rev-parse --short HEAD)"
echo "  fe:    ${FE_CHANGED:-false} tag=${FRONTEND_TAG:-}"
echo "  be:    ${BE_CHANGED:-false} tag=${BACKEND_TAG:-}"
echo "  sonar: ${SONAR_URL:-}"

# Docker login al registry (auth)
if [ -n "${REGISTRY_PASS:-}" ]; then
    echo "${REGISTRY_PASS}" | docker login "${REGISTRY_URL#*://}" -u "${REGISTRY_USER}" --password-stdin >/dev/null 2>&1
    echo "  registry login: OK (${REGISTRY_URL})"
fi

# ── Branch args para Sonar ─────────────────────────────────
sonar_branch_args() {
    if [ "${IS_PR:-false}" = "true" ]; then
        echo "-Dsonar.pullrequest.key=${CHANGE_ID} -Dsonar.pullrequest.branch=${CHANGE_BRANCH} -Dsonar.pullrequest.base=${CHANGE_TARGET}"
    elif [ "${BRANCH_NAME:-}" = "main" ]; then
        echo ""
    else
        echo "-Dsonar.branch.name=${BRANCH_NAME}"
    fi
}

# ── Backend: test + sonar + imagen ──────────────────────────
if [ "${BE_CHANGED:-false}" = "true" ]; then
    echo "── Backend test ──"
    ( cd backend && chmod +x mvnw && ./mvnw verify -T 1C -B )

    echo "── Backend Sonar ──"
    ( cd backend && ./mvnw sonar:sonar \
        -Dsonar.projectKey="${SONAR_PROJECT_KEY_BE}" \
        -Dsonar.projectName="${SONAR_PROJECT_KEY_BE}" \
        -Dsonar.coverage.jacoco.xmlReportPaths=target/jacoco-report/jacoco.xml \
        -Dsonar.host.url="${SONAR_URL}" -Dsonar.token="${SONAR_TOKEN}" \
        $(sonar_branch_args) )

    echo "── Backend image ──"
    docker build -t "${REGISTRY_URL#*://}/yambo-web-backend:${BACKEND_TAG}" backend
    docker push "${REGISTRY_URL#*://}/yambo-web-backend:${BACKEND_TAG}"
else
    echo "── Backend sin cambios — skip ──"
fi

# ── Frontend: test + sonar + imagen ─────────────────────────
if [ "${FE_CHANGED:-false}" = "true" ]; then
    echo "── Frontend test/build ──"
    ( cd frontend && npm install --no-audit --no-fund && npm run typecheck && npm run build )

    echo "── Frontend Sonar ──"
    ( cd frontend && npx sonar-scanner \
        --define sonar.host.url="${SONAR_URL}" \
        --define sonar.token="${SONAR_TOKEN}" \
        --define sonar.projectKey="${SONAR_PROJECT_KEY_FE}" \
        $(sonar_branch_args | sed 's/-D/--define /g') )

    echo "── Frontend image ──"
    docker build -t "${REGISTRY_URL#*://}/yambo-web-frontend:${FRONTEND_TAG}" frontend
    docker push "${REGISTRY_URL#*://}/yambo-web-frontend:${FRONTEND_TAG}"
else
    echo "── Frontend sin cambios — skip ──"
fi

echo "── CI build COMPLETO ───────────────────────────────────"
