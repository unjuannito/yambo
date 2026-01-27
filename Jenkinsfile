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
                    env.BACKEND_TAG  = readFile('backend/VERSION').trim()

                    if (env.CHANGE_ID) {
                        echo "🔀 Pull Request #${env.CHANGE_ID} detected (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                        env.FRONTEND_TAG = "pr-${env.CHANGE_ID}"
                        env.BACKEND_TAG  = "pr-${env.CHANGE_ID}"
                        env.IS_PR = 'true'
                    } else {
                        echo "📌 Branch build: ${env.BRANCH_NAME}"
                        env.IS_PR = 'false'

                        def semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/
                        if (!env.FRONTEND_TAG.matches(semverPattern)) {
                            error "Invalid frontend version format: ${env.FRONTEND_TAG}"
                        }
                        if (!env.BACKEND_TAG.matches(semverPattern)) {
                            error "Invalid backend version format: ${env.BACKEND_TAG}"
                        }
                    }

                    // ✅ DEPLOY ONLY FROM DEVELOP
                    if (!env.CHANGE_ID && env.BRANCH_NAME == 'develop') {
                        env.CAN_DEPLOY = 'true'
                        echo "🚀 Deploy enabled (develop branch)"
                    } else {
                        env.CAN_DEPLOY = 'false'
                        echo "🧱 Deploy disabled (build-only)"
                    }

                    echo "Frontend tag: ${env.FRONTEND_TAG}"
                    echo "Backend tag: ${env.BACKEND_TAG}"
                }
            }
        }

        stage('Check Version Changes') {
            when {
                expression { env.IS_PR == 'false' }
            }
            steps {
                script {
                    def frontendCode = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' http://${REGISTRY}/v2/yambo-web-frontend/manifests/${env.FRONTEND_TAG}",
                        returnStdout: true
                    ).trim()

                    def backendCode = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' http://${REGISTRY}/v2/yambo-web-backend/manifests/${env.BACKEND_TAG}",
                        returnStdout: true
                    ).trim()

                    env.FRONTEND_CHANGED = (frontendCode == '200') ? 'false' : 'true'
                    env.BACKEND_CHANGED  = (backendCode == '200')  ? 'false' : 'true'

                    echo "Frontend registry check: HTTP ${frontendCode}"
                    echo "Backend registry check: HTTP ${backendCode}"

                    if (frontendCode == '200') {
                        echo "⚠️ Frontend image already exists"
                    }
                    if (backendCode == '200') {
                        echo "⚠️ Backend image already exists"
                    }
                }
            }
        }

        stage('PR Build Setup') {
            when {
                expression { env.IS_PR == 'true' }
            }
            steps {
                script {
                    env.FRONTEND_CHANGED = 'true'
                    env.BACKEND_CHANGED  = 'true'
                    echo "🔨 PR build: forcing full build"
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
                        # npm test
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
            when {
                expression { env.CAN_DEPLOY == 'true' }
            }
            steps {
                sh '''
                    export KUBECONFIG=/var/lib/jenkins/.kube/config

                    kubectl apply -f k8s/namespace.yaml --validate=false

                    if ! kubectl get secret yambo-secrets -n $NAMESPACE >/dev/null 2>&1; then
                        kubectl apply -f k8s/secrets.yaml
                    fi

                    kubectl apply -f k8s/database-deployment.yaml
                    kubectl rollout status deployment/postgres -n $NAMESPACE --timeout=120s

                    sed -i "s|image: .*yambo-web-frontend:.*|image: ${FRONTEND_IMAGE}:${FRONTEND_TAG}|g" k8s/frontend-deployment.yaml
                    sed -i "s|image: .*yambo-web-backend:.*|image: ${BACKEND_IMAGE}:${BACKEND_TAG}|g" k8s/backend-deployment.yaml

                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/ingress.yaml

                    kubectl rollout status deployment/yambo-frontend -n $NAMESPACE --timeout=300s
                    kubectl rollout status deployment/yambo-backend -n $NAMESPACE --timeout=300s
                '''
            }
        }
    }

    post {
        success {
            script {
                if (env.IS_PR == 'true') {
                    echo "✅ PR #${env.CHANGE_ID} build successful"
                } else if (env.CAN_DEPLOY == 'true') {
                    echo "🚀 Develop deployed successfully"
                } else {
                    echo "✅ Build successful (no deploy)"
                }
            }
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}
