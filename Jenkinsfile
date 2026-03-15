pipeline {
    agent any

    environment {
        REGISTRY       = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        KUBECONFIG     = "/var/lib/jenkins/.kube/config"
        NAMESPACE      = "yambo"
        FIXED_EMAIL    = 'javiermateos149@gmail.com'
    }

    stages {

        // ─────────────────────────────────────────────────────────────────────
        // Phase 1 — Setup
        // ─────────────────────────────────────────────────────────────────────

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Read Versions') {
            steps {
                script {
                    env.FRONTEND_TAG = sh(
                        script: "grep '\"version\"' frontend/package.json | head -1 | sed 's/.*\"version\": \"\\(.*\\)\".*/\\1/'",
                        returnStdout: true
                    ).trim()

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

        // ─────────────────────────────────────────────────────────────────────
        // Phase 2 — Quality Gates (parallel)
        // ─────────────────────────────────────────────────────────────────────

        stage('Quality Gates') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            parallel {
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
                            recordCoverage tools: [[
                                parser : 'JACOCO',
                                pattern: 'backend/target/jacoco-report/jacoco.xml'
                            ]]
                        }
                    }
                }
                stage('Frontend Typecheck') {
                    when {
                        expression { env.FRONTEND_CHANGED == 'true' }
                    }
                    steps {
                        dir('frontend') {
                            sh '''
                                npm install
                                npm run typecheck
                            '''
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 3 — Build Artifacts (parallel)
        // ─────────────────────────────────────────────────────────────────────

        stage('Build Artifacts') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            parallel {
                stage('Build Frontend') {
                    when {
                        expression { env.FRONTEND_CHANGED == 'true' }
                    }
                    steps {
                        dir('frontend') {
                            sh '''
                                npm install
                                npm run build
                            '''
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
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 4 — Docker
        // ─────────────────────────────────────────────────────────────────────

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

        // ─────────────────────────────────────────────────────────────────────
        // Phase 5a — Deploy Preview Environment (PRs only)
        // ─────────────────────────────────────────────────────────────────────

        stage('Deploy Preview Environment') {
            when {
                expression { env.IS_PR == 'true' }
            }
            steps {
                script {
                    def prId      = env.CHANGE_ID
                    def previewNs = "yambo-pr-${prId}"
                    def outDir    = "k8s/preview/rendered/${previewNs}"

                    sh "mkdir -p ${outDir}"

                    // ── Render K8s templates ────────────────────────────────
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

                    // ── Apply base resources ────────────────────────────────
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config

                        kubectl apply -f ${outDir}/namespace.yaml --validate=false

                        if ! kubectl get secret yambo-secrets -n ${previewNs} >/dev/null 2>&1; then
                            kubectl apply -f ${outDir}/secrets.yaml
                        fi

                        kubectl apply -f ${outDir}/database-deployment.yaml
                        kubectl rollout status deployment/postgres -n ${previewNs} --timeout=120s
                    """

                    // ── Generate anonymized DB dump ─────────────────────────
                    // Run anonymize-dump.sh inside the preview postgres pod.
                    // The pod already has a running PG server (for temp DB
                    // operations) and can reach the prod DB via K8s internal
                    // DNS — no port-forward or Docker needed.
                    def dbUser = sh(
                        script: "kubectl get secret yambo-secrets -n ${NAMESPACE} -o jsonpath='{.data.DB_USER}' | base64 -d",
                        returnStdout: true
                    ).trim()

                    def dbPass = sh(
                        script: "kubectl get secret yambo-secrets -n ${NAMESPACE} -o jsonpath='{.data.DB_PASS}' | base64 -d",
                        returnStdout: true
                    ).trim()

                    def podName = sh(
                        script: "kubectl get pod -n ${previewNs} -l app=postgres -o jsonpath='{.items[0].metadata.name}'",
                        returnStdout: true
                    ).trim()

                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config
                        chmod +x scripts/anonymize-dump.sh
                        mkdir -p ${outDir}

                        kubectl cp scripts/anonymize-dump.sh ${previewNs}/${podName}:/tmp/anonymize-dump.sh

                        kubectl exec ${podName} -n ${previewNs} -- sh -c '
                            apk add --no-cache bash >/dev/null 2>&1
                        '

                        kubectl exec ${podName} -n ${previewNs} -- env \
                            PROD_DB_HOST=db.${NAMESPACE}.svc.cluster.local \
                            PROD_DB_PORT=5432 \
                            PROD_DB_USER='${dbUser}' \
                            PROD_DB_PASS='${dbPass}' \
                            PGHOST=/var/run/postgresql \
                            PGUSER='${dbUser}' \
                            ANONYMIZE_DUMP_MODE=database-bootstrap \
                            bash /tmp/anonymize-dump.sh /tmp/preview-seed.sql

                        kubectl exec ${podName} -n ${previewNs} -- chmod 644 /tmp/preview-seed.sql
                        kubectl cp ${previewNs}/${podName}:/tmp/preview-seed.sql ${outDir}/preview-seed.sql
                    """

                    // ── Seed the preview database ───────────────────────────
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config

                        kubectl delete configmap preview-seed-sql -n ${previewNs} --ignore-not-found
                        kubectl create configmap preview-seed-sql \
                            -n ${previewNs} \
                            --from-file=preview-seed.sql=${outDir}/preview-seed.sql

                        kubectl delete job preview-seed-${prId} -n ${previewNs} --ignore-not-found
                        kubectl wait --for=delete job/preview-seed-${prId} -n ${previewNs} --timeout=120s || true
                        kubectl apply -f ${outDir}/seed-job.yaml
                        kubectl wait --for=condition=complete job/preview-seed-${prId} -n ${previewNs} --timeout=600s
                    """

                    // ── Deploy application ──────────────────────────────────
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config

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

        // ─────────────────────────────────────────────────────────────────────
        // Phase 5b — Deploy to Production (develop only)
        // ─────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // Post-build
    // ─────────────────────────────────────────────────────────────────────────

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
            sh 'rm -rf k8s/preview/rendered || true'
        }
    }
}
