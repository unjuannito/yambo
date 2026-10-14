#!/usr/bin/env bash
# Limpieza del build host al final de cada build de Jenkins (post → always).
# Se ejecuta por ssh: `ssh build-host 'bash -s -- <imagen:tag>...' < este-script`.
#
# Qué se acumulaba sin límite:
#   - una imagen local de frontend y otra de backend por build (ya están en el registro)
#   - la caché de BuildKit (capas y cachés de npm/Maven de los Dockerfile)
#   - los volúmenes de caché de dependencias de CI
#   - directorios /tmp/yambo-ci-* de builds abortados antes del post
#
# Nunca hace fallar el build: cada paso tolera errores.
set -u

KEEP_HOURS="${KEEP_HOURS:-72}"       # antigüedad a partir de la cual se borra
M2_MAX_MB="${M2_MAX_MB:-3072}"       # tope de cada volumen de caché antes de vaciarlo
NPM_MAX_MB="${NPM_MAX_MB:-2048}"
SONAR_MAX_MB="${SONAR_MAX_MB:-2048}"

log() { echo "[limpieza] $*"; }
free_space() { df -h / | awk 'NR==2 {print $4 " libres de " $2}'; }

log "antes: $(free_space)"

# 1. Las imágenes de este build: ya se han subido al registro, aquí solo ocupan.
for image in "$@"; do
    [ -n "$image" ] && docker image rm "$image" >/dev/null 2>&1 && log "borrada $image"
done

# 2. Imágenes de la app de builds anteriores con más de KEEP_HOURS horas.
#    Las que use algún contenedor no se pueden borrar y se quedan.
limit=$(( $(date +%s) - KEEP_HOURS * 3600 ))
docker image ls --format '{{.Repository}}:{{.Tag}}|{{.CreatedAt}}' 2>/dev/null \
    | grep -E '/yambo-web-(frontend|backend):' \
    | while IFS='|' read -r image created; do
          created_at=$(date -d "${created% *}" +%s 2>/dev/null || echo 0)
          if [ "$created_at" -gt 0 ] && [ "$created_at" -lt "$limit" ]; then
              docker image rm "$image" >/dev/null 2>&1 && log "borrada $image"
          fi
      done
docker image prune -f >/dev/null 2>&1 || true   # capas huérfanas

# 3. Caché de BuildKit sin usar en KEEP_HOURS horas.
docker builder prune -f --filter "until=${KEEP_HOURS}h" >/dev/null 2>&1 || true

# 4. Volúmenes de caché de dependencias: si pasan de su tope se vacían y el
#    siguiente build los rellena. Si un build en curso los usa, no se tocan.
cap_volume() {
    local volume="$1" max_mb="$2" size_mb
    docker volume inspect "$volume" >/dev/null 2>&1 || return 0
    size_mb=$(docker run --rm -v "$volume":/cache alpine:3 du -sm /cache 2>/dev/null | cut -f1)
    if [ "${size_mb:-0}" -gt "$max_mb" ]; then
        docker volume rm "$volume" >/dev/null 2>&1 \
            && log "vaciado $volume (${size_mb} MB > ${max_mb} MB)" \
            || log "$volume ocupa ${size_mb} MB pero está en uso; se reintentará"
    fi
}
cap_volume yambo-ci-m2 "$M2_MAX_MB"
cap_volume yambo-ci-npm "$NPM_MAX_MB"
cap_volume yambo-ci-sonar "$SONAR_MAX_MB"
cap_volume yambo-ci-sonar-cli "$SONAR_MAX_MB"

# 5. Directorios de build que quedaron de builds abortados (más de un día).
find /tmp -maxdepth 1 -name 'yambo-ci-*' -mmin +1440 2>/dev/null | while read -r dir; do
    rm -rf "$dir" 2>/dev/null \
        || docker run --rm -v /tmp:/host-tmp alpine:3 rm -rf "/host-tmp/$(basename "$dir")"
    log "borrado $dir"
done

log "después: $(free_space)"
exit 0
