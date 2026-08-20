# Filtra documentos Secret del output de `kubectl kustomize` para que el
# pipeline aplique solo recursos no-secretos. El Secret real se crea aparte
# con `kubectl create secret generic` (valores desde credenciales/openssl).
#
# Uso: kubectl kustomize <overlay> | awk -f k8s/scripts/strip-secrets.awk | kubectl apply -f -
BEGIN { doc = ""; is_secret = 0 }
/^---/ {
    if (doc != "" && !is_secret) { printf "%s", doc }
    doc = "---\n"; is_secret = 0; next
}
{ doc = doc $0 "\n" }
/^kind: Secret$/ { is_secret = 1 }
END { if (doc != "" && !is_secret) { printf "%s", doc } }
