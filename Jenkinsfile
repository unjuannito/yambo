// ============================================================================
// Jenkinsfile — yambo-web CI/CD pipeline (v2 — parametrizado)
// ============================================================================
// Estrategia de despliegue:
//   main/master   → PRODUCCIÓN = Hetzner CX33 (kubeconfig hetzner)
//   develop       → LOCAL = k3s .22 (acceso público vía nginx .21)
//   otras ramas   → solo test + sonar (sin deploy)
//   PRs           → test + sonar (sin deploy)
//
// Transporte (patrón validado con mantelio):
//   Jenkins (k3s .22, solo ssh) → ssh BUILD_HOST (.21, docker) → build + push
//   → kubectl --kubeconfig <según rama> apply (kustomize overlays)
//
// TODOS los valores sensibles/de entorno vienen de credenciales Jenkins
// (NUNCA hardcodeados): registry, hosts, dominios, kubeconfigs, tokens.
// ============================================================================

pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'FORCE_REBUILD',
            defaultValue: false,
            description: 'Force full rebuild + redeploy even without code changes.'
        )
        booleanParam(
            name: 'FORCE_PROD_DEPLOY',
            defaultValue: false,
            description: 'Redeploy existing images to production (main only, skips build).'
        )
    }

    environment {
        // ── Credenciales Jenkins (configurar en Manage Jenkins → Credentials) ──
        //   yambo-ssh-key        : SSH private key (id_deploy) para BUILD_HOST
        //   yambo-build-host     : "root@192.168.1.21"
        //   yambo-registry       : "192.168.1.21:5000"
        //   yambo-registry-user  : usuario registry (Fase 3)
        //   yambo-registry-pass  : password registry (Fase 3)
        //   yambo-sonar-url      : "http://192.168.1.21:9000"
        //   yambo-sonar-token    : token sonar (Fase 2)
        //   github               : credencial GitHub existente (jobs brain-web/mantelio)
        SSH_KEY          = credentials('yambo-ssh-key')
        BUILD_HOST       = credentials('yambo-build-host')
        REGISTRY_USER    = credentials('yambo-registry-user')
        REGISTRY_PASS    = credentials('yambo-registry-pass')
        SONAR_HOST_URL   = credentials('yambo-sonar-url')
        SONAR_AUTH_TOKEN = credentials('yambo-sonar-token')

        // ── Imágenes ─────────────────────────────────────────────────────────
        // Registry local por LAN (develop → k3s .22)
        REGISTRY = credentials('yambo-registry-host-dev')
        FRONTEND_IMAGE = "${REGISTRY}/yambo-web-frontend"
        BACKEND_IMAGE  = "${REGISTRY}/yambo-web-backend"
        // Registry vía NetBird para Hetzner (main → producción)
        REGISTRY_HETZNER = credentials('yambo-registry-host-prod')
        FRONTEND_IMAGE_HETZNER = "${REGISTRY_HETZNER}/yambo-web-frontend"
        BACKEND_IMAGE_HETZNER  = "${REGISTRY_HETZNER}/yambo-web-backend"

        // ── Dominios públicos (DNS gestionado en BIND .21 + Cloudflare) ──────
        PROD_DOMAIN = 'yambo.cabrasky.net'
        DEV_DOMAIN  = 'dev.yambo.cabrasky.net'

        // ── Kubeconfigs (en BUILD_HOST .21) ──────────────────────────────────
        //   Local   : /root/.kube/config      (k3s .22)
        //   Hetzner : /root/.kube/hetzner.yaml (k3s CX33 vía NetBird)
        KUBECONFIG_LOCAL   = '/root/.kube/config'
        KUBECONFIG_HETZNER = '/root/.kube/hetzner.yaml'

        // ── Namespaces ───────────────────────────────────────────────────────
        NS_PROD = 'yambo'
        NS_DEV  = 'yambo-develop'
    }

    stages {

        // ═══════════════════════════════════════════════════════════════════
        // Phase 1 — Checkout
        // ═══════════════════════════════════════════════════════════════════
        stage('Checkout') {
            steps { checkout scm }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 2 — Detect changes
        // ═══════════════════════════════════════════════════════════════════
        stage('Detect Changes') {
            steps {
                script {
                    env.IS_PR = env.CHANGE_ID ? 'true' : 'false'
                    env.IS_MAIN   = (env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master') ? 'true' : 'false'
                    env.IS_DEV    = (env.BRANCH_NAME == 'develop') ? 'true' : 'false'

                    // Versiones
                    env.FRONTEND_VER = sh(
                        script: "grep '\"version\"' frontend/package.json | head -1 | sed 's/.*\"version\": \"\\(.*\\)\".*/\\1/'",
                        returnStdout: true
                    ).trim()
                    env.BACKEND_VER = sh(
                        script: "cd backend && chmod +x mvnw && ./mvnw help:evaluate -Dexpression=project.version -q -DforceStdout",
                        returnStdout: true
                    ).trim()

                    // Tags de imagen
                    if (env.IS_MAIN == 'true') {
                        env.FRONTEND_TAG = env.FRONTEND_VER
                        env.BACKEND_TAG  = env.BACKEND_VER
                    } else {
                        def slug = env.BRANCH_NAME.toLowerCase().replaceAll('[^a-z0-9]+', '-').replaceAll('^-+|-+$', '')
                        env.FRONTEND_TAG = "branch-${slug}"
                        env.BACKEND_TAG  = "branch-${slug}"
                    }

                    // Cambios (solo main/develop hacen deploy)
                    def baseRef = (env.IS_MAIN == 'true') ? 'HEAD~1' : 'HEAD~1'
                    def changedFiles = sh(
                        script: "git diff --name-only ${baseRef}...HEAD || true",
                        returnStdout: true
                    ).trim().split('\n').findAll { it?.trim() }

                    if (changedFiles.isEmpty() && !params.FORCE_REBUILD) {
                        env.FE_CHANGED  = 'true'
                        env.BE_CHANGED  = 'true'
                        env.INFRA_CHANGED = 'false'
                    } else {
                        env.FE_CHANGED  = changedFiles.any { it.startsWith('frontend/') } ? 'true' : 'false'
                        env.BE_CHANGED  = changedFiles.any { it.startsWith('backend/') } ? 'true' : 'false'
                        env.INFRA_CHANGED = changedFiles.any { it.startsWith('k8s/') || it == 'Jenkinsfile' || it.startsWith('scripts/') } ? 'true' : 'false'
                    }
                    env.DEPLOYABLE_CHANGED = (env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true' || env.INFRA_CHANGED == 'true' || params.FORCE_REBUILD) ? 'true' : 'false'

                    echo "branch=${env.BRANCH_NAME} main=${env.IS_MAIN} dev=${env.IS_DEV} FE=${env.FE_CHANGED} BE=${env.BE_CHANGED} infra=${env.INFRA_CHANGED} deployable=${env.DEPLOYABLE_CHANGED}"
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 2.5 — Prepare Build Host (transferir código a BUILD_HOST .21)
        // ═══════════════════════════════════════════════════════════════════
        // Necesario SIEMPRE que haya deploy (aunque solo cambie infra):
        // los stages Test/Sonar se saltan si no hay cambios FE/BE y el
        // deploy necesita /tmp/yambo-ci con el código.
        stage('Prepare Build Host') {
            when {
                expression { env.DEPLOYABLE_CHANGED == 'true' && !params.FORCE_PROD_DEPLOY }
            }
            steps {
                sh """
                    tar czf - --exclude=.git --exclude=node_modules --exclude=frontend/node_modules --exclude=backend/target . | \
                    ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                        'rm -rf /tmp/yambo-ci && mkdir -p /tmp/yambo-ci && tar xzf - -C /tmp/yambo-ci && ls /tmp/yambo-ci | head -20'
                """
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 3 — Test (en BUILD_HOST con contenedores; .21 no tiene mvn/node)
        // ═══════════════════════════════════════════════════════════════════
        stage('Test') {
            when {
                expression { env.DEPLOYABLE_CHANGED == 'true' && !params.FORCE_PROD_DEPLOY }
            }
            parallel {
                stage('Backend Test') {
                    when { expression { env.BE_CHANGED == 'true' } }
                    steps {
                        script {
                            sh """
                                tar czf - --exclude=.git --exclude=node_modules backend | \
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'mkdir -p /tmp/yambo-ci && tar xzf - -C /tmp/yambo-ci && \
                                     docker run --rm -v /tmp/yambo-ci/backend:/app -w /app \
                                       maven:3.9-eclipse-temurin-21 sh -c "chmod +x mvnw && ./mvnw verify -T 1C -B -q"'
                            """
                        }
                    }
                }
                stage('Frontend Test') {
                    when { expression { env.FE_CHANGED == 'true' } }
                    steps {
                        script {
                            sh """
                                tar czf - --exclude=.git --exclude=node_modules frontend | \
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'mkdir -p /tmp/yambo-ci && tar xzf - -C /tmp/yambo-ci && \
                                     docker run --rm -v /tmp/yambo-ci/frontend:/app -w /app \
                                       node:22-alpine sh -c "npm install --no-audit --no-fund && npm run typecheck && npm run build"'
                            """
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 4 — SonarQube (BUILD_HOST → sonar.cabrasky.net/.21:9000)
        // ═══════════════════════════════════════════════════════════════════
        stage('SonarQube') {
            when {
                expression { env.DEPLOYABLE_CHANGED == 'true' && !params.FORCE_PROD_DEPLOY }
            }
            parallel {
                stage('Backend Sonar') {
                    when { expression { env.BE_CHANGED == 'true' } }
                    steps {
                        script {
                            def branchArgs = (env.IS_MAIN == 'true') ? '' : "-Dsonar.branch.name=${env.BRANCH_NAME}"
                            sh """
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'cd /tmp/yambo-ci/backend && \
                                     docker run --rm -v /tmp/yambo-ci/backend:/app -w /app \
                                       maven:3.9-eclipse-temurin-21 sh -c "./mvnw sonar:sonar -Dsonar.projectKey=yambo-backend -Dsonar.projectName=yambo-backend -Dsonar.coverage.jacoco.xmlReportPaths=target/jacoco-report/jacoco.xml -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.token=${SONAR_AUTH_TOKEN} ${branchArgs}"'
                            """
                        }
                    }
                }
                stage('Frontend Sonar') {
                    when { expression { env.FE_CHANGED == 'true' } }
                    steps {
                        script {
                            def branchArgs = (env.IS_MAIN == 'true') ? '' : "--define sonar.branch.name=${env.BRANCH_NAME}"
                            sh """
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'cd /tmp/yambo-ci/frontend && \
                                     docker run --rm -v /tmp/yambo-ci/frontend:/app -w /app \
                                       node:22-alpine sh -c "npm install --no-audit --no-fund && npx sonar-scanner --define sonar.host.url=${SONAR_HOST_URL} --define sonar.token=${SONAR_AUTH_TOKEN} ${branchArgs}"'
                            """
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 5 — Docker Build & Push (BUILD_HOST → REGISTRY)
        // ═══════════════════════════════════════════════════════════════════
        // NOTA: builds SECUENCIALES y con --memory limitado. La VM infra (.21)
        // tiene 3 GB RAM (Sonar+Postgres+registry+NetBird ya consumen ~2 GB);
        // el parallel de Maven+Node la tumba por swap thrashing.
        stage('Docker Build & Push') {
            when {
                expression { env.DEPLOYABLE_CHANGED == 'true' && !params.FORCE_PROD_DEPLOY }
            }
            stages {
                stage('Frontend Image') {
                    when { expression { env.FE_CHANGED == 'true' || env.INFRA_CHANGED == 'true' } }
                    steps {
                        script {
                            sh """
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'cd /tmp/yambo-ci && \
                                     docker build --memory=1g --memory-swap=1g -t ${FRONTEND_IMAGE}:${env.FRONTEND_TAG} frontend && \
                                     echo ${REGISTRY_PASS} | docker login ${REGISTRY} -u ${REGISTRY_USER} --password-stdin && \
                                     docker push ${FRONTEND_IMAGE}:${env.FRONTEND_TAG}'
                            """
                        }
                    }
                }
                stage('Backend Image') {
                    when { expression { env.BE_CHANGED == 'true' || env.INFRA_CHANGED == 'true' } }
                    steps {
                        script {
                            sh """
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'cd /tmp/yambo-ci && \
                                     docker build --memory=1g --memory-swap=1g -t ${BACKEND_IMAGE}:${env.BACKEND_TAG} backend && \
                                     echo ${REGISTRY_PASS} | docker login ${REGISTRY} -u ${REGISTRY_USER} --password-stdin && \
                                     docker push ${BACKEND_IMAGE}:${env.BACKEND_TAG}'
                            """
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 6 — Deploy
        // ═══════════════════════════════════════════════════════════════════

        // ── Deploy PRODUCCIÓN: rama main/master → Hetzner CX33 ────────────
        stage('Deploy Production (Hetzner)') {
            when {
                allOf {
                    expression { env.IS_MAIN == 'true' && env.IS_PR == 'false' }
                    expression { env.DEPLOYABLE_CHANGED == 'true' }
                }
            }
            steps {
                script {
                    def overlayDir = "k8s/overlays/hetzner"
                    // Para Hetzner: push de imágenes al registry vía NetBird
                    // y usar el nombre overlay del registry (100.111.131.248:5000)
                    sh """
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                            'cd /tmp/yambo-ci && \
                             echo ${REGISTRY_PASS} | docker login ${REGISTRY_HETZNER} -u ${REGISTRY_USER} --password-stdin && \
                             docker tag ${FRONTEND_IMAGE}:${env.FRONTEND_TAG} ${FRONTEND_IMAGE_HETZNER}:${env.FRONTEND_TAG} && \
                             docker push ${FRONTEND_IMAGE_HETZNER}:${env.FRONTEND_TAG} && \
                             docker tag ${BACKEND_IMAGE}:${env.BACKEND_TAG} ${BACKEND_IMAGE_HETZNER}:${env.BACKEND_TAG} && \
                             docker push ${BACKEND_IMAGE_HETZNER}:${env.BACKEND_TAG} && \
                             cd ${overlayDir} && \
                             kustomize edit set image yambo-web-frontend=${FRONTEND_IMAGE_HETZNER}:${env.FRONTEND_TAG} && \
                             kustomize edit set image yambo-web-backend=${BACKEND_IMAGE_HETZNER}:${env.BACKEND_TAG} && \
                             cd /tmp/yambo-ci && \
                             KUBECONFIG=${KUBECONFIG_HETZNER} kubectl kustomize ${overlayDir} | \
                               awk -f k8s/scripts/strip-secrets.awk | KUBECONFIG=${KUBECONFIG_HETZNER} kubectl apply -f - && \
                             KUBECONFIG=${KUBECONFIG_HETZNER} kubectl rollout status deployment/yambo-frontend -n ${NS_PROD} --timeout=300s'
                    """
                }
            }
        }

        // ── Deploy LOCAL: rama develop → k3s .22 (público vía nginx .21) ──
        stage('Deploy Develop (local)') {
            when {
                allOf {
                    expression { env.IS_DEV == 'true' && env.IS_PR == 'false' }
                    expression { env.DEPLOYABLE_CHANGED == 'true' }
                }
            }
            steps {
                script {
                    def overlayDir = "k8s/overlays/develop"
                    sh """
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                            'cd /tmp/yambo-ci && \
                             cd ${overlayDir} && \
                             kustomize edit set image yambo-web-frontend=${FRONTEND_IMAGE}:${env.FRONTEND_TAG} && \
                             kustomize edit set image yambo-web-backend=${BACKEND_IMAGE}:${env.BACKEND_TAG} && \
                             cd /tmp/yambo-ci && \
                             KUBECONFIG=${KUBECONFIG_LOCAL} kubectl create namespace ${NS_DEV} --dry-run=client -o yaml | KUBECONFIG=${KUBECONFIG_LOCAL} kubectl apply -f - && \
                             if ! KUBECONFIG=${KUBECONFIG_LOCAL} kubectl get secret yambo-secrets -n ${NS_DEV} >/dev/null 2>&1; then \
                               KUBECONFIG=${KUBECONFIG_LOCAL} kubectl create secret generic yambo-secrets -n ${NS_DEV} \
                                 --from-literal=DB_USER=${REGISTRY_USER} \
                                 --from-literal=DB_PASS=${REGISTRY_PASS} \
                                 --from-literal=JWT_SECRET=\$(openssl rand -hex 32) \
                                 --from-literal=MAIL_HOST=smtp.gmail.com \
                                 --from-literal=MAIL_USERNAME=CHANGE_ME \
                                 --from-literal=MAIL_PASSWORD=CHANGE_ME \
                                 --from-literal=MAIL_FROM=noreply@yambo-alco.es; \
                             fi && \
                             KUBECONFIG=${KUBECONFIG_LOCAL} kubectl kustomize ${overlayDir} | \
                               awk -f k8s/scripts/strip-secrets.awk | KUBECONFIG=${KUBECONFIG_LOCAL} kubectl apply -f - && \
                             KUBECONFIG=${KUBECONFIG_LOCAL} kubectl rollout status deployment/yambo-frontend -n ${NS_DEV} --timeout=300s'
                    """
                }
            }
        }
    }

    post {
        success {
            script {
                def envName = (env.IS_MAIN == 'true') ? 'PRODUCCIÓN (Hetzner)' : (env.IS_DEV == 'true') ? 'DESARROLLO (local)' : env.BRANCH_NAME
                echo "✅ [yambo] ${env.BRANCH_NAME} → ${envName} desplegado correctamente (build #${env.BUILD_NUMBER})"
                if (env.IS_MAIN == 'true') {
                    echo "   URL: https://${PROD_DOMAIN}"
                } else if (env.IS_DEV == 'true') {
                    echo "   URL: https://${DEV_DOMAIN}"
                }
            }
        }
        failure {
            echo "❌ [yambo] Fallo en build #${env.BUILD_NUMBER} (${env.BRANCH_NAME}) — revisar ${env.BUILD_URL}"
        }
    }
}
