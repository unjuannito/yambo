#!/usr/bin/env bash
# ============================================================================
# heal-apiservices.sh — repara el descubrimiento de API del cluster
# ============================================================================
# Sintoma que arregla (visto en Deploy Develop/Prod):
#   E... memcache.go: "couldn't get current server API group list:
#                      the server could not find the requested resource"
#   error: unable to recognize "STDIN": the server could not find the requested resource
#
# Causa: un APIService AGREGADO (p.ej. v1beta1.metrics.k8s.io) cuyo pod/servicio
# de respaldo ya no existe queda registrado con Available=False. Cuando kube-apiserver
# no puede contactarlo, el documento de discovery/OpenAPI completo falla y CUALQUIER
# `kubectl apply` muere, sin importar los manifests.
#
# Este script localiza y elimina esos APIServices rotos usando la API "raw"
# (--raw), que NO depende del discovery — por eso funciona incluso cuando el
# discovery ya esta roto. Los APIServices locales/integrados (v1, apps/v1, ...)
# SIEMPRE reportan Available=True y por tanto NUNCA se tocan.
#
# Es idempotente y best-effort: si no hay nada roto, no hace nada; si algo falla,
# sale 0 para no romper el despliegue.
#
# Uso:  KUBECONFIG=~/.kube/config bash k8s/scripts/heal-apiservices.sh
# ============================================================================
set -u

RAW="/apis/apiregistration.k8s.io/v1/apiservices"

json="$(kubectl get --raw "$RAW" 2>/dev/null)" || {
  echo "[heal] no se pudo listar apiservices vía raw API; se omite el saneado"
  exit 0
}

# Extrae los nombres de APIServices con Available!=True (solo los agregados rotos).
parse() {
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$json" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
for i in d.get("items", []):
    name  = i.get("metadata", {}).get("name", "")
    conds = i.get("status", {}).get("conditions", [])
    if name and any(c.get("type") == "Available" and c.get("status") != "True" for c in conds):
        print(name)
'
  elif command -v jq >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r '.items[]
      | select(any(.status.conditions[]?; .type=="Available" and .status!="True"))
      | .metadata.name'
  else
    echo "[heal] ni python3 ni jq disponibles para parsear; se omite" >&2
    return 0
  fi
}

broken="$(parse)"

if [ -z "${broken// /}" ]; then
  echo "[heal] todos los APIServices están Available=True; nada que hacer"
  exit 0
fi

for svc in $broken; do
  echo "[heal] eliminando APIService agregado roto: $svc"
  if kubectl delete --raw "$RAW/$svc" >/dev/null 2>&1; then
    echo "[heal]   -> eliminado $svc"
  else
    echo "[heal]   -> no se pudo eliminar $svc (se continúa)"
  fi
done

# Deja un instante a que el discovery se recomponga antes del apply.
sleep 2
echo "[heal] saneado completado"
exit 0
