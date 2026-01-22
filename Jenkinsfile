pipeline {
    agent any

    environment {
        REGISTRY = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        TAG = "${BUILD_NUMBER}"
        KUBECONFIG = "/var/jenkins-home/.kube/config"
        NAMESPACE = "yambo"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Frontend Tests') {
            steps {
                dir('frontend') {
                    sh '''
                        npm install
                        #npm run test || true
                    '''
                }
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh '''
                        chmod +x mvnw
                        ./mvnw test
                    '''
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Build Backend') {
            steps {
                dir('backend') {
                    sh '''
                        chmod +x mvnw
                        ./mvnw package -DskipTests
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t $FRONTEND_IMAGE:$TAG frontend
                    docker build -t $BACKEND_IMAGE:$TAG backend
                '''
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                    docker push $FRONTEND_IMAGE:$TAG
                    docker push $BACKEND_IMAGE:$TAG
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    export KUBECONFIG=/var/lib/jenkins/.kube/config

                    # Create namespace if it doesn't exist
                    kubectl apply -f k8s/namespace.yaml --validate=false

                    # Apply secrets only if they don't exist
                    if ! kubectl get secret yambo-secrets -n $NAMESPACE > /dev/null 2>&1; then
                        echo "Creating secrets..."
                        kubectl apply -f k8s/secrets.yaml
                    else
                        echo "Secrets already exist, skipping..."
                    fi

                    # Deploy database
                    kubectl apply -f k8s/database-deployment.yaml

                    # Wait for database to be ready
                    kubectl rollout status deployment/postgres -n $NAMESPACE --timeout=120s

                    # Update image tags in deployments
                    sed -i "s|image: ${FRONTEND_IMAGE}:.*|image: ${FRONTEND_IMAGE}:${TAG}|g" k8s/frontend-deployment.yaml
                    sed -i "s|image: ${BACKEND_IMAGE}:.*|image: ${BACKEND_IMAGE}:${TAG}|g" k8s/backend-deployment.yaml

                    # Apply deployments
                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/ingress.yaml

                    # Wait for rollout
                    kubectl rollout status deployment/yambo-frontend -n $NAMESPACE --timeout=120s
                    kubectl rollout status deployment/yambo-backend -n $NAMESPACE --timeout=120s
                '''
            }
        }
    }

    post {
        success {
            echo "Deployment successful! Version: ${TAG}"
        }
        failure {
            echo "Deployment failed!"
        }
    }
}
