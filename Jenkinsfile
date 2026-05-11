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
            description: 'Custom namespace/URL slug for the preview (e.g. "my-feature"). Auto-derived from branch name if blank.'
        )
        booleanParam(
            name: 'FORCE_DB_SEED',
            defaultValue: false,
            description: 'Force re-seed of the preview database even if the environment already exists.'
        )
        booleanParam(
            name: 'FORCE_PROD_DEPLOY',
            defaultValue: false,
            description: 'Redeploy existing registry images to production without rebuilding (develop branch only). Useful after a failed rollout or infra-only change.'
        )
    }

    environment {
        REGISTRY       = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        KUBECONFIG     = "/var/lib/jenkins/.kube/config"
        NAMESPACE      = "yambo"
        APP_DOMAIN     = "yambo.cabrasky.net"
        // Notification email stored as a Jenkins credential (plain text)
        NOTIFICATION_EMAIL = credentials('notification-email')
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
                    env.FRONTEND_VER = sh(
                        script: "grep '\"version\"' frontend/package.json | head -1 | sed 's/.*\"version\": \"\\(.*\\)\".*/\\1/'",
                        returnStdout: true
                    ).trim()

                    env.BACKEND_VER = sh(
                        script: "cd backend && chmod +x mvnw && ./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout",
                        returnStdout: true
                    ).trim()

                    def semverPattern = /^\d+\.\d+\.\d+([_-][a-zA-Z0-9]+)?$/

                    if (env.CHANGE_ID) {
                        // Pull Request build
                        echo "Pull Request #${env.CHANGE_ID} (${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET})"
                        if (!env.FRONTEND_VER.matches(semverPattern)) {
                            error "Invalid frontend version in package.json: '${env.FRONTEND_VER}' -- must be semver (x.y.z)"
                        }
                        if (!env.BACKEND_VER.matches(semverPattern)) {
                            error "Invalid backend version in pom.xml: '${env.BACKEND_VER}' -- must be semver (x.y.z)"
                        }
                        env.FRONTEND_TAG = "pr-${env.CHANGE_ID}"
                        env.BACKEND_TAG  = "pr-${env.CHANGE_ID}"
                        env.IS_PR        = 'true'
                        env.IS_CUSTOM    = 'false'

                    } else if (params.FORCE_PREVIEW_DEPLOY) {
                        // Custom preview deploy from a branch
                        def slug = (params.DEPLOY_ID?.trim()
                            ? params.DEPLOY_ID.trim()
                            : env.BRANCH_NAME
                                .toLowerCase()
                                .replaceAll('[^a-z0-9]+', '-')
                                .replaceAll('^-+|-+$', ''))
                            .take(30)
                        echo "Custom preview deploy -- slug: ${slug}"
                        env.EFFECTIVE_ID = slug
                        env.FRONTEND_TAG = "branch-${slug}"
                        env.BACKEND_TAG  = "branch-${slug}"
                        env.IS_PR        = 'false'
                        env.IS_CUSTOM    = 'true'

                    } else {
                        // Regular branch build
                        echo "Branch build: ${env.BRANCH_NAME}"
                        if (!env.FRONTEND_VER.matches(semverPattern)) {
                            error "Invalid frontend version in package.json: '${env.FRONTEND_VER}'"
                        }
                        if (!env.BACKEND_VER.matches(semverPattern)) {
                            error "Invalid backend version in pom.xml: '${env.BACKEND_VER}'"
                        }
                        env.FRONTEND_TAG = env.FRONTEND_VER
                        env.BACKEND_TAG  = env.BACKEND_VER
                        env.IS_PR        = 'false'
                        env.IS_CUSTOM    = 'false'
                    }

                    env.CAN_DEPLOY = (env.BRANCH_NAME == 'develop' && env.IS_PR == 'false' && env.IS_CUSTOM == 'false') ? 'true' : 'false'
                    echo "Frontend tag: ${env.FRONTEND_TAG} | Backend tag: ${env.BACKEND_TAG} | Deploy: ${env.CAN_DEPLOY}"
                }
            }
        }

        stage('Check Version Changes') {
            // Skip for PRs and custom deploys -- always build those
            when {
                expression { env.IS_PR == 'false' && env.IS_CUSTOM == 'false' }
            }
            steps {
                script {
                    def check = { String image, String tag ->
                        def code = sh(
                            script: "curl -sk -o /dev/null -w '%{http_code}' http://${REGISTRY}/v2/${image}/manifests/${tag}",
                            returnStdout: true
                        ).trim()
                        if (code == '200') return false  // exists -- unchanged
                        if (code == '404') return true   // new tag -- build needed
                        error "Registry check for ${image}:${tag} returned unexpected HTTP ${code} -- aborting"
                    }

                    env.FRONTEND_CHANGED = check('yambo-web-frontend', env.FRONTEND_TAG) ? 'true' : 'false'
                    env.BACKEND_CHANGED  = check('yambo-web-backend',  env.BACKEND_TAG)  ? 'true' : 'false'

                    echo "Frontend changed: ${env.FRONTEND_CHANGED} | Backend changed: ${env.BACKEND_CHANGED}"
                    if (env.FRONTEND_CHANGED == 'false') echo "Frontend image ${env.FRONTEND_TAG} already in registry -- skipping"
                    if (env.BACKEND_CHANGED  == 'false') echo "Backend image ${env.BACKEND_TAG} already in registry -- skipping"
                }
            }
        }

        stage('Force Build') {
            // PRs and custom deploys always rebuild both components
            when {
                expression { env.IS_PR == 'true' || env.IS_CUSTOM == 'true' }
            }
            steps {
                script {
                    env.FRONTEND_CHANGED = 'true'
                    env.BACKEND_CHANGED  = 'true'
                    echo "Full build forced (PR=${env.IS_PR}, custom=${env.IS_CUSTOM})"
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 2 -- Test + Build (parallel)
        // ─────────────────────────────────────────────────────────────────────

        stage('Test & Build') {
            when {
                expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' }
            }
            parallel {
                stage('Backend') {
                    when {
                        expression { env.BACKEND_CHANGED == 'true' }
                    }
                    steps {
                        dir('backend') {
                            sh 'chmod +x mvnw && ./mvnw verify -T 1C -B'
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
                stage('Frontend') {
                    when {
                        expression { env.FRONTEND_CHANGED == 'true' }
                    }
                    steps {
                        dir('frontend') {
                            sh 'npm install && npm run typecheck && npm run build'
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 2b -- API Contract Check
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
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'api-check',
                        reportFiles          : 'api-mapping-report.html',
                        reportName           : 'API Mapping Report',
                    ])
                    archiveArtifacts artifacts: 'api-check/api-mapping-issues.json', allowEmptyArchive: true
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 3 -- SonarQube Analysis + Quality Gate
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
                        timeout(time: 5, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
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
                        timeout(time: 5, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: true
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 4 -- Docker Build & Push (parallel)
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
        // Phase 4a -- Deploy Preview Environment (PRs / custom branch deploys)
        // ─────────────────────────────────────────────────────────────────────

        stage('Deploy Preview') {
            when {
                expression { env.IS_PR == 'true' || env.IS_CUSTOM == 'true' }
            }
            steps {
                script {
                    def deployId    = (env.IS_PR == 'true') ? env.CHANGE_ID : env.EFFECTIVE_ID
                    def previewNs   = (env.IS_PR == 'true') ? "yambo-pr-${deployId}" : "yambo-branch-${deployId}"
                    def deployLabel = (env.IS_PR == 'true') ? "pr-${deployId}" : "branch-${deployId}"
                    def overlayDir  = "k8s/overlays/preview"

                    // -- Update Kustomize overlay with this build's values
                    sh """
                        cd ${overlayDir}
                        kustomize edit set namespace ${previewNs}
                        kustomize edit set image ${FRONTEND_IMAGE}=${FRONTEND_IMAGE}:${env.FRONTEND_TAG}
                        kustomize edit set image ${BACKEND_IMAGE}=${BACKEND_IMAGE}:${env.BACKEND_TAG}
                    """

                    // -- Write the domain patch for this preview
                    writeFile file: "${overlayDir}/patches/domain.yaml", text: """
- op: replace
  path: /spec/template/spec/containers/0/env/0/value
  value: "https://${deployLabel}.${APP_DOMAIN}"
  target:
    kind: Deployment
    name: yambo-backend
- op: replace
  path: /spec/template/spec/containers/0/env/1/value
  value: "https://${deployLabel}.${APP_DOMAIN}"
  target:
    kind: Deployment
    name: yambo-frontend
- op: replace
  path: /spec/rules/0/host
  value: ${deployLabel}.${APP_DOMAIN}
  target:
    kind: Ingress
    name: yambo-ingress
- op: replace
  path: /spec/tls/0/hosts/0
  value: ${deployLabel}.${APP_DOMAIN}
  target:
    kind: Ingress
    name: yambo-ingress
- op: replace
  path: /spec/tls/0/secretName
  value: yambo-tls-${deployLabel}
  target:
    kind: Ingress
    name: yambo-ingress
"""

                    // -- Apply namespace + secrets (idempotent)
                    // Capture whether this is a brand-new environment BEFORE creating the namespace
                    def wasFresh = sh(
                        script: "kubectl get namespace ${previewNs} --ignore-not-found --no-headers 2>/dev/null | wc -l",
                        returnStdout: true
                    ).trim() == "0"

                    sh """
                        kubectl create namespace ${previewNs} --dry-run=client -o yaml | kubectl apply -f -

                        if ! kubectl get secret yambo-secrets -n ${previewNs} >/dev/null 2>&1; then
                            kubectl apply -k ${overlayDir} --selector=kind=Secret
                        fi
                    """

                    // -- Deploy database
                    sh """
                        kubectl apply -k ${overlayDir} --selector='app=postgres'
                        kubectl rollout status deployment/postgres -n ${previewNs} --timeout=120s
                    """

                    // -- DB seeding
                    def needsSeed = wasFresh || params.FORCE_DB_SEED
                    env.DB_SEEDED = needsSeed ? 'true' : 'false'

                    if (needsSeed) {
                        echo "Seeding preview database..."

                        def podName = sh(
                            script: "kubectl get pod -n ${previewNs} -l app=postgres --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}'",
                            returnStdout: true
                        ).trim()

                        if (!podName) {
                            error "No running postgres pod found in ${previewNs}"
                        }

                        // Credentials are read inside a shell with set +x -- values never appear in the Jenkins log
                        sh """
                            set +x

                            PROD_DB_USER=\$(kubectl get secret yambo-secrets -n ${NAMESPACE} -o jsonpath='{.data.DB_USER}' | base64 -d)
                            PROD_DB_PASS=\$(kubectl get secret yambo-secrets -n ${NAMESPACE} -o jsonpath='{.data.DB_PASS}' | base64 -d)

                            chmod +x scripts/anonymize-dump.sh
                            kubectl cp scripts/anonymize-dump.sh ${previewNs}/${podName}:/tmp/anonymize-dump.sh

                            kubectl exec ${podName} -n ${previewNs} -- sh -c 'command -v bash >/dev/null || apk add --no-cache bash >/dev/null 2>&1' || true

                            # Write pgpass inside pod -- credentials never passed as CLI args
                            kubectl exec ${podName} -n ${previewNs} -- sh -c "
                                printf '%s:5432:yambo_db:%s:%s\\n' db.${NAMESPACE}.svc.cluster.local \\\${PROD_DB_USER} \\\${PROD_DB_PASS} > /tmp/.pgpass
                                chmod 600 /tmp/.pgpass
                            "

                            kubectl exec ${podName} -n ${previewNs} -- env \\
                                PROD_DB_HOST=db.${NAMESPACE}.svc.cluster.local \\
                                PROD_DB_PORT=5432 \\
                                PGPASSFILE=/tmp/.pgpass \\
                                PGHOST=/var/run/postgresql \\
                                PGUSER=\\\$PROD_DB_USER \\
                                ANONYMIZE_DUMP_MODE=database-bootstrap \\
                                bash /tmp/anonymize-dump.sh /tmp/preview-seed.sql

                            kubectl exec ${podName} -n ${previewNs} -- rm -f /tmp/.pgpass /tmp/anonymize-dump.sh

                            kubectl cp ${previewNs}/${podName}:/tmp/preview-seed.sql /tmp/preview-seed-${previewNs}.sql
                            kubectl exec ${podName} -n ${previewNs} -- rm -f /tmp/preview-seed.sql
                        """

                        sh """
                            kubectl delete configmap preview-seed-sql -n ${previewNs} --ignore-not-found
                            kubectl create configmap preview-seed-sql \\
                                -n ${previewNs} \\
                                --from-file=preview-seed.sql=/tmp/preview-seed-${previewNs}.sql

                            kubectl delete job preview-seed -n ${previewNs} --ignore-not-found
                            kubectl wait --for=delete job/preview-seed -n ${previewNs} --timeout=120s || true

                            kubectl apply -f ${overlayDir}/seed-job.yaml -n ${previewNs}
                            kubectl wait --for=condition=complete job/preview-seed -n ${previewNs} --timeout=600s

                            rm -f /tmp/preview-seed-${previewNs}.sql
                        """
                    } else {
                        echo "Skipping DB seed -- namespace ${previewNs} already exists (FORCE_DB_SEED=true to override)"
                    }

                    // -- Deploy application
                    sh "kubectl apply -k ${overlayDir}"
                    sh "kubectl rollout status deployment/yambo-backend  -n ${previewNs} --timeout=300s"
                    sh "kubectl rollout status deployment/yambo-frontend -n ${previewNs} --timeout=300s"

                    env.PREVIEW_URL = "https://${deployLabel}.${APP_DOMAIN}"
                    env.PREVIEW_NS  = previewNs
                    currentBuild.description = "<a href='${env.PREVIEW_URL}'>Preview: ${deployLabel}.${APP_DOMAIN}</a>"
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Phase 4b -- Deploy to Production (develop branch only)
        // ─────────────────────────────────────────────────────────────────────

        stage('Deploy to Production') {
            when {
                allOf {
                    branch 'develop'
                    expression { env.CAN_DEPLOY == 'true' }
                    expression { env.FRONTEND_CHANGED == 'true' || env.BACKEND_CHANGED == 'true' || params.FORCE_PROD_DEPLOY }
                }
            }
            steps {
                script {
                    def overlayDir = "k8s/overlays/production"

                    sh """
                        cd ${overlayDir}
                        kustomize edit set image ${FRONTEND_IMAGE}=${FRONTEND_IMAGE}:${env.FRONTEND_TAG}
                        kustomize edit set image ${BACKEND_IMAGE}=${BACKEND_IMAGE}:${env.BACKEND_TAG}
                    """

                    sh """
                        kubectl apply -f k8s/base/namespace.yaml

                        if ! kubectl get secret yambo-secrets -n ${NAMESPACE} >/dev/null 2>&1; then
                            echo "ERROR: yambo-secrets not found in ${NAMESPACE} -- apply it manually before deploying." >&2
                            exit 1
                        fi
                    """

                    sh "kubectl apply -k ${overlayDir}"

                    sh "kubectl rollout status deployment/postgres     -n ${NAMESPACE} --timeout=120s"
                    sh "kubectl rollout status deployment/yambo-backend  -n ${NAMESPACE} --timeout=300s"
                    sh "kubectl rollout status deployment/yambo-frontend -n ${NAMESPACE} --timeout=300s"

                    sh """
                        git config user.email "jenkins@cabrasky.net"
                        git config user.name  "Jenkins"
                    """
                    // Tag per component — only for the one(s) that actually changed
                    if (env.FRONTEND_CHANGED == 'true') {
                        sh """
                            git tag -f "frontend-v${env.FRONTEND_TAG}" -m "Frontend deployed by Jenkins build #${env.BUILD_NUMBER}"
                            git push origin "frontend-v${env.FRONTEND_TAG}" --force
                        """
                    }
                    if (env.BACKEND_CHANGED == 'true') {
                        sh """
                            git tag -f "backend-v${env.BACKEND_TAG}" -m "Backend deployed by Jenkins build #${env.BUILD_NUMBER}"
                            git push origin "backend-v${env.BACKEND_TAG}" --force
                        """
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Post-build notifications
    // ─────────────────────────────────────────────────────────────────────────

    post {
        success {
            script {
                def recipients = [env.NOTIFICATION_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')

                if (env.IS_PR == 'true') {
                    def seedBadge = env.DB_SEEDED == 'true'
                        ? '<span style="background:#2ea44f;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">DB seeded</span>'
                        : '<span style="background:#6a737d;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">DB seed skipped</span>'
                    def previewBtn = env.PREVIEW_URL
                        ? "<p><a href='${env.PREVIEW_URL}' style='display:inline-block;background:#2ea44f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open preview &rarr;</a></p>"
                        : ''
                    try {
                        emailext(
                            to: recipients,
                            mimeType: 'text/html',
                            subject: "[yambo] PR #${env.CHANGE_ID} -- build passed",
                            body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#2ea44f;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>PR #${env.CHANGE_ID} -- build passed</h2>
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
                    } catch (e) { echo "Email notification failed: ${e.message}" }

                } else if (env.IS_CUSTOM == 'true') {
                    try {
                        emailext(
                            to: env.NOTIFICATION_EMAIL,
                            mimeType: 'text/html',
                            subject: "[yambo] Preview deployed -- ${env.BRANCH_NAME}",
                            body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#2ea44f;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>Preview deployed -- ${env.BRANCH_NAME}</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><a href='${env.PREVIEW_URL}' style='display:inline-block;background:#2ea44f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open preview &rarr;</a></p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Namespace</td><td style='padding:4px 8px'>${env.PREVIEW_NS}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
    </table>
  </div>
</div>"""
                        )
                    } catch (e) { echo "Email notification failed: ${e.message}" }

                } else if (env.CAN_DEPLOY == 'true') {
                    try {
                        emailext(
                            to: env.NOTIFICATION_EMAIL,
                            mimeType: 'text/html',
                            subject: "[yambo] develop deployed to production -- v${env.FRONTEND_TAG}",
                            body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#0366d6;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>develop deployed to production</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><a href='https://${APP_DOMAIN}' style='display:inline-block;background:#0366d6;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open app &rarr;</a></p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Version</td><td style='padding:4px 8px'>v${env.FRONTEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Frontend</td><td style='padding:4px 8px'>${env.FRONTEND_IMAGE}:${env.FRONTEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Backend</td><td style='padding:4px 8px'>${env.BACKEND_IMAGE}:${env.BACKEND_TAG}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
    </table>
  </div>
</div>"""
                        )
                    } catch (e) { echo "Email notification failed: ${e.message}" }
                }
            }
        }

        failure {
            script {
                def context = env.IS_PR == 'true'
                    ? "PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET})"
                    : "branch ${env.BRANCH_NAME}"
                def recipients = [env.NOTIFICATION_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')
                try {
                    emailext(
                        to: recipients,
                        mimeType: 'text/html',
                        subject: "[yambo] Build failed -- ${env.IS_PR == 'true' ? 'PR #' + env.CHANGE_ID : env.BRANCH_NAME}",
                        body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#d73a49;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>Build failed</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p>The pipeline failed for <strong>${context}</strong>.</p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Console</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}console'>View output</a></td></tr>
    </table>
  </div>
</div>"""
                    )
                } catch (e) { echo "Email notification failed: ${e.message}" }
            }
        }
    }
}
