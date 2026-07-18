// ============================================================================
// Jenkinsfile — yambo-web CI/CD pipeline
// ============================================================================
// Runs the minimum required actions based on what changed:
//
//   frontend/**  → test FE,   Sonar FE,   build FE image
//   backend/**   → test BE,   Sonar BE,   build BE image
//   k8s/** docker-compose* scripts/ Jenkinsfile → deploy only (no test/build)
//   README.md docs/** *.md   → skip everything
//
// On PRs: deploy preview only if code or infra changed (no-op otherwise).
// On develop: deploy production if code or infra changed (or FORCE_PROD_DEPLOY).
// ============================================================================

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
            description: 'Redeploy existing registry images to production without rebuilding (develop branch only).'
        )
        booleanParam(
            name: 'FORCE_REBUILD',
            defaultValue: false,
            description: 'Force a full rebuild (test + build + push + deploy) even when no code changes are detected.'
        )
    }

    environment {
        REGISTRY       = "192.168.1.11:5000"
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        KUBECONFIG     = "/var/lib/jenkins/.kube/config"
        NAMESPACE      = "yambo"
        APP_DOMAIN     = "yambo.cabrasky.net"
        NOTIFICATION_EMAIL = credentials('notification-email')
        NPM_CONFIG_CACHE   = '/var/lib/jenkins/.npm-cache'
        MAVEN_OPTS         = '-Dmaven.repo.local=/var/lib/jenkins/.m2-cache'
    }

    stages {

        // ═══════════════════════════════════════════════════════════════════
        // Phase 1 — Setup
        // ═══════════════════════════════════════════════════════════════════

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Detect Changes') {
            steps {
                script {

                    // ── 1. Classify this build ───────────────────────────────
                    env.IS_PR     = env.CHANGE_ID ? 'true' : 'false'
                    env.IS_CUSTOM = (params.FORCE_PREVIEW_DEPLOY) ? 'true' : 'false'

                    // ── 2. Read versions ─────────────────────────────────────
                    env.FRONTEND_VER = sh(
                        script: "grep '\"version\"' frontend/package.json | head -1 | sed 's/.*\"version\": \"\\(.*\\)\".*/\\1/'",
                        returnStdout: true
                    ).trim()

                    env.BACKEND_VER = sh(
                        script: "cd backend && chmod +x mvnw && ./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout",
                        returnStdout: true
                    ).trim()

                    def semver = /^\d+\.\d+\.\d+([_-][a-zA-Z0-9]+)?$/
                    if (!env.FRONTEND_VER.matches(semver)) {
                        error "Invalid frontend version: '${env.FRONTEND_VER}' — must be semver (x.y.z)"
                    }
                    if (!env.BACKEND_VER.matches(semver)) {
                        error "Invalid backend version: '${env.BACKEND_VER}' — must be semver (x.y.z)"
                    }

                    // ── 3. Resolve image tags ────────────────────────────────
                    if (env.IS_PR == 'true') {
                        env.FRONTEND_TAG = "pr-${env.CHANGE_ID}"
                        env.BACKEND_TAG  = "pr-${env.CHANGE_ID}"
                        echo "Pull Request #${env.CHANGE_ID} (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                    } else if (env.IS_CUSTOM == 'true') {
                        def slug = (params.DEPLOY_ID?.trim()
                            ? params.DEPLOY_ID.trim()
                            : env.BRANCH_NAME
                                .toLowerCase()
                                .replaceAll('[^a-z0-9]+', '-')
                                .replaceAll('^-+|-+$', ''))
                            .take(30)
                        env.EFFECTIVE_ID  = slug
                        env.FRONTEND_TAG  = "branch-${slug}"
                        env.BACKEND_TAG   = "branch-${slug}"
                        echo "Custom preview — slug: ${slug}"
                    } else if (env.BRANCH_NAME == 'develop') {
                        // Develop branch — use version-numbered tags
                        env.FRONTEND_TAG = env.FRONTEND_VER
                        env.BACKEND_TAG  = env.BACKEND_VER
                        echo "Develop build — tags: ${env.FRONTEND_VER} / ${env.BACKEND_VER}"
                    } else {
                        // Any other branch — use branch-name-based tags, not version numbers
                        def slug = env.BRANCH_NAME
                            .toLowerCase()
                            .replaceAll('[^a-z0-9]+', '-')
                            .replaceAll('^-+|-+$', '')
                            .take(45)
                        env.EFFECTIVE_ID  = slug
                        env.FRONTEND_TAG = "branch-${slug}"
                        env.BACKEND_TAG  = "branch-${slug}"
                        echo "Branch build: ${env.BRANCH_NAME} → tag: branch-${slug}"
                    }

                    // ── 4. Git diff — what changed? ──────────────────────────
                    def baseRef
                    def fetchRef
                    if (env.BRANCH_NAME == 'develop' && env.IS_PR == 'false' && env.IS_CUSTOM == 'false') {
                        baseRef = 'HEAD~1'                     // previous commit on develop
                        fetchRef = null
                    } else if (env.IS_PR == 'true') {
                        baseRef = 'FETCH_HEAD'                 // PR diffs against target branch — use FETCH_HEAD
                        fetchRef = env.CHANGE_TARGET
                    } else if (env.IS_CUSTOM == 'true') {
                        baseRef = 'FETCH_HEAD'               // custom previews — use FETCH_HEAD after fetch
                        fetchRef = 'develop'
                    } else {
                        baseRef = 'HEAD~1'                     // regular branch push — only this commit
                        fetchRef = null
                    }

                    if (fetchRef) {
                        withCredentials([gitUsernamePassword(credentialsId: scm.userRemoteConfigs[0].credentialsId, gitToolName: 'Default')]) {
                            sh "git fetch origin ${fetchRef}"
                        }
                    }

                    def changedFiles = sh(
                        script: "git diff --name-only ${baseRef}...HEAD || true",
                        returnStdout: true
                    ).trim().split('\\n').findAll { it?.trim() }

                    if (changedFiles.isEmpty()) {
                        echo "WARNING: empty git diff (shallow clone?) — forcing full build"
                        env.FE_CHANGED  = 'true'
                        env.BE_CHANGED  = 'true'
                        env.INFRA_CHANGED = 'false'
                        env.DEPLOYABLE_CHANGED = 'true'
                        return
                    }

                    // ── 5. Categorise every changed path ─────────────────────
                    def frontendDirs = ['frontend/']
                    def backendDirs  = ['backend/']
                    def infraDirs    = ['k8s/', 'scripts/', '.github/']
                    def infraFiles   = ['docker-compose.yml', 'docker-compose.dev.yml', 'Jenkinsfile', 'Jenkinsfile.dump', 'Jenkinsfile.cleanup']
                    def docFiles     = ['README.md', 'LICENSE']
                    def docDirs      = ['docs/']

                    def feChanged  = false
                    def beChanged  = false
                    def infraChanged = false
                    def onlyDocs   = true

                    // Helper: path matches any prefix in a list
                    def startsWithAny = { String path, List prefixes ->
                        prefixes.any { path.startsWith(it) }
                    }

                    for (f in changedFiles) {
                        if (startsWithAny(f, frontendDirs))       { feChanged = true;  onlyDocs = false }
                        else if (startsWithAny(f, backendDirs))   { beChanged = true;  onlyDocs = false }
                        else if (startsWithAny(f, infraDirs))     { infraChanged = true; onlyDocs = false }
                        else if (infraFiles.contains(f))          { infraChanged = true; onlyDocs = false }
                        else if (startsWithAny(f, docDirs))       { /* docs — skip */ }
                        else if (docFiles.contains(f))            { /* docs — skip */ }
                        else if (f.endsWith('.md'))               { /* root markdown — skip */ }
                        else                                      { onlyDocs = false } // unknown file → treat as meaningful
                    }

                    // Fallback: if tag doesn't exist in registry, force rebuild
                    def imageExists = { String image, String tag ->
                        def code = sh(
                            script: "curl -sk -o /dev/null -w '%{http_code}' http://${REGISTRY}/v2/${image}/manifests/${tag}",
                            returnStdout: true
                        ).trim()
                        if (code == '200') return true
                        if (code == '404') return false
                        error "Registry check for ${image}:${tag} returned HTTP ${code}"
                    }

                    if (!feChanged && !imageExists('yambo-web-frontend', env.FRONTEND_TAG)) {
                        feChanged = true
                        echo "Frontend tag ${env.FRONTEND_TAG} not in registry — forcing rebuild"
                    }
                    if (!beChanged && !imageExists('yambo-web-backend', env.BACKEND_TAG)) {
                        beChanged = true
                        echo "Backend tag ${env.BACKEND_TAG} not in registry — forcing rebuild"
                    }

                    // ── 6. Force-deploy flags ────────────────────────────────────
                    if (params.FORCE_PROD_DEPLOY) {
                        // Prod redeploy: skip test/build, redeploy existing images
                        echo "Force prod deploy — skipping test/build, using existing images"
                        feChanged = false
                        beChanged = false
                        infraChanged = true
                        onlyDocs = false
                    } else if (params.FORCE_PREVIEW_DEPLOY) {
                        // Preview deploy: if images already exist from a previous build,
                        // skip rebuild and just redeploy. Only build if this is the
                        // first deploy of this branch (no images in registry).
                        def feExists = imageExists('yambo-web-frontend', env.FRONTEND_TAG)
                        def beExists = imageExists('yambo-web-backend', env.BACKEND_TAG)
                        if (feExists && beExists) {
                            echo "Force preview deploy — images already exist, using existing images"
                            feChanged = false
                            beChanged = false
                        } else {
                            echo "Force preview deploy — first deploy, running full pipeline"
                            // feChanged/beChanged stay as determined by git diff
                        }
                        infraChanged = true
                        onlyDocs = false
                    }

                    // ── 7. Force rebuild override ─────────────────────────────
                    if (params.FORCE_REBUILD) {
                        echo "FORCE_REBUILD — running full test/build/deploy pipeline regardless of changes"
                        feChanged = true
                        beChanged = true
                        infraChanged = true
                        onlyDocs = false
                    }

                    // ── 8. Export results ────────────────────────────────────
                    env.FE_CHANGED    = feChanged   ? 'true' : 'false'
                    env.BE_CHANGED    = beChanged   ? 'true' : 'false'
                    env.INFRA_CHANGED = infraChanged ? 'true' : 'false'

                    def deployable = feChanged || beChanged || infraChanged ||
                        env.IS_CUSTOM == 'true' || params.FORCE_PROD_DEPLOY
                    env.DEPLOYABLE_CHANGED = deployable ? 'true' : 'false'

                    env.SKIP_ALL = (onlyDocs && !deployable) ? 'true' : 'false'

                    echo "── Change summary ──────────────────────────────"
                    echo "  frontend: ${env.FE_CHANGED}"
                    echo "  backend:  ${env.BE_CHANGED}"
                    echo "  infra:    ${env.INFRA_CHANGED}"
                    echo "  deploy:   ${env.DEPLOYABLE_CHANGED}"
                    echo "  skip_all: ${env.SKIP_ALL}"
                    echo "  tags:     fe=${env.FRONTEND_TAG}  be=${env.BACKEND_TAG}"
                    echo "────────────────────────────────────────────────"
                }
            }
        }

        // Early skip — docs-only or no meaningful changes
        stage('Early Skip Check') {
            when { expression { env.SKIP_ALL == 'true' } }
            steps {
                script {
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                    echo "  Only docs/metadata changed — nothing to build or"
                    echo "  deploy. Pipeline complete."
                    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 2 — Test (parallel)
        // ═══════════════════════════════════════════════════════════════════

        stage('Test') {
            when {
                expression { env.SKIP_ALL != 'true' && (env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true') }
            }
            parallel {
                stage('Backend Test') {
                    when { expression { env.BE_CHANGED == 'true' } }
                    steps {
                        dir('backend') {
                            sh 'chmod +x mvnw && ./mvnw verify -T 1C -B'
                        }
                    }
                    post {
                        always {
                            stash name: 'backend-jacoco', includes: 'backend/target/jacoco-report/**', allowEmpty: true
                            recordCoverage tools: [[
                                parser : 'JACOCO',
                                pattern: 'backend/target/jacoco-report/jacoco.xml'
                            ]]
                        }
                    }
                }
                stage('Frontend Test') {
                    when { expression { env.FE_CHANGED == 'true' } }
                    steps {
                        dir('frontend') {
                            sh 'npm install && npm run typecheck && npm run build'
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 3 — API Contract Check (sequential, before Sonar)
        // ═══════════════════════════════════════════════════════════════════

        stage('API Contract Check') {
            when {
                expression { env.SKIP_ALL != 'true' && (env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true') }
            }
            steps {
                sh 'node scripts/check-api-mapping.js --output-dir=api-check'
            }
            post {
                always {
                    stash name: 'api-check-results', includes: 'api-check/**', allowEmpty: true
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

        // ═══════════════════════════════════════════════════════════════════
        // Phase 4 — SonarQube Analysis (parallel)
        // ═══════════════════════════════════════════════════════════════════

        stage('SonarQube Analysis') {
            when {
                expression { env.SKIP_ALL != 'true' && (env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true') }
            }
            parallel {
                stage('Backend Sonar') {
                    when { expression { env.BE_CHANGED == 'true' } }
                    steps {
                        unstash 'backend-jacoco'
                        withSonarQubeEnv('SonarQube') {
                            dir('backend') {
                                script {
                                    def branchArgs = env.IS_PR == 'true'
                                        ? "-Dsonar.pullrequest.key=${env.CHANGE_ID} -Dsonar.pullrequest.branch=${env.CHANGE_BRANCH} -Dsonar.pullrequest.base=${env.CHANGE_TARGET}"
                                        : (env.BRANCH_NAME == 'develop' ? '' : "-Dsonar.branch.name=${env.BRANCH_NAME}")
                                    sh "./mvnw sonar:sonar -Dsonar.projectKey=yambo-backend -Dsonar.projectName=yambo-backend -Dsonar.coverage.jacoco.xmlReportPaths=target/jacoco-report/jacoco.xml -Dsonar.host.url=${env.SONAR_HOST_URL} -Dsonar.token=${env.SONAR_AUTH_TOKEN} ${branchArgs}"
                                }
                            }
                        }
                        timeout(time: 5, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: false
                        }
                    }
                }
                stage('Frontend Sonar') {
                    when { expression { env.FE_CHANGED == 'true' } }
                    steps {
                        unstash 'api-check-results'
                        withSonarQubeEnv('SonarQube') {
                            dir('frontend') {
                                sh 'npm run test:coverage'
                                script {
                                    def branchArgs = env.IS_PR == 'true'
                                        ? "--define sonar.pullrequest.key=${env.CHANGE_ID} --define sonar.pullrequest.branch=${env.CHANGE_BRANCH} --define sonar.pullrequest.base=${env.CHANGE_TARGET}"
                                        : (env.BRANCH_NAME == 'develop' ? '' : "--define sonar.branch.name=${env.BRANCH_NAME}")
                                    sh "npx sonar-scanner --define sonar.host.url=${env.SONAR_HOST_URL} --define sonar.token=${env.SONAR_AUTH_TOKEN} --define sonar.externalIssuesReportPaths=../api-check/api-mapping-issues.json ${branchArgs}"
                                }
                            }
                        }
                        timeout(time: 5, unit: 'MINUTES') {
                            waitForQualityGate abortPipeline: false
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 5 — Docker Build & Push (parallel)
        // ═══════════════════════════════════════════════════════════════════

        stage('Docker Build & Push') {
            when {
                expression { env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true' }
            }
            parallel {
                stage('Frontend Image') {
                    when { expression { env.FE_CHANGED == 'true' } }
                    steps {
                        sh "docker build -t ${FRONTEND_IMAGE}:${env.FRONTEND_TAG} frontend"
                        sh "docker push ${FRONTEND_IMAGE}:${env.FRONTEND_TAG}"
                    }
                }
                stage('Backend Image') {
                    when { expression { env.BE_CHANGED == 'true' } }
                    steps {
                        sh "docker build -t ${BACKEND_IMAGE}:${env.BACKEND_TAG} backend"
                        sh "docker push ${BACKEND_IMAGE}:${env.BACKEND_TAG}"
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 6 — Deploy
        // ═══════════════════════════════════════════════════════════════════

        // ── Preview Deployment (PRs / custom branch deploys) ────────────

        stage('Deploy Preview') {
            when {
                allOf {
                    expression { env.IS_PR == 'true' || env.IS_CUSTOM == 'true' || (env.IS_PR == 'false' && env.IS_CUSTOM == 'false' && env.BRANCH_NAME != 'develop') }
                    expression { env.DEPLOYABLE_CHANGED == 'true' }
                }
            }
            steps {
                script {
                    def deployId    = (env.IS_PR == 'true') ? env.CHANGE_ID : env.EFFECTIVE_ID
                    def previewNs   = (env.IS_PR == 'true') ? "yambo-pr-${deployId}" : "yambo-branch-${deployId}"
                    def deployLabel = (env.IS_PR == 'true') ? "pr-${deployId}" : "branch-${deployId}"
                    def overlayDir  = "k8s/overlays/preview"

                    // Update kustomize overlay with this build's images
                    sh """
                        cd ${overlayDir}
                        kustomize edit set namespace ${previewNs}
                        kustomize edit set image ${FRONTEND_IMAGE}=${FRONTEND_IMAGE}:${env.FRONTEND_TAG}
                        kustomize edit set image ${BACKEND_IMAGE}=${BACKEND_IMAGE}:${env.BACKEND_TAG}
                    """

                    writeFile file: "${overlayDir}/patches/domain-backend.yaml", text: """- op: replace
  path: /spec/template/spec/containers/0/env/0/value
  value: "https://${deployLabel}.${APP_DOMAIN}"
"""
                    writeFile file: "${overlayDir}/patches/domain-frontend.yaml", text: """- op: replace
  path: /spec/template/spec/containers/0/env/1/value
  value: "https://${deployLabel}.${APP_DOMAIN}"
"""
                    writeFile file: "${overlayDir}/patches/domain-ingress.yaml", text: """- op: replace
  path: /spec/rules/0/host
  value: ${deployLabel}.${APP_DOMAIN}
"""

                    // Create namespace + secrets (idempotent)
                    def wasFresh = sh(
                        script: "kubectl get namespace ${previewNs} --ignore-not-found --no-headers 2>/dev/null | wc -l",
                        returnStdout: true
                    ).trim() == "0"

                    sh """
                        kubectl create namespace ${previewNs} --dry-run=client -o yaml | kubectl apply -f -

                        if ! kubectl get secret yambo-secrets -n ${previewNs} >/dev/null 2>&1; then
                            kubectl kustomize ${overlayDir} | awk '
                                BEGIN { doc = ""; is_secret = 0 }
                                /^---/ {
                                    if (is_secret) { printf "%s", doc }
                                    doc = "---\\n"; is_secret = 0; next
                                }
                                { doc = doc \$0 "\\n" }
                                /^kind: Secret\$/ { is_secret = 1 }
                                END { if (is_secret) { printf "%s", doc } }
                            ' | kubectl apply -f -
                        fi
                    """

                    // PVCs only on fresh namespace (immutable resize protection)
                    if (wasFresh) {
                        sh """
                            kubectl kustomize ${overlayDir} | awk '
                                BEGIN { doc = ""; is_pvc = 0 }
                                /^---/ {
                                    if (is_pvc) { printf "%s", doc }
                                    doc = "---\\n"; is_pvc = 0; next
                                }
                                { doc = doc \$0 "\\n" }
                                /^kind: PersistentVolumeClaim\$/ { is_pvc = 1 }
                                END { if (is_pvc) { printf "%s", doc } }
                            ' | kubectl apply -f -
                        """
                    }

                    sh """
                        kubectl kustomize ${overlayDir} | kubectl apply --selector='app=postgres' -f -
                        kubectl rollout status deployment/postgres -n ${previewNs} --timeout=120s
                    """

                    // DB seeding
                    def needsSeed = wasFresh || params.FORCE_DB_SEED
                    env.DB_SEEDED = needsSeed ? 'true' : 'false'

                    if (needsSeed) {
                        echo "Seeding preview database..."
                        def podName = sh(
                            script: "kubectl get pod -n ${previewNs} -l app=postgres --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}'",
                            returnStdout: true
                        ).trim()
                        if (!podName) { error "No running postgres pod in ${previewNs}" }

                        sh """
                            set +x
                            PROD_DB_USER=\$(kubectl get secret yambo-secrets -n ${NAMESPACE} -o jsonpath='{.data.DB_USER}' | base64 -d)
                            PROD_DB_PASS=\$(kubectl get secret yambo-secrets -n ${NAMESPACE} -o jsonpath='{.data.DB_PASS}' | base64 -d)
                            PREVIEW_DB_USER=\$(kubectl get secret yambo-secrets -n ${previewNs} -o jsonpath='{.data.DB_USER}' | base64 -d)

                            chmod +x scripts/anonymize-dump.sh
                            kubectl cp scripts/anonymize-dump.sh ${previewNs}/${podName}:/tmp/anonymize-dump.sh

                            kubectl exec ${podName} -n ${previewNs} -- sh -c 'command -v bash >/dev/null || apk add --no-cache bash >/dev/null 2>&1' || true

                            kubectl exec ${podName} -n ${previewNs} -- sh -c "
                                printf '%s:5432:yambo_db:%s:%s\\n' db.${NAMESPACE}.svc.cluster.local \\\${PROD_DB_USER} \\\${PROD_DB_PASS} > /tmp/.pgpass
                                chmod 600 /tmp/.pgpass
                            "

                            kubectl exec ${podName} -n ${previewNs} -- env \\
                                PROD_DB_HOST=db.${NAMESPACE}.svc.cluster.local \\
                                PROD_DB_PORT=5432 \\
                                PROD_DB_USER=\${PROD_DB_USER} \\
                                PROD_DB_PASS=\${PROD_DB_PASS} \\
                                PGPASSFILE=/tmp/.pgpass \\
                                PGHOST=/var/run/postgresql \\
                                PGUSER=\${PREVIEW_DB_USER} \\
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
                        echo "Skipping DB seed — namespace ${previewNs} already exists (FORCE_DB_SEED=true to override)"
                    }

                    // Deploy application (skip PVCs + Secrets — managed above)
                    // Apply kustomize only if there are any component changes
                    if (env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true' || env.INFRA_CHANGED == 'true') {
                        sh """
                            kubectl kustomize ${overlayDir} | awk '
                                BEGIN { doc = ""; skip = 0 }
                                /^---/ {
                                    if (doc != "" && !skip) { printf "%s", doc }
                                    doc = "---\\n"; skip = 0; next
                                }
                                { doc = doc \$0 "\\n" }
                                /^kind: (PersistentVolumeClaim|Secret)\$/ { skip = 1 }
                                END { if (doc != "" && !skip) { printf "%s", doc } }
                            ' | kubectl apply -f -
                        """
                    } else {
                        echo "No component changes — skipping kustomize apply"
                    }

                    // Only restart and wait for components that actually changed
                    if (env.BE_CHANGED == 'true') {
                        sh "kubectl rollout restart deployment/yambo-backend -n ${previewNs}"
                        sh "kubectl rollout status deployment/yambo-backend -n ${previewNs} --timeout=300s"
                    } else {
                        echo "Backend unchanged — skipping redeploy"
                    }

                    if (env.FE_CHANGED == 'true') {
                        sh "kubectl rollout restart deployment/yambo-frontend -n ${previewNs}"
                        sh "kubectl rollout status deployment/yambo-frontend -n ${previewNs} --timeout=300s"
                    } else {
                        echo "Frontend unchanged — skipping redeploy"
                    }

                    env.PREVIEW_URL = "https://${deployLabel}.${APP_DOMAIN}"
                    env.PREVIEW_NS  = previewNs
                    currentBuild.description = "<a href='${env.PREVIEW_URL}'>Preview: ${deployLabel}.${APP_DOMAIN}</a>"
                }
            }
        }

        // ── Production Deployment (develop branch only) ─────────────────

        stage('Deploy Production') {
            when {
                allOf {
                    branch 'develop'
                    expression { env.IS_PR == 'false' && env.IS_CUSTOM == 'false' }
                    expression { env.DEPLOYABLE_CHANGED == 'true' }
                }
            }
            steps {
                script {
                    def overlayDir = "k8s/overlays/production"
                    def scmCredentialsId = scm?.userRemoteConfigs?.getAt(0)?.credentialsId

                    sh """
                        cd ${overlayDir}
                        kustomize edit set image ${FRONTEND_IMAGE}=${FRONTEND_IMAGE}:${env.FRONTEND_TAG}
                        kustomize edit set image ${BACKEND_IMAGE}=${BACKEND_IMAGE}:${env.BACKEND_TAG}
                    """

                    sh """
                        kubectl apply -f k8s/base/namespace.yaml

                        if ! kubectl get secret yambo-secrets -n ${NAMESPACE} >/dev/null 2>&1; then
                            echo "ERROR: yambo-secrets not found in ${NAMESPACE}" >&2
                            exit 1
                        fi
                    """

                    // Apply everything except secrets (PRODUCTION SAFETY)
                    sh """
                        kubectl kustomize ${overlayDir} | awk '
                            BEGIN { doc = ""; is_secret = 0 }
                            /^---/ {
                                if (doc != "" && !is_secret) { printf "%s", doc }
                                doc = "---\\n"; is_secret = 0; next
                            }
                            { doc = doc \$0 "\\n" }
                            /^kind: Secret\$/ { is_secret = 1 }
                            END { if (doc != "" && !is_secret) { printf "%s", doc } }
                        ' | kubectl apply -f -
                    """

                    // Re-deploy secrets only when explicitly forced
                    if (params.FORCE_PROD_DEPLOY) {
                        echo "WARNING: Re-deploying production secrets (FORCE_PROD_DEPLOY=true)"
                        sh """
                            kubectl kustomize ${overlayDir} | awk '
                                BEGIN { doc = ""; is_secret = 0 }
                                /^---/ {
                                    if (is_secret) { printf "%s", doc }
                                    doc = "---\\n"; is_secret = 0; next
                                }
                                { doc = doc \$0 "\\n" }
                                /^kind: Secret\$/ { is_secret = 1 }
                                END { if (is_secret) { printf "%s", doc } }
                            ' | kubectl apply -f -
                        """
                    }

                    sh "kubectl rollout status deployment/postgres     -n ${NAMESPACE} --timeout=120s"
                    sh "kubectl rollout status deployment/yambo-backend  -n ${NAMESPACE} --timeout=300s"
                    sh "kubectl rollout status deployment/yambo-frontend -n ${NAMESPACE} --timeout=300s"

                    sh """
                        git config user.email "jenkins@cabrasky.net"
                        git config user.name  "Jenkins"
                    """

                    if (!scmCredentialsId?.trim()) {
                        error "Missing SCM credentialsId — cannot push deployment tags"
                    }

                    if (env.FE_CHANGED == 'true') {
                        withCredentials([gitUsernamePassword(credentialsId: scmCredentialsId, gitToolName: 'git')]) {
                            sh """
                                git tag -f "frontend-v${env.FRONTEND_TAG}" -m "Frontend deployed by Jenkins build #${env.BUILD_NUMBER}"
                                git push origin "frontend-v${env.FRONTEND_TAG}" --force
                            """
                        }
                    }
                    if (env.BE_CHANGED == 'true') {
                        withCredentials([gitUsernamePassword(credentialsId: scmCredentialsId, gitToolName: 'git')]) {
                            sh """
                                git tag -f "backend-v${env.BACKEND_TAG}" -m "Backend deployed by Jenkins build #${env.BUILD_NUMBER}"
                                git push origin "backend-v${env.BACKEND_TAG}" --force
                            """
                        }
                    }
                }
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Post-build notifications
    // ═════════════════════════════════════════════════════════════════════

    post {
        success {
            script {
                // Build a context description for the notification
                def context = env.IS_PR == 'true'
                    ? "PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                    : (env.IS_CUSTOM == 'true' ? "Preview ${env.EFFECTIVE_ID}" : "develop")

                // Nothing was built or deployed — send a brief summary only
                if (env.SKIP_ALL == 'true') {
                    echo "Docs-only change — nothing built or deployed."
                    return
                }

                def recipients = [env.NOTIFICATION_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')

                if (env.IS_PR == 'true') {
                    def seedBadge = env.DB_SEEDED == 'true'
                        ? '<span style="background:#2ea44f;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">DB seeded</span>'
                        : '<span style="background:#6a737d;color:#fff;border-radius:3px;padding:2px 8px;font-size:12px">DB seed skipped</span>'
                    def previewBtn = env.PREVIEW_URL
                        ? "<p><a href='${env.PREVIEW_URL}' style='display:inline-block;background:#2ea44f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open preview →</a></p>"
                        : ''
                    try {
                        emailext(
                            to: recipients,
                            mimeType: 'text/html',
                            subject: "[yambo] PR #${env.CHANGE_ID} — passed",
                            body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#2ea44f;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>PR #${env.CHANGE_ID} — passed</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><strong>${env.CHANGE_BRANCH}</strong> → <strong>${env.CHANGE_TARGET}</strong></p>
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
                            subject: "[yambo] Preview deployed — ${env.BRANCH_NAME}",
                            body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#2ea44f;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>Preview deployed — ${env.BRANCH_NAME}</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><a href='${env.PREVIEW_URL}' style='display:inline-block;background:#2ea44f;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open preview →</a></p>
    <table style='border-collapse:collapse;width:100%;font-size:14px'>
      <tr><td style='padding:4px 8px;color:#586069'>Namespace</td><td style='padding:4px 8px'>${env.PREVIEW_NS}</td></tr>
      <tr><td style='padding:4px 8px;color:#586069'>Job</td><td style='padding:4px 8px'><a href='${env.BUILD_URL}'>${env.JOB_NAME} #${env.BUILD_NUMBER}</a></td></tr>
    </table>
  </div>
</div>"""
                        )
                    } catch (e) { echo "Email notification failed: ${e.message}" }

                } else {
                    // develop → production deploy
                    try {
                        emailext(
                            to: env.NOTIFICATION_EMAIL,
                            mimeType: 'text/html',
                            subject: "[yambo] develop deployed — v${env.FRONTEND_TAG}",
                            body: """<div style='font-family:Arial,sans-serif;max-width:600px'>
  <div style='background:#0366d6;color:#fff;padding:16px 20px;border-radius:6px 6px 0 0'>
    <h2 style='margin:0'>develop deployed to production</h2>
  </div>
  <div style='border:1px solid #e1e4e8;border-top:none;padding:20px;border-radius:0 0 6px 6px'>
    <p><a href='https://${APP_DOMAIN}' style='display:inline-block;background:#0366d6;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-weight:bold'>Open app →</a></p>
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
                    ? "PR #${env.CHANGE_ID} (${env.CHANGE_BRANCH} → ${env.CHANGE_TARGET})"
                    : "branch ${env.BRANCH_NAME}"
                def recipients = [env.NOTIFICATION_EMAIL, env.CHANGE_AUTHOR_EMAIL].findAll { it?.trim() }.unique().join(',')
                try {
                    emailext(
                        to: recipients,
                        mimeType: 'text/html',
                        subject: "[yambo] Build failed — ${env.IS_PR == 'true' ? 'PR #' + env.CHANGE_ID : env.BRANCH_NAME}",
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
