apiVersion: apps/v1
kind: Deployment
metadata:
  name: yambo-frontend
  namespace: __PREVIEW_NS__
  labels:
    app: yambo-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: yambo-frontend
  template:
    metadata:
      labels:
        app: yambo-frontend
    spec:
      containers:
        - name: frontend
          image: __FRONTEND_IMAGE__:__FRONTEND_TAG__
          env:
            - name: BACKEND_INTERNAL_URL
              value: "http://yambo-backend-service:8080/api"
            - name: FRONTEND_URL
              value: "https://__DEPLOY_LABEL__.__DOMAIN__"
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "128Mi"
              cpu: "75m"
            limits:
              memory: "256Mi"
              cpu: "250m"
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 10
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: yambo-frontend-service
  namespace: __PREVIEW_NS__
spec:
  selector:
    app: yambo-frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
