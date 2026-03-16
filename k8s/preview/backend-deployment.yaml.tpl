apiVersion: apps/v1
kind: Deployment
metadata:
  name: yambo-backend
  namespace: __PREVIEW_NS__
  labels:
    app: yambo-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: yambo-backend
  template:
    metadata:
      labels:
        app: yambo-backend
    spec:
      containers:
        - name: backend
          image: __BACKEND_IMAGE__:__BACKEND_TAG__
          ports:
            - containerPort: 8080
          env:
            # CORS — only the preview URL is allowed
            - name: CORS_ALLOWED_ORIGINS
              value: "http://pr-__PR_ID__.yambo.cabrasky.net,https://pr-__PR_ID__.yambo.cabrasky.net"
            # Database — service name stays "db" so app config needs no changes
            - name: SPRING_DATASOURCE_URL
              value: "jdbc:postgresql://db:5432/yambo_db"
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: DB_USER
            - name: DB_PASS
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: DB_PASS
            # JWT
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: JWT_SECRET
            # Mail — disabled in preview (secrets point to localhost)
            - name: MAIL_HOST
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: MAIL_HOST
            - name: MAIL_USERNAME
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: MAIL_USERNAME
            - name: MAIL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: MAIL_PASSWORD
            - name: MAIL_FROM
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: MAIL_FROM
            - name: UPLOAD_DIR
              value: "/data/uploads"
            - name: TZ
              value: "Europe/Madrid"
          volumeMounts:
            - name: uploads-storage
              mountPath: /data/uploads
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /api/health
              port: 8080
            initialDelaySeconds: 80
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health
              port: 8080
            initialDelaySeconds: 120
            periodSeconds: 15
      volumes:
        # emptyDir — uploads are ephemeral in preview envs (no shared PVC needed)
        - name: uploads-storage
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: yambo-backend-service
  namespace: __PREVIEW_NS__
spec:
  selector:
    app: yambo-backend
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
  type: ClusterIP
