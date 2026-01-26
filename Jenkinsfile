pipeline {
    agent any

    environment {
        REGISTRY = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        KUBECONFIG = "/var/lib/jenkins/.kube/config"
        NAMESPACE = "yambo"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Read Versions') {
            steps {
                script {
                    env.FRONTEND_TAG = readFile('frontend/VERSION').trim()
                    env.BACKEND_TAG = readFile('backend/VERSION').trim()
                    echo "Frontend version: ${env.FRONTEND_TAG}"
                    echo "Backend version: ${env.BACKEND_TAG}"
                    
                    // Validate version format (semver)
                    def semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/
                    if (!env.FRONTEND_TAG.matches(semverPattern)) {
                        error "Invalid frontend version format: ${env.FRONTEND_TAG}. Expected semver (e.g., 1.0.0)"
                    }
                    if (!env.BACKEND_TAG.matches(semverPattern)) {
                        error "Invalid backend version format: ${env.BACKEND_TAG}. Expected semver (e.g., 1.0.0)"
                    }
                }
            }
        }

        stage('Check Version Changes') {
            steps {
                script {
                    // Check if frontend image already exists in registry using REST API
                    def frontendHttpCode = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' http://${REGISTRY}/v2/yambo-web-frontend/manifests/${env.FRONTEND_TAG}",
                        returnStdout: true
                    ).trim()
                    def frontendExists = (frontendHttpCode == '200')
                    
                    // Check if backend image already exists in registry using REST API
                    def backendHttpCode = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' http://${REGISTRY}/v2/yambo-web-backend/manifests/${env.BACKEND_TAG}",
                        returnStdout: true
                    ).trim()
                    def backendExists = (backendHttpCode == '200')
                    
                    env.FRONTEND_CHANGED = frontendExists ? 'false' : 'true'
                    env.BACKEND_CHANGED = backendExists ? 'false' : 'true'
                    
                    echo "Frontend check: HTTP ${frontendHttpCode}"
                    echo "Backend check: HTTP ${backendHttpCode}"
                    
                    if (frontendExists) {
                        echo "⚠️  Frontend image ${env.FRONTEND_TAG} already exists in registry"
                    } else {
                        echo "✅ Frontend version ${env.FRONTEND_TAG} is new, will build"
                    }
                    
                    if (backendExists) {
                        echo "⚠️  Backend image ${env.BACKEND_TAG} already exists in registry"
                    } else {
                        echo "✅ Backend version ${env.BACKEND_TAG} is new, will build"
                    }
                    
                    if (frontendExists && backendExists) {
                        echo "ℹ️  Both versions already exist. Skipping build stages, proceeding to deploy."
                    }
                }
            }
        }

        stage('Frontend Tests') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' }
            }
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
            when {
                expression { env.BACKEND_CHANGED == 'true' }
            }
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
            when {
                expression { env.FRONTEND_CHANGED == 'true' }
            }
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Build Backend') {
            when {
                expression { env.BACKEND_CHANGED == 'true' }
            }
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
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            steps {
                script {
                    if (env.FRONTEND_CHANGED == 'true') {
                        sh "docker build -t ${FRONTEND_IMAGE}:${env.FRONTEND_TAG} frontend"
                    }
                    if (env.BACKEND_CHANGED == 'true') {
                        sh "docker build -t ${BACKEND_IMAGE}:${env.BACKEND_TAG} backend"
                    }
                }
            }
        }

        stage('Push Images') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            steps {
                script {
                    if (env.FRONTEND_CHANGED == 'true') {
                        sh "docker push ${FRONTEND_IMAGE}:${env.FRONTEND_TAG}"
                    }
                    if (env.BACKEND_CHANGED == 'true') {
                        sh "docker push ${BACKEND_IMAGE}:${env.BACKEND_TAG}"
                    }
                }
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
                    sed -i "s|image: ${FRONTEND_IMAGE}:.*|image: ${FRONTEND_IMAGE}:${FRONTEND_TAG}|g" k8s/frontend-deployment.yaml
                    sed -i "s|image: ${BACKEND_IMAGE}:.*|image: ${BACKEND_IMAGE}:${BACKEND_TAG}|g" k8s/backend-deployment.yaml

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
            echo "Deployment successful! Frontend: ${env.FRONTEND_TAG}, Backend: ${env.BACKEND_TAG}"
        }
        failure {
            echo "Deployment failed!"
        }
    }
}
