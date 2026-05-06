pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'FORCE_PREVIEW_DEPLOY',
            defaultValue: false,
            description: 'Deploy this branch as a preview environment (skips the develop-only production deploy guard).'
        )
        string(
            name: 'DEPLOY_ID',
            defaultValue: '',
            description: 'Custom namespace/URL slug for the preview (e.g. "my-feature"). Auto-derived from the branch name if left blank.'
        )
        booleanParam(
            name: 'FORCE_DB_SEED',
            defaultValue: false,
            description: 'Force re-seed of the preview database even if the environment already exists. Use when you need a fresh dataset.'
        )
        booleanParam(
            name: 'FORCE_PROD_DEPLOY',
            defaultValue: false,
            description: 'Force a full rebuild and redeploy to production (develop branch) even if the image version already exists in the registry.'
        )
    }

    environment {
        REGISTRY       = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        KUBECONFIG     = "/var/lib/jenkins/.kube/config"
        NAMESPACE      = "yambo"
        FIXED_EMAIL    = 'javiermateos149@gmail.com'
        APP_DOMAIN     = "yambo.cabrasky.net"
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
                        script: "cd backend && ./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout",
                        returnStdout: true
                    ).trim()

                    if (env.CHANGE_ID) {
                        echo "🔀 Pull Request #${env.CHANGE_ID} detected (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                        env.FRONTEND_TAG = "pr-${env.CHANGE_ID}"
                        env.BACKEND_TAG  = "pr-${env.CHANGE_ID}"
                        env.IS_PR = 'true'
                        env.IS_CUSTOM_DEPLOY = 'false'
                    } else if (params.FORCE_PREVIEW_DEPLOY) {
                        echo "🚀 Custom preview deploy requested for branch: ${env.BRANCH_NAME}"
                        // Derive a k8s-safe slug from branch name or use the supplied DEPLOY_ID
                        def slug = params.DEPLOY_ID?.trim()
                            ? params.DEPLOY_ID.trim()
                            : env.BRANCH_NAME
                                .toLowerCase()
                                .replaceAll('[^a-z0-9]+', '-')
                                .replaceAll('^-+|-+$', '')
                                .take(30)
                        env.EFFECTIVE_ID     = slug
                        env.FRONTEND_TAG     = "branch-${slug}"
                        env.BACKEND_TAG      = "branch-${slug}"
                        env.IS_PR            = 'false'
                        env.IS_CUSTOM_DEPLOY = 'true'
                        echo "Effective deploy ID: ${slug}"
                    } else {
                        echo "📌 Branch build: ${env.BRANCH_NAME}"
                        env.IS_PR = 'false'
                        env.IS_CUSTOM_DEPLOY = 'false'

                        def semverPattern = /^\d+\.\d+\.\d+([_-][a-zA-Z0-9]+)?$/
                        if (!env.FRONTEND_TAG.matches(semverPattern)) {
                            error "Invalid frontend version format: ${env.FRONTEND_TAG}"
                        }
                        if (!env.BACKEND_TAG.matches(semverPattern)) {
                            error "Invalid backend version format: ${env.BACKEND_TAG}"
                        }
                    }

                    if (!env.CHANGE_ID && env.BRANCH_NAME == 'develop' && env.IS_CUSTOM_DEPLOY != 'true') {
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
                expression { env.IS_PR == 'false' && env.IS_CUSTOM_DEPLOY == 'false' }
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

        stage('Forced Build Setup') {
            when {
                expression { env.IS_PR == 'true' || env.IS_CUSTOM_DEPLOY == 'true' || (params.FORCE_PROD_DEPLOY && env.CAN_DEPLOY == 'true') }
            }
            steps {
                script {
                    env.FRONTEND_CHANGED = 'true'
                    env.BACKEND_CHANGED  = 'true'
                    if (env.IS_PR == 'true') {
                        echo "🔨 PR build: forcing full build"
                    } else if (env.IS_CUSTOM_DEPLOY == 'true') {
                        echo "🔨 Custom preview deploy: forcing full build"
                    } else {
                        echo "🔨 FORCE_PROD_DEPLOY: forcing full rebuild and production deploy"
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 2 — Test + Build (single invocation per stack, parallel)
        // ─────────────────────────────────────────────────────────────────────

        stage('Test & Build') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            parallel {
                stage('Backend Test & Package') {
                    when {
                        expression { env.BACKEND_CHANGED == 'true' }
                    }
                    steps {
                        dir('backend') {
                            sh '''
                                chmod +x mvnw
                                ./mvnw verify -T 1C -B
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
                stage('Frontend Typecheck & Build') {
                    when {
                        expression { env.FRONTEND_CHANGED == 'true' }
                    }
                    steps {
                        dir('frontend') {
                            sh '''
                                npm install
                                npm run typecheck
                                npm run build
                            '''
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 2b — API Contract Check
        // ─────────────────────────────────────────────────────────────────────

        stage('API Contract Check') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            steps {
                sh 'node scripts/check-api-mapping.js --output-dir=api-check'
            }
            post {
                always {
                    publishHTML(target: [
                        allowMissing      : true,
                        alwaysLinkToLastBuild: true,
                        keepAll           : true,
                        reportDir         : 'api-check',
                        reportFiles       : 'api-mapping-report.html',
                        reportName        : 'API Mapping Report',
                    ])
                    archiveArtifacts artifacts: 'api-check/api-mapping-issues.json', allowEmptyArchive: true
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 3 — SonarQube Analysis + Quality Gate
        // ─────────────────────────────────────────────────────────────────────

        stage('SonarQube Analysis') {
            when {
                expression { env.BACKEND_CHANGED == 'true' || env.FRONTEND_CHANGED == 'true' }
            }
            parallel {
                stage('Backend Analysis') {
                    when {
                        expression { env.BACKEND_CHANGED == 'true' }
                    }
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            dir('backend') {
                                script {
                                    def branchArgs = env.IS_PR == 'true'
                                        ? "-Dsonar.pullrequest.key=${env.CHANGE_ID} -Dsonar.pullrequest.branch=${env.CHANGE_BRANCH} -Dsonar.pullrequest.base=${env.CHANGE_TARGET}"
                                        : (env.BRANCH_NAME == 'develop' ? '' : "-Dsonar.branch.name=${env.BRANCH_NAME}")
                                    sh "./mvnw sonar:sonar -Dsonar.projectKey=yambo-backend -Dsonar.projectName=yambo-backend -Dsonar.coverage.jacoco.xmlReportPaths=target/jacoco-report/jacoco.xml ${branchArgs}"
                                }
                            }
                        }
                    }
                }
                stage('Frontend Analysis') {
                    when {
                        expression { env.FRONTEND_CHANGED == 'true' }
                    }
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            dir('frontend') {
                                sh 'npm install && npm run test:coverage'
                                script {
                                    def branchArgs = env.IS_PR == 'true'
                                        ? "--define sonar.pullrequest.key=${env.CHANGE_ID} --define sonar.pullrequest.branch=${env.CHANGE_BRANCH} --define sonar.pullrequest.base=${env.CHANGE_TARGET}"
                                        : (env.BRANCH_NAME == 'develop' ? '' : "--define sonar.branch.name=${env.BRANCH_NAME}")
                                    sh "npx sonar-scanner --define sonar.externalIssuesReportPaths=../api-check/api-mapping-issues.json ${branchArgs}"
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            when {
                expression { env.BACKEND_CHANGED == 'true' || env.FRONTEND_CHANGED == 'true' }
            }
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 4 — Docker Build & Push (parallel)
        // ─────────────────────────────────────────────────────────────────────

        stage('Docker Build & Push') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            parallel {
                stage('Frontend Image') {
                    when {
                        expression { env.FRONTEND_CHANGED == 'true' }
                    }
                    steps {
                        sh "docker build -t ${FRONTEND_IMAGE}:${env.FRONTEND_TAG} frontend"
                        sh "docker push ${FRONTEND_IMAGE}:${env.FRONTEND_TAG}"
                    }
                }
                stage('Backend Image') {
                    when {
                        expression { env.BACKEND_CHANGED == 'true' }
                    }
                    steps {
                        sh "docker build -t ${BACKEND_IMAGE}:${env.BACKEND_TAG} backend"
                        sh "docker push ${BACKEND_IMAGE}:${env.BACKEND_TAG}"
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 4a — Deploy Preview Environment (PRs only)
        // ─────────────────────────────────────────────────────────────────────

        stage('Deploy Preview Environment') {
            when {
                expression { env.IS_PR == 'true' || env.IS_CUSTOM_DEPLOY == 'true' }
            }
            steps {
                script {
                    // ── Resolve deploy coordinates ──────────────────────────
                    def deployId, previewNs, deployLabel
                    if (env.IS_PR == 'true') {
                        deployId    = env.CHANGE_ID
                        previewNs   = "yambo-pr-${deployId}"
                        deployLabel = "pr-${deployId}"
                    } else {
                        deployId    = env.EFFECTIVE_ID
                        previewNs   = "yambo-branch-${deployId}"
                        deployLabel = "branch-${deployId}"
                    }

                    def outDir = "k8s/preview/rendered/${previewNs}"

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
                                -e 's|__PR_ID__|${deployId}|g' \\
                                -e 's|__PREVIEW_NS__|${previewNs}|g' \\
                                -e 's|__DEPLOY_LABEL__|${deployLabel}|g' \\
                                -e 's|__DOMAIN__|${APP_DOMAIN}|g' \\
                                -e 's|__FRONTEND_IMAGE__|${FRONTEND_IMAGE}|g' \\
                                -e 's|__FRONTEND_TAG__|${env.FRONTEND_TAG}|g' \\
                                -e 's|__BACKEND_IMAGE__|${BACKEND_IMAGE}|g' \\
                                -e 's|__BACKEND_TAG__|${env.BACKEND_TAG}|g' \\
                                k8s/preview/${tpl}.tpl > ${outDir}/${tpl}
                        """
                    }

                    // ── Check if environment already exists ────────────────
                    def nsAlreadyExists = sh(
                        script: "kubectl get namespace ${previewNs} --ignore-not-found --no-headers 2>/dev/null | wc -l",
                        returnStdout: true
                    ).trim() != "0"
                    def needsSeed = !nsAlreadyExists || params.FORCE_DB_SEED
                    env.DB_SEEDED = needsSeed ? 'true' : 'false'

                    if (needsSeed) {
                        echo "DB seed: will run (namespace exists: ${nsAlreadyExists}, FORCE_DB_SEED: ${params.FORCE_DB_SEED})"
                    } else {
                        echo "DB seed: skipping — namespace ${previewNs} already exists. Use FORCE_DB_SEED=true to override."
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
                    if (needsSeed) {
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

                        kubectl delete job preview-seed-${deployId} -n ${previewNs} --ignore-not-found
                        kubectl wait --for=delete job/preview-seed-${deployId} -n ${previewNs} --timeout=120s || true
                        kubectl apply -f ${outDir}/seed-job.yaml
                        kubectl wait --for=condition=complete job/preview-seed-${deployId} -n ${previewNs} --timeout=600s
                    """
                    } // end if (needsSeed)

                    // ── Deploy application (parallel rollout) ───────────────
                    sh """
                        export KUBECONFIG=/var/lib/jenkins/.kube/config

                        kubectl apply -f ${outDir}/backend-deployment.yaml
                        kubectl apply -f ${outDir}/frontend-deployment.yaml
                        kubectl apply -f ${outDir}/ingress.yaml

                        kubectl rollout status deployment/yambo-backend -n ${previewNs} --timeout=300s &
                        kubectl rollout status deployment/yambo-frontend -n ${previewNs} --timeout=300s &
                        wait
                    """

                    env.PREVIEW_URL = "https://${deployLabel}.${APP_DOMAIN}"
                    env.PREVIEW_NS  = previewNs
                    currentBuild.description = "<a href='${env.PREVIEW_URL}'>Preview: ${deployLabel}.${APP_DOMAIN}</a>"
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 4b — Deploy to Production (develop only)
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
                    sed -i "s|__DOMAIN__|${APP_DOMAIN}|g" k8s/frontend-deployment.yaml k8s/backend-deployment.yaml k8s/ingress.yaml

                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/ingress.yaml
                    kubectl apply -f k8s/backend-pdb.yaml
                    kubectl apply -f k8s/frontend-pdb.yaml

                    kubectl rollout status deployment/yambo-frontend -n $NAMESPACE --timeout=300s &
                    kubectl rollout status deployment/yambo-backend -n $NAMESPACE --timeout=300s &
                    wait
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
                    if (env.PREVIEW_URL) {
                        echo "🌐 Preview: ${env.PREVIEW_URL}"
                    }
                    def seedBadge = env.DB_SEEDED == 'true'
                        ? '<span style="background:#2ea44f;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">&#127807; DB seeded fresh</span>'
                        : '<span style="background:#6a737d;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">&#9193; DB seed skipped</span>'
                    def previewBtn = env.PREVIEW_URL
                        ? """<p><a href='${env.PREVIEW_URL}' style='display:inline-block;background:#2ea44f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open preview &rarr;</a></p>"""
                        : ''
                    def prRecipients = [env.FIXED_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')
                    try {
                        emailext(
                            to: prRecipients,
                            mimeType: 'text/html',
                            subject: "[yambo] ✅ PR #${env.CHANGE_ID} — build passed",
                            body: """
<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#2ea44f;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>&#9989; PR #${env.CHANGE_ID} — build passed</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><strong>${env.CHANGE_BRANCH}</strong> &rarr; <strong>${env.CHANGE_TARGET}</strong></p>
    ${previewBtn}
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Namespace</td><td style='padding:4px 8px'>${env.PREVIEW_NS ?: '-'}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>DB seed</td><td style='padding:4px 8px'>${seedBadge}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
    </table>
  </div>
</div>"""
                        )
                    } catch (e) {
                        echo "⚠️ Email notification failed: ${e.message}"
                    }
                } else if (env.IS_CUSTOM_DEPLOY == 'true') {
                    echo "✅ Custom preview deploy successful: ${env.PREVIEW_URL}"
                    def seedBadgeB = env.DB_SEEDED == 'true'
                        ? '<span style="background:#2ea44f;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">&#127807; DB seeded fresh</span>'
                        : '<span style="background:#6a737d;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">&#9193; DB seed skipped</span>'
                    try {
                        emailext(
                            to: env.FIXED_EMAIL,
                            mimeType: 'text/html',
                            subject: "[yambo] ✅ Preview deployed — branch ${env.BRANCH_NAME}",
                            body: """
<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#2ea44f;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>&#9989; Preview deployed — ${env.BRANCH_NAME}</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><a href='${env.PREVIEW_URL}' style='display:inline-block;background:#2ea44f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open preview &rarr;</a></p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Namespace</td><td style='padding:4px 8px'>${env.PREVIEW_NS}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>DB seed</td><td style='padding:4px 8px'>${seedBadgeB}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Frontend</td><td style='padding:4px 8px'>${env.FRONTEND_IMAGE}:${env.FRONTEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Backend</td><td style='padding:4px 8px'>${env.BACKEND_IMAGE}:${env.BACKEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
    </table>
  </div>
</div>"""
                        )
                    } catch (e) {
                        echo "⚠️ Email notification failed: ${e.message}"
                    }
                } else if (env.CAN_DEPLOY == 'true') {
                    echo "🚀 Develop deployed successfully"
                    try {
                        emailext(
                            to: env.FIXED_EMAIL,
                            mimeType: 'text/html',
                            subject: "[yambo] 🚀 develop deployed successfully",
                            body: """
<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#0366d6;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>&#128640; develop deployed to production</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><a href='https://${APP_DOMAIN}' style='display:inline-block;background:#0366d6;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open app &rarr;</a></p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Frontend</td><td style='padding:4px 8px'>${env.FRONTEND_IMAGE}:${env.FRONTEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Backend</td><td style='padding:4px 8px'>${env.BACKEND_IMAGE}:${env.BACKEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
    </table>
  </div>
</div>"""
                        )
                    } catch (e) {
                        echo "⚠️ Email notification failed: ${e.message}"
                    }
                } else {
                    echo "✅ Build successful (no deploy)"
                }
            }
        }
        failure {
            script {
                def context = env.IS_PR == 'true'
                    ? "PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH} &rarr; ${env.CHANGE_TARGET})"
                    : "branch ${env.BRANCH_NAME}"
                def failRecipients = [env.FIXED_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')
                try {
                    emailext(
                        to: failRecipients,
                        mimeType: 'text/html',
                        subject: "[yambo] ❌ Build failed — ${env.IS_PR == 'true' ? 'PR #' + env.CHANGE_ID : env.BRANCH_NAME}",
                        body: """
<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#d73a49;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>&#10060; Build failed</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p>The pipeline failed for <strong>${context}</strong>.</p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Console</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}console'>View console output</a></td></tr>
    </table>
  </div>
</div>"""
                    )
                } catch (e) {
                    echo "⚠️ Email notification failed: ${e.message}"
                }
            }
            echo "❌ Pipeline failed"
        }
    }
}
