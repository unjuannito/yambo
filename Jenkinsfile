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
        //   yambo-build-host     : "<usuario>@192.168.1.21" (no root; grupo docker)
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
                    def shortSha = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    if (env.IS_MAIN == 'true') {
                        env.FRONTEND_TAG = env.FRONTEND_VER
                        env.BACKEND_TAG  = env.BACKEND_VER
                    } else {
                        def slug = env.BRANCH_NAME.toLowerCase().replaceAll('[^a-z0-9]+', '-').replaceAll('^-+|-+$', '')
                        env.FRONTEND_TAG = "branch-${slug}-${shortSha}"
                        env.BACKEND_TAG  = "branch-${slug}-${shortSha}"
                    }

                    // Cambios (solo main/develop hacen deploy)
                    def baseRef = (env.IS_MAIN == 'true') ? 'HEAD~1' : 'HEAD~1'
                    def changedFiles = sh(
                        script: "git diff --name-only ${baseRef}...HEAD || true",
                        returnStdout: true
                    ).trim().split('\n').findAll { it?.trim() }

                    // El commit de tag que hace este pipeline (stage 'Update Image Tag')
                    // toca k8s/ → sin este corte dispararía otro build → bucle infinito.
                    def lastMsg = sh(script: "git log -1 --pretty=%s", returnStdout: true).trim()

                    if (params.FORCE_REBUILD) {
                        env.FE_CHANGED  = 'true'
                        env.BE_CHANGED  = 'true'
                        env.INFRA_CHANGED = 'true'
                    } else if (lastMsg.contains('[skip ci]')) {
                        echo "Commit de CI (${lastMsg}) → nada que construir."
                        env.FE_CHANGED  = 'false'
                        env.BE_CHANGED  = 'false'
                        env.INFRA_CHANGED = 'false'
                    } else if (changedFiles.isEmpty()) {
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
        // FIX 2026-09-23: los contenedores de Test/Sonar (maven, node) escriben
        // backend/target y frontend/node_modules vía bind mount con otro owner
        // → el `rm -rf` del usuario ssh fallaba con "Permission denied". Si el
        // rm normal falla, se borra desde un contenedor (mismo daemon docker
        // que creó los ficheros, así que siempre tiene permiso).
        stage('Prepare Build Host') {
            when {
                expression { env.DEPLOYABLE_CHANGED == 'true' && !params.FORCE_PROD_DEPLOY }
            }
            steps {
                sh """
                    tar czf - --exclude=.git --exclude=node_modules --exclude=frontend/node_modules --exclude=backend/target . | \
                    ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                        'if [ -e /tmp/yambo-ci ]; then \
                           rm -rf /tmp/yambo-ci 2>/dev/null || \
                           docker run --rm -v /tmp:/host-tmp alpine:3 rm -rf /host-tmp/yambo-ci; \
                         fi && \
                         [ ! -e /tmp/yambo-ci ] && \
                         mkdir -p /tmp/yambo-ci && tar xzf - -C /tmp/yambo-ci && ls /tmp/yambo-ci | head -20'
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
                                     docker run --rm --cpus=1 -v /tmp/yambo-ci/backend:/app -w /app \
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
                                     docker run --rm --cpus=1 -v /tmp/yambo-ci/frontend:/app -w /app \
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
                            def sonarArgs = ''

                            if (env.IS_PR == 'true') {
                                sonarArgs = "-Dsonar.pullrequest.key=${env.CHANGE_ID} -Dsonar.pullrequest.branch=${env.CHANGE_BRANCH} -Dsonar.pullrequest.base=${env.CHANGE_TARGET}"
                            } else if (env.IS_MAIN != 'true') {
                                sonarArgs = "-Dsonar.branch.name=${env.BRANCH_NAME}"
                            }
                            sh """
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'cd /tmp/yambo-ci/backend && \
                                     docker run --rm --cpus=1 --network=host -v /tmp/yambo-ci/backend:/app -w /app \
                                       maven:3.9-eclipse-temurin-21 sh -c "./mvnw org.sonarsource.scanner.maven:sonar-maven-plugin:4.0.0.4121:sonar -Dsonar.projectKey=yambo-backend -Dsonar.projectName=yambo-backend -Dsonar.coverage.jacoco.xmlReportPaths=target/jacoco-report/jacoco.xml -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.login=${SONAR_AUTH_TOKEN} ${sonarArgs}"'
                            """
                        }
                    }
                }
                stage('Frontend Sonar') {
                    when { expression { env.FE_CHANGED == 'true' } }
                    steps {
                        script {
                            // SONAR_SCANNER_OPTS limita el heap del JVM del escáner y
                            // sonar.javascript.node.maxspace limita el runtime Node.js embedded
                            def sonarArgs = ''

                            if (env.IS_PR == 'true') {
                                sonarArgs = "--define sonar.pullrequest.key=${env.CHANGE_ID} --define sonar.pullrequest.branch=${env.CHANGE_BRANCH} --define sonar.pullrequest.base=${env.CHANGE_TARGET}"
                            } else if (env.IS_MAIN != 'true') {
                                sonarArgs = "--define sonar.branch.name=${env.BRANCH_NAME}"
                            }
                            sh """
                                ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i ${SSH_KEY} ${BUILD_HOST} \
                                    'cd /tmp/yambo-ci/frontend && \
                                     docker run --rm --cpus=1 --network=host -v /tmp/yambo-ci/frontend:/app -w /app \
                                       -e SONAR_SCANNER_OPTS=-Xmx1024m \
                                       sonarsource/sonar-scanner-cli:11 sonar-scanner -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.login=${SONAR_AUTH_TOKEN} -Dsonar.projectBaseDir=/app -Dsonar.javascript.node.maxspace=1024 ${sonarArgs}'
                            """
                        }
                    }
                }
            }
        }

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
        // Phase 6 — Update Image Tag (GitOps → Argo CD)
        // ═══════════════════════════════════════════════════════════════════
        // Jenkins escribe el tag RECIÉN CONSTRUIDO en el overlay que vigila
        // Argo CD y hace commit + push a la rama. Así Argo CD despliega
        // exactamente la imagen de este build (no depende de que Image Updater
        // adivine el tag: `alphabetical` sobre short-SHAs no elige el último).
        //   develop → k8s/overlays/develop  (Application yambo-develop, auto-sync)
        //   main    → k8s/overlays/hetzner  (Application yambo-prod, sync manual)
        // Solo se toca el tag de la imagen que se ha construido en este build.
        // El commit lleva [skip ci] (ver 'Detect Changes') para no re-disparar.
        // Requiere que la credencial 'github' (usuario + token) tenga permiso
        // de push sobre la rama.
        stage('Update Image Tag (GitOps)') {
            when {
                allOf {
                    expression { env.IS_PR == 'false' }
                    expression { env.IS_MAIN == 'true' || env.IS_DEV == 'true' }
                    expression { env.DEPLOYABLE_CHANGED == 'true' && !params.FORCE_PROD_DEPLOY }
                }
            }
            steps {
                script {
                    def overlay = (env.IS_MAIN == 'true') ? 'k8s/overlays/hetzner' : 'k8s/overlays/develop'
                    def bumpFe = (env.FE_CHANGED == 'true' || env.INFRA_CHANGED == 'true')
                    def bumpBe = (env.BE_CHANGED == 'true' || env.INFRA_CHANGED == 'true')
                    withEnv([
                        "KUSTOMIZATION=${overlay}/kustomization.yaml",
                        "BUMP_FE=${bumpFe}",
                        "BUMP_BE=${bumpBe}"
                    ]) {
                        withCredentials([gitUsernamePassword(credentialsId: 'github', gitToolName: 'Default')]) {
                            sh '''
                                set -e
                                # Partir de la punta actual de la rama (puede haber avanzado durante el build)
                                git fetch origin "$BRANCH_NAME"
                                git checkout -q -f --detach FETCH_HEAD

                                if [ "$BUMP_FE" = "true" ]; then
                                    sed -i "/- name: yambo-web-frontend$/,/newTag:/ s|newTag:.*|newTag: \\"$FRONTEND_TAG\\"|" "$KUSTOMIZATION"
                                fi
                                if [ "$BUMP_BE" = "true" ]; then
                                    sed -i "/- name: yambo-web-backend$/,/newTag:/ s|newTag:.*|newTag: \\"$BACKEND_TAG\\"|" "$KUSTOMIZATION"
                                fi

                                if git diff --quiet -- "$KUSTOMIZATION"; then
                                    echo "El overlay ya apunta a estos tags; nada que commitear."
                                    exit 0
                                fi
                                git diff -- "$KUSTOMIZATION"
                                git -c user.name="Jenkins CI" -c user.email="jenkins@cabrasky.net" \\
                                    commit -q -m "chore(cd): desplegar imágenes del build #$BUILD_NUMBER en $BRANCH_NAME [skip ci]" -- "$KUSTOMIZATION"
                                git push origin "HEAD:refs/heads/$BRANCH_NAME"
                            '''
                        }
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 7 — Deploy (GitOps con Argo CD)
        // ═══════════════════════════════════════════════════════════════════
        // MIGRACIÓN 2026-09-30: el despliegue ya NO lo hace Jenkins.
        //
        //   ANTES:  Jenkins hacía `kubectl apply` (kustomize) directo al cluster.
        //   AHORA:  Jenkins construye y publica imágenes al registry y escribe
        //           el tag en el overlay (Phase 6).
        //           Argo CD (homelab .22) vigila el repo Git y despliega:
        //             - develop → cluster homelab   (Application yambo-develop, auto-sync)
        //             - main    → cluster hetzner   (Application yambo-prod, sync manual)
        //
        // Definiciones declarativas de las Applications en: argocd/*.yaml
        // Ya no se necesitan las credenciales kubeconfig (yambo-kubeconfig-dev/-prod)
        // en el pipeline: Argo CD tiene sus propias credenciales de cluster.
        //
        // Este stage solo informa; el deploy real es asíncrono vía Argo CD.
        stage('Deploy (GitOps · Argo CD)') {
            when {
                allOf {
                    expression { env.IS_PR == 'false' }
                    expression { env.IS_MAIN == 'true' || env.IS_DEV == 'true' }
                    expression { env.DEPLOYABLE_CHANGED == 'true' }
                }
            }
            steps {
                script {
                    def app = (env.IS_MAIN == 'true') ? 'yambo-prod' : 'yambo-develop'
                    def syncMode = (env.IS_MAIN == 'true') ? 'MANUAL (revisar diff en la UI)' : 'AUTOMÁTICO'
                    echo "🚀 Imágenes publicadas en el registry (frontend: ${env.FRONTEND_TAG}, backend: ${env.BACKEND_TAG})."
                    echo "   Tag escrito en el overlay; lo despliega Argo CD → Application '${app}' (sync: ${syncMode})."
                    echo "   UI: https://argocd.cabrasky.net/applications/${app}"
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
