pipeline {
    agent any

    environment {
        REGISTRY = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        KUBECONFIG = "/var/lib/jenkins/.kube/config"
        NAMESPACE = "yambo"
        FIXED_EMAIL = 'javiermateos149@gmail.com'
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
                    // Read frontend version from package.json
                    env.FRONTEND_TAG = sh(
                        script: "grep '\"version\"' frontend/package.json | head -1 | sed 's/.*\"version\": \"\\(.*\\)\".*/\\1/'",
                        returnStdout: true
                    ).trim()
                    
                    // Read backend version from pom.xml (get project version, not parent)
                    env.BACKEND_TAG = sh(
                        script: "grep '<artifactId>web</artifactId>' backend/pom.xml -A 1 | grep '<version>' | sed 's/.*<version>\\(.*\\)<\\/version>.*/\\1/'",
                        returnStdout: true
                    ).trim()

                    if (env.CHANGE_ID) {
                        echo "🔀 Pull Request #${env.CHANGE_ID} detected (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                        env.FRONTEND_TAG = "pr-${env.CHANGE_ID}"
                        env.BACKEND_TAG  = "pr-${env.CHANGE_ID}"
                        env.IS_PR = 'true'
                    } else {
                        echo "📌 Branch build: ${env.BRANCH_NAME}"
                        env.IS_PR = 'false'

                        def semverPattern = /^\d+\.\d+\.\d+([_-][a-zA-Z0-9]+)?$/
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

        stage('Check DB Migrations') {
            when {
                expression { env.IS_PR == 'true' }
            }
            steps {
                script {
                    def target = env.CHANGE_TARGET ?: 'develop'
                    sh """
                        git fetch origin ${target} --no-tags --depth=50
                        python3 scripts/check-migration-rollbacks.py origin/${target}
                    """
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
            post {
                always {
                    jacoco(
                        execPattern        : 'backend/target/jacoco.exec',
                        classPattern       : 'backend/target/classes',
                        sourcePattern      : 'backend/src/main/java',
                        reportTitle        : 'Backend Coverage',
                        changeBuildStatus  : false,
                        minimumLineCoverage: '0',
                        maximumLineCoverage: '100'
                    )
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

        stage('Deploy Preview Environment') {
            when {
                expression { env.IS_PR == 'true' }
            }
            steps {
                script {
                    def prId     = env.CHANGE_ID
                    def previewNs = "yambo-pr-${prId}"
                    def outDir   = "k8s/preview/rendered/${previewNs}"

                    sh "mkdir -p ${outDir}"

                    // Render templates by replacing all placeholders
                    def templates = [
                        'namespace.yaml',
                        'secrets.yaml',
                        'database-deployment.yaml',
                        'backend-deployment.yaml',
                        'frontend-deployment.yaml',
                        'ingress.yaml',
                        'seed-job.yaml'
                    ]
                    templates.each { tpl ->
                        sh """
                            sed \\
                                -e 's|__PR_ID__|${prId}|g' \\
                                -e 's|__PREVIEW_NS__|${previewNs}|g' \\
                                -e 's|__FRONTEND_IMAGE__|${FRONTEND_IMAGE}|g' \\
                                -e 's|__FRONTEND_TAG__|${env.FRONTEND_TAG}|g' \\
                                -e 's|__BACKEND_IMAGE__|${BACKEND_IMAGE}|g' \\
                                -e 's|__BACKEND_TAG__|${env.BACKEND_TAG}|g' \\
                                k8s/preview/${tpl}.tpl > ${outDir}/${tpl}
                        """
                    }

                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config
                        : "\${PROD_DB_HOST:?Set PROD_DB_HOST in the Jenkins job environment}"
                        : "\${PROD_DB_USER:?Set PROD_DB_USER in the Jenkins job environment}"
                        : "\${PROD_DB_PASS:?Set PROD_DB_PASS in the Jenkins job environment}"

                        kubectl apply -f ${outDir}/namespace.yaml --validate=false

                        if ! kubectl get secret yambo-secrets -n ${previewNs} >/dev/null 2>&1; then
                            kubectl apply -f ${outDir}/secrets.yaml
                        fi

                        kubectl apply -f ${outDir}/database-deployment.yaml
                        kubectl rollout status deployment/postgres -n ${previewNs} --timeout=120s

                        chmod +x scripts/anonymize-dump.sh

                        # Build a fresh anonymized bootstrap dump from production for this PR.
                        ANONYMIZE_DUMP_MODE=database-bootstrap \
                            ./scripts/anonymize-dump.sh ${outDir}/preview-seed.sql

                        # Preview DB restore ConfigMap — created/updated from the generated SQL file.
                        kubectl create configmap preview-seed-sql \
                            -n ${previewNs} \
                            --from-file=preview-seed.sql=${outDir}/preview-seed.sql \
                            --dry-run=client -o yaml | kubectl apply -f -

                        # Restore the preview DB before deploying the backend.
                        kubectl delete job preview-seed-${prId} -n ${previewNs} --ignore-not-found
                        kubectl wait --for=delete job/preview-seed-${prId} -n ${previewNs} --timeout=120s || true
                        kubectl apply -f ${outDir}/seed-job.yaml
                        kubectl wait --for=condition=complete job/preview-seed-${prId} -n ${previewNs} --timeout=600s

                        kubectl apply -f ${outDir}/backend-deployment.yaml
                        kubectl rollout status deployment/yambo-backend -n ${previewNs} --timeout=300s

                        kubectl apply -f ${outDir}/frontend-deployment.yaml
                        kubectl apply -f ${outDir}/ingress.yaml
                        kubectl rollout status deployment/yambo-frontend -n ${previewNs} --timeout=300s
                    """

                    env.PREVIEW_URL = "http://pr-${prId}.yambo.cabrasky.net"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                branch 'develop'
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
                    def previewMsg = env.PREVIEW_URL
                        ? "Preview environment is live at ${env.PREVIEW_URL}\nNamespace: yambo-pr-${env.CHANGE_ID}"
                        : ''
                    def prRecipients = [env.FIXED_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')
                    emailext(
                        to: prRecipients,
                        subject: "[yambo] ✅ PR #${env.CHANGE_ID} — build passed",
                        body: """PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET}) built successfully.

${previewMsg}

Job:    ${env.JOB_NAME} #${env.BUILD_NUMBER}
Branch: ${env.CHANGE_BRANCH}
URL:    ${env.BUILD_URL}"""
                    )
                } else if (env.CAN_DEPLOY == 'true') {
                    echo "🚀 Develop deployed successfully"
                    emailext(
                        to: env.FIXED_EMAIL,
                        subject: "[yambo] 🚀 develop deployed successfully",
                        body: """The develop branch was deployed to the yambo namespace.

Frontend: ${env.FRONTEND_IMAGE}:${env.FRONTEND_TAG}
Backend:  ${env.BACKEND_IMAGE}:${env.BACKEND_TAG}

Job: ${env.JOB_NAME} #${env.BUILD_NUMBER}
URL: ${env.BUILD_URL}"""
                    )
                } else {
                    echo "✅ Build successful (no deploy)"
                }
            }
        }
        failure {
            script {
                def context = env.IS_PR == 'true'
                    ? "PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                    : "branch ${env.BRANCH_NAME}"
                def failRecipients = [env.FIXED_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')
                emailext(
                    to: failRecipients,
                    subject: "[yambo] ❌ Build failed — ${context}",
                    body: """The pipeline failed for ${context}.

Job: ${env.JOB_NAME} #${env.BUILD_NUMBER}
URL: ${env.BUILD_URL}

Check the console output for details."""
                )
            }
            echo "❌ Pipeline failed"
        }
        cleanup {
            // Remove rendered preview manifests from workspace after every run
            sh 'rm -rf k8s/preview/rendered || true'
        }
    }
}
