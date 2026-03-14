apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: yambo-preview-ingress
  namespace: __PREVIEW_NS__
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web
    traefik.ingress.kubernetes.io/custom-request-headers: "X-Forwarded-Proto: https"
    traefik.ingress.kubernetes.io/buffering-maxrequestbodybytes: "15728640"
spec:
  ingressClassName: traefik
  defaultBackend:
    service:
      name: yambo-frontend-service
      port:
        number: 80
  rules:
    - host: pr-__PR_ID__.yambo.cabrasky.net
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: yambo-backend-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: yambo-frontend-service
                port:
                  number: 80
