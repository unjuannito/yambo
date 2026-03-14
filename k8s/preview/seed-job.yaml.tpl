apiVersion: batch/v1
kind: Job
metadata:
  name: preview-seed-__PR_ID__
  namespace: __PREVIEW_NS__
  labels:
    yambo/preview: "true"
    yambo/pr-id: "__PR_ID__"
spec:
  # Auto-delete 2 hours after the job finishes (success or failure)
  ttlSecondsAfterFinished: 7200
  # Retry up to 3 times in case Postgres is not fully ready yet
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      initContainers:
        # Wait until Postgres accepts connections before restoring the dump
        - name: wait-for-postgres
          image: postgres:15-alpine
          env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: DB_PASS
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: DB_USER
          command:
            - sh
            - -c
            - |
              echo "Waiting for Postgres to be ready..."
              until pg_isready -h db -U "$PGUSER" -d yambo_db; do
                echo "  postgres not ready yet, retrying in 10s..."
                sleep 10
              done
              echo "Postgres is ready."
      containers:
        - name: seed-loader
          image: postgres:15-alpine
          env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: DB_PASS
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: yambo-secrets
                  key: DB_USER
          command:
            - sh
            - -c
            - |
              echo "Restoring preview database dump..."
              psql -h db -U "$PGUSER" -d yambo_db -v ON_ERROR_STOP=1 -f /seed/preview-seed.sql
              echo "Preview database restored."
          volumeMounts:
            - name: seed-sql
              mountPath: /seed
              readOnly: true
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
      volumes:
        - name: seed-sql
          configMap:
            name: preview-seed-sql
