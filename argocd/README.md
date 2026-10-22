# Despliegue GitOps con Argo CD

Este directorio contiene las **Applications de Argo CD** que gestionan el
despliegue de yambo-web de forma declarativa (GitOps).

## Arquitectura

```
  Jenkins (CI)                     Argo CD (CD)
  ───────────                      ────────────
  build + test + sonar             vigila este repo (Git = fuente de verdad)
  docker build + push
  registry.cabrasky.net
  commit del tag recién     ─────► detecta el commit y sincroniza el
  construido en el overlay         estado al cluster con ese tag exacto
```

Jenkins **ya no hace `kubectl apply`**. Construye y publica las imágenes y,
en el stage `Update Image Tag (GitOps)`, escribe el tag que acaba de construir
en el `kustomization.yaml` del overlay (commit `[skip ci]` a la propia rama).
El despliegue lo realiza Argo CD a partir de ese commit.

## Applications

| App             | Rama    | Overlay                 | Cluster        | Namespace      | Sync    |
|-----------------|---------|-------------------------|----------------|----------------|---------|
| `yambo-develop` | develop | `k8s/overlays/develop`  | homelab (.22)  | yambo-develop  | auto    |
| `yambo-prod`    | main    | `k8s/overlays/hetzner`  | hetzner-prod   | yambo          | manual  |

- **develop**: sync automático + self-heal. Jenkins escribe el tag
  `branch-develop-<sha>` del build en `k8s/overlays/develop` (rama develop).
- **prod**: sync **manual** a propósito (revisar diff antes de aplicar).
  Jenkins escribe el tag de versión `X.Y.Z` en `k8s/overlays/hetzner` (rama main).

Solo se actualiza el tag de la imagen que se ha construido en ese build
(frontend y/o backend). La credencial `github` de Jenkins necesita permiso
de push sobre `develop` y `main`.

## Registro de imágenes

Todas las imágenes viven en `registry.cabrasky.net` (registro Docker en
unraid `.26:5000`, proxy TLS en `.21`). Argo CD Image Updater ya **no** se
usa para yambo: las Applications no llevan sus anotaciones.

## Aplicar las Applications

```bash
kubectl apply -f argocd/yambo-develop.yaml
kubectl apply -f argocd/yambo-prod.yaml
```

O añadirlas a un patrón app-of-apps si se centraliza la gestión.
