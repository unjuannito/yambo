apiVersion: v1
kind: Secret
metadata:
  name: yambo-secrets
  namespace: __PREVIEW_NS__
type: Opaque
stringData:
  # Database credentials (unique per preview so isolated DB isn't shared)
  DB_USER: "yambo_user"
  DB_PASS: "CHANGE_ME"
  # JWT secret
  JWT_SECRET: "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
  # Mail — disabled in preview environments
  MAIL_HOST: "localhost"
  MAIL_USERNAME: "preview"
  MAIL_PASSWORD: "preview"
  MAIL_FROM: "noreply@preview.invalid"
