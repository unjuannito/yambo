#!/bin/bash
# ============================================================================
# scripts/ci-deploy.sh — deploy en el cluster objetivo.
# Ejecutado por Jenkins vía SSH al build host. TODA la config viene de
# variables de entorno (nada hardcodeado).
#
# Variables requeridas:
#   REGISTRY_URL / FRONTEND_TAG / BACKEND_TAG / APP_DOMAIN
#   DEPLOY_TARGET     'preview' | 'production'
#   NAMESPACE         nombre del namespace destino
#   DEPLOY_LABEL      slug para el subdominio preview (p.ej. pr-42)
#   KUBECONFIG        ruta del kubeconfig en el build host
#   FORCE_SECRETS     'true' para re-aplicar secrets (peligroso en prod)
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/root/tools/jdk21/bin:/usr/local/bin:$PATH"
export KUBECONFIG="${KUBECONFIG:-/root/.kube/config}"

REG="${REGISTRY_URL#*://}"
FE_IMG="${REG}/yambo-web-frontend:${FRONTEND_TAG}"
BE_IMG="${REG}/yambo-web-backend:${BACKEND_TAG}"

echo "── CI deploy @ $(hostname) ─────────────────────────────"
echo "  target:    ${DEPLOY_TARGET}"
echo "  namespace: ${NAMESPACE}"
echo "  domain:    ${APP_DOMAIN}"
echo "  kubeconfig:${KUBECONFIG}"
echo "  fe: ${FE_IMG}"
echo "  be: ${BE_IMG}"

kubectl config get-contexts >/dev/null 2>&1 || true
kubectl version --client -o yaml 2>/dev/null | grep gitVersion || true

if [ "${DEPLOY_TARGET}" = "production" ]; then
    OVERLAY="k8s/overlays/production"
    LABEL_DOMAIN="${APP_DOMAIN}"
else
    OVERLAY="k8s/overlays/preview"
    LABEL_DOMAIN="${DEPLOY_LABEL}.${APP_DOMAIN}"
fi

# ── Imágenes en el overlay ──────────────────────────────────
# REGISTRY_HOST (host[:port] del registry, SIN esquema) viene del entorno —
# el Jenkinsfile lo decide por target (credenciales/parametrizado).
REG_HOST="${REGISTRY_HOST:-192.168.1.21:5000}"
if [ -z "${REGISTRY_HOST:-}" ]; then
    echo "WARNING: REGISTRY_HOST no definido — usando default local"
fi
sed -i "s|newName: .*yambo-web-frontend|newName: ${REG_HOST}/yambo-web-frontend|; s|newTag: .*|newTag: ${FRONTEND_TAG}|" "${OVERLAY}/kustomization.yaml"
sed -i "s|newName: .*yambo-web-backend|newName: ${REG_HOST}/yambo-web-backend|; s|newTag: .*|newTag: ${BACKEND_TAG}|" "${OVERLAY}/kustomization.yaml"
echo "Overlay actualizado: $(grep newTag ${OVERLAY}/kustomization.yaml | tr '\n' ' ')"

# ── Namespace ───────────────────────────────────────────────
kubectl apply -f k8s/base/namespace.yaml

# ── Secrets: solo si no existen, o FORCE_SECRETS ────────────
if ! kubectl get secret yambo-secrets -n "${NAMESPACE}" >/dev/null 2>&1; then
    echo "Creando yambo-secrets en ${NAMESPACE} (desde el overlay)"
    kubectl kustomize "${OVERLAY}" | awk '
        BEGIN { doc = ""; is_secret = 0 }
        /^---/ {
            if (is_secret) { printf "%s", doc }
            doc = "---\n"; is_secret = 0; next
        }
        { doc = doc $0 "\n" }
        /^kind: Secret$/ { is_secret = 1 }
        END { if (is_secret) { printf "%s", doc } }
    ' | kubectl apply -f -
elif [ "${FORCE_SECRETS:-false}" = "true" ]; then
    echo "WARNING: re-aplicando secrets (FORCE_SECRETS=true)"
    kubectl kustomize "${OVERLAY}" | awk '
        BEGIN { doc = ""; is_secret = 0 }
        /^---/ {
            if (is_secret) { printf "%s", doc }
            doc = "---\n"; is_secret = 0; next
        }
        { doc = doc $0 "\n" }
        /^kind: Secret$/ { is_secret = 1 }
        END { if (is_secret) { printf "%s", doc } }
    ' | kubectl apply -f -
else
    echo "yambo-secrets ya existe — no se re-aplica (producción segura)"
fi

# ── Aplicar todo menos secrets ──────────────────────────────
kubectl kustomize "${OVERLAY}" | awk '
    BEGIN { doc = ""; is_secret = 0 }
    /^---/ {
        if (doc != "" && !is_secret) { printf "%s", doc }
        doc = "---\n"; is_secret = 0; next
    }
    { doc = doc $0 "\n" }
    /^kind: Secret$/ { is_secret = 1 }
    END { if (doc != "" && !is_secret) { printf "%s", doc } }
' | kubectl apply -f -

# ── Rollout status ──────────────────────────────────────────
kubectl rollout status deployment/postgres     -n "${NAMESPACE}" --timeout=180s || true
kubectl rollout status deployment/yambo-backend  -n "${NAMESPACE}" --timeout=300s
kubectl rollout status deployment/yambo-frontend -n "${NAMESPACE}" --timeout=300s

echo "── Deploy ${DEPLOY_TARGET} COMPLETO: https://${LABEL_DOMAIN} ──"
