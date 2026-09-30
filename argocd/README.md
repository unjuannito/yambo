# Despliegue GitOps con Argo CD

Este directorio contiene las **Applications de Argo CD** que gestionan el
despliegue de yambo-web de forma declarativa (GitOps).

## Arquitectura

```
  Jenkins (CI)                 Argo CD (CD)
  ───────────                  ────────────
  build + test + sonar         vigila este repo (Git = fuente de verdad)
  docker build + push   ─────► Image Updater detecta el tag nuevo en
  registry.cabrasky.net        registry.cabrasky.net y hace commit del tag
                               Argo CD sincroniza el estado al cluster
```

Jenkins **ya no hace `kubectl apply`**. Su única responsabilidad es construir
y publicar imágenes al registro. El despliegue lo realiza Argo CD.

## Applications

| App             | Rama    | Overlay                 | Cluster        | Namespace      | Sync    |
|-----------------|---------|-------------------------|----------------|----------------|---------|
| `yambo-develop` | develop | `k8s/overlays/develop`  | homelab (.22)  | yambo-develop  | auto    |
| `yambo-prod`    | main    | `k8s/overlays/hetzner`  | hetzner-prod   | yambo          | manual  |

- **develop**: sync automático + self-heal. Image Updater sigue los tags
  `branch-develop-*` y escribe el tag nuevo al repo (rama develop).
- **prod**: sync **manual** a propósito (revisar diff antes de aplicar).
  Image Updater sigue los tags semver `X.Y.Z` (rama main).

## Registro de imágenes

Todas las imágenes viven en `registry.cabrasky.net` (registro Docker en
unraid `.26:5000`, proxy TLS en `.21`). Argo CD Image Updater está instalado
en el namespace `argocd` del cluster homelab y vigila este registro.

## Aplicar las Applications

```bash
kubectl apply -f argocd/yambo-develop.yaml
kubectl apply -f argocd/yambo-prod.yaml
```

O añadirlas a un patrón app-of-apps si se centraliza la gestión.
