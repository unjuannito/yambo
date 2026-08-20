// ============================================================================
// Jenkinsfile — yambo-web CI/CD pipeline (build host remoto)
// ============================================================================
// El agente (pod Jenkins) NO tiene docker/kubectl/mvn/node: TODA la ejecución
// pesada se hace por SSH al build host (credencial yambo-build-host), que
// tiene docker + kubectl (2 kubeconfigs) + kustomize + node + mvn + sonar.
//
// Estrategia por rama:
//   main     → producción (Hetzner, kubeconfig hetzner.yaml)
//   develop  → entorno local (k3s local) con subdominio público yambo-dev
//   PRs/otras→ preview en k3s local (label.<dominio>)
//
// TODAS las IPs/nombres/URLs vienen de credenciales Jenkins (nada hardcodeado):
//   yambo-registry (URL) · yambo-registry-user · yambo-registry-pass
//   yambo-build-host (IP) · yambo-sonar-url · yambo-sonar-token
//   notification-email
// ============================================================================

pipeline {
    agent any

    parameters {
        booleanParam(name: 'FORCE_PREVIEW_DEPLOY', defaultValue: false, description: 'Deploy esta rama como preview (salta el guard de prod).')
        string(name: 'DEPLOY_ID', defaultValue: '', description: 'Slug del preview (auto desde la rama si vacío).')
        booleanParam(name: 'FORCE_DB_SEED', defaultValue: false, description: 'Re-seed de la BD del preview.')
        booleanParam(name: 'FORCE_PROD_DEPLOY', defaultValue: false, description: 'Re-deploy de imágenes existentes a producción (main).')
        booleanParam(name: 'FORCE_REBUILD', defaultValue: false, description: 'Rebuild completo aunque no haya cambios.')
    }

    environment {
        REGISTRY_URL     = credentials('yambo-registry')
        REGISTRY_USER    = credentials('yambo-registry-user')
        REGISTRY_PASS    = credentials('yambo-registry-pass')
        // yambo-build-host incluye el usuario: "root@192.168.1.21"
        BUILD_HOST       = credentials('yambo-build-host')
        SONAR_URL        = credentials('yambo-sonar-url')
        SONAR_TOKEN      = credentials('yambo-sonar-token')
        NOTIFICATION_EMAIL = credentials('notification-email')

        // Nombres de servicios (parametrizados, no IPs sueltas)
        REGISTRY_NAME    = 'yambo-registry'
        SONAR_SERVER     = 'sonar.cabrasky.net'
        KUBECONFIG_LOCAL = '/root/.kube/config'
        KUBECONFIG_PROD  = '/root/.kube/hetzner.yaml'

        // Hosts del registry según entorno (definidos por credenciales/ambiente)
        // Prod (Hetzner) accede por la ruta NetBird del registry en .21
        REGISTRY_HOST_PROD = credentials('yambo-registry-host-prod')
        REGISTRY_HOST_DEV  = credentials('yambo-registry-host-dev')

        // Dominios (parametrizados)
        APP_DOMAIN_PROD  = 'yambo.cabrasky.net'
        APP_DOMAIN_DEV   = 'yambo-dev.cabrasky.net'

        // Keys de Sonar
        SONAR_KEY_BE = 'yambo-backend'
        SONAR_KEY_FE = 'yambo-frontend'
    }

    stages {

        // ═══════════════════════════════════════════════════════════════════
        // Phase 1 — Setup y clasificación
        // ═══════════════════════════════════════════════════════════════════

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Classify & Tag') {
            steps {
                script {
                    env.IS_PR     = env.CHANGE_ID ? 'true' : 'false'
                    env.IS_CUSTOM = params.FORCE_PREVIEW_DEPLOY ? 'true' : 'false'

                    env.FRONTEND_VER = sh(script: "grep '\"version\"' frontend/package.json | head -1 | sed 's/.*\"version\": \"\\(.*\\)\".*/\\1/'", returnStdout: true).trim()
                    env.BACKEND_VER  = sh(script: "grep '<version>' backend/pom.xml | head -1 | sed 's/.*<version>\\(.*\\)<\\/version>.*/\\1/'", returnStdout: true).trim()

                    if (env.IS_PR == 'true') {
                        env.FRONTEND_TAG = "pr-${env.CHANGE_ID}"
                        env.BACKEND_TAG  = "pr-${env.CHANGE_ID}"
                        env.EFFECTIVE_ID = env.CHANGE_ID
                    } else if (env.IS_CUSTOM == 'true') {
                        def slug = (params.DEPLOY_ID?.trim() ?: env.BRANCH_NAME).toLowerCase().replaceAll('[^a-z0-9]+', '-').replaceAll('^-+|-+$', '').take(30)
                        env.EFFECTIVE_ID  = slug
                        env.FRONTEND_TAG  = "branch-${slug}"
                        env.BACKEND_TAG   = "branch-${slug}"
                    } else if (env.BRANCH_NAME == 'main') {
                        env.FRONTEND_TAG = env.FRONTEND_VER
                        env.BACKEND_TAG  = env.BACKEND_VER
                    } else {
                        def slug = env.BRANCH_NAME.toLowerCase().replaceAll('[^a-z0-9]+', '-').replaceAll('^-+|-+$', '').take(45)
                        env.EFFECTIVE_ID  = slug
                        env.FRONTEND_TAG  = "branch-${slug}"
                        env.BACKEND_TAG   = "branch-${slug}"
                    }

                    // Detectar cambios
                    def baseRef = (env.BRANCH_NAME == 'main' && env.IS_PR == 'false' && env.IS_CUSTOM == 'false') ? 'HEAD~1' : 'FETCH_HEAD'
                    if (env.IS_PR == 'true') {
                        sh "git fetch origin ${env.CHANGE_TARGET}"
                    } else if (env.IS_CUSTOM == 'true') {
                        sh "git fetch origin main"
                    }
                    def changedFiles = sh(script: "git diff --name-only ${baseRef}...HEAD || true", returnStdout: true).trim().split('\n').findAll { it?.trim() }
                    if (changedFiles.isEmpty()) {
                        echo "WARNING: diff vacío (shallow?) — fuerza build completo"
                        env.FE_CHANGED = 'true'; env.BE_CHANGED = 'true'; env.INFRA_CHANGED = 'false'
                        env.DEPLOYABLE_CHANGED = 'true'
                        env.SKIP_ALL = 'false'
                    } else {
                        def fe = false, be = false, inf = false, docs = true
                        for (f in changedFiles) {
                            if (f.startsWith('frontend/')) { fe = true; docs = false }
                            else if (f.startsWith('backend/')) { be = true; docs = false }
                            else if (f.startsWith('k8s/') || f.startsWith('scripts/') || f.startsWith('.github/') ||
                                     f == 'docker-compose.yml' || f == 'docker-compose.dev.yml' || f == 'Jenkinsfile') { inf = true; docs = false }
                            else if (f.startsWith('docs/') || f.endsWith('.md')) { }
                            else { docs = false }
                        }
                        if (params.FORCE_REBUILD) { fe = true; be = true; inf = true; docs = false }
                        if (params.FORCE_PROD_DEPLOY) { inf = true; docs = false }
                        env.FE_CHANGED = fe ? 'true' : 'false'
                        env.BE_CHANGED = be ? 'true' : 'false'
                        env.INFRA_CHANGED = inf ? 'true' : 'false'
                        env.DEPLOYABLE_CHANGED = (fe || be || inf || env.IS_CUSTOM == 'true' || params.FORCE_PROD_DEPLOY) ? 'true' : 'false'
                        env.SKIP_ALL = (docs && env.DEPLOYABLE_CHANGED == 'false') ? 'true' : 'false'
                    }
                    echo "FE=${env.FE_CHANGED} BE=${env.BE_CHANGED} INFRA=${env.INFRA_CHANGED} SKIP=${env.SKIP_ALL} tags=${env.FRONTEND_TAG}/${env.BACKEND_TAG}"
                }
            }
        }

        stage('Sync to Build Host') {
            steps {
                script {
                    // Enviar el repo (sin node_modules/.git) al build host
                    sh """
                        tar czf - --exclude=.git --exclude=node_modules --exclude=target --exclude=dist . | \
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=no ${BUILD_HOST} \
                          'rm -rf /srv/ci/yambo && mkdir -p /srv/ci/yambo && tar xzf - -C /srv/ci/yambo'
                    """
                }
            }
        }

        stage('Early Skip') {
            when { expression { env.SKIP_ALL == 'true' } }
            steps { echo "Solo docs — pipeline completo sin build ni deploy." }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 2 — Test + Build + Sonar (en el build host)
        // ═══════════════════════════════════════════════════════════════════

        stage('Build & Sonar') {
            when {
                expression { env.SKIP_ALL != 'true' && (env.FE_CHANGED == 'true' || env.BE_CHANGED == 'true' || params.FORCE_PROD_DEPLOY) }
            }
            steps {
                script {
                    sh """
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=no ${BUILD_HOST} \
                          'cd /srv/ci/yambo && \
                           REGISTRY_URL="${REGISTRY_URL}" REGISTRY_USER="${REGISTRY_USER}" REGISTRY_PASS="${REGISTRY_PASS}" \
                           SONAR_URL="${SONAR_URL}" SONAR_TOKEN="${SONAR_TOKEN}" \
                           SONAR_PROJECT_KEY_BE="${SONAR_KEY_BE}" SONAR_PROJECT_KEY_FE="${SONAR_KEY_FE}" \
                           FRONTEND_TAG="${FRONTEND_TAG}" BACKEND_TAG="${BACKEND_TAG}" \
                           FE_CHANGED="${FE_CHANGED}" BE_CHANGED="${BE_CHANGED}" \
                           BRANCH_NAME="${BRANCH_NAME}" IS_PR="${IS_PR}" \
                           CHANGE_ID="${CHANGE_ID}" CHANGE_BRANCH="${CHANGE_BRANCH}" CHANGE_TARGET="${CHANGE_TARGET}" \
                           bash scripts/ci-build.sh'
                    """
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // Phase 3 — Deploy
        // ═══════════════════════════════════════════════════════════════════

        stage('Deploy') {
            when {
                expression { env.SKIP_ALL != 'true' && env.DEPLOYABLE_CHANGED == 'true' }
            }
            steps {
                script {
                    // Decidir target por rama
                    if (env.IS_PR == 'true') {
                        env.DEPLOY_TARGET = 'preview'
                        env.NAMESPACE     = "yambo-pr-${env.CHANGE_ID}"
                        env.DEPLOY_LABEL  = "pr-${env.CHANGE_ID}"
                        env.KUBECONFIG    = "${KUBECONFIG_LOCAL}"
                        env.APP_DOMAIN    = "${APP_DOMAIN_DEV}"
                        env.REGISTRY_HOST = "${REGISTRY_HOST_DEV}"
                    } else if (env.IS_CUSTOM == 'true' || env.BRANCH_NAME != 'main') {
                        // develop u otras ramas → entorno local público
                        env.DEPLOY_TARGET = 'preview'
                        env.NAMESPACE     = "yambo-${env.EFFECTIVE_ID}"
                        env.DEPLOY_LABEL  = env.BRANCH_NAME == 'develop' ? 'develop' : env.EFFECTIVE_ID
                        env.KUBECONFIG    = "${KUBECONFIG_LOCAL}"
                        env.APP_DOMAIN    = "${APP_DOMAIN_DEV}"
                        env.REGISTRY_HOST = "${REGISTRY_HOST_DEV}"
                    } else {
                        // main → producción en Hetzner
                        env.DEPLOY_TARGET = 'production'
                        env.NAMESPACE     = 'yambo'
                        env.DEPLOY_LABEL  = ''
                        env.KUBECONFIG    = "${KUBECONFIG_PROD}"
                        env.APP_DOMAIN    = "${APP_DOMAIN_PROD}"
                        env.REGISTRY_HOST = "${REGISTRY_HOST_PROD}"
                    }
                    echo "Deploy target: ${env.DEPLOY_TARGET} → ns ${env.NAMESPACE} (${env.APP_DOMAIN}) registry=${env.REGISTRY_HOST}"

                    sh """
                        ssh -o BatchMode=yes -o StrictHostKeyChecking=no ${BUILD_HOST} \
                          'cd /srv/ci/yambo && \
                           REGISTRY_URL="${REGISTRY_URL}" REGISTRY_HOST="${REGISTRY_HOST}" \
                           FRONTEND_TAG="${FRONTEND_TAG}" BACKEND_TAG="${BACKEND_TAG}" \
                           DEPLOY_TARGET="${DEPLOY_TARGET}" NAMESPACE="${NAMESPACE}" \
                           DEPLOY_LABEL="${DEPLOY_LABEL}" APP_DOMAIN="${APP_DOMAIN}" \
                           KUBECONFIG="${KUBECONFIG}" FORCE_SECRETS="${FORCE_PROD_DEPLOY}" \
                           bash scripts/ci-deploy.sh'
                    """
                }
            }
        }
    }

    post {
        success {
            script {
                def url = env.DEPLOY_TARGET == 'production'
                    ? "https://${APP_DOMAIN_PROD}"
                    : "https://${env.DEPLOY_LABEL}.${env.APP_DOMAIN_DEV}"
                echo "✅ Deploy OK: ${url}"
                currentBuild.description = "<a href='${url}'>${url}</a>"
            }
        }
        failure {
            echo "❌ Pipeline falló — revisar logs."
        }
    }
}
