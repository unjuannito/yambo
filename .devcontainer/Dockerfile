# Fullstack development environment with newer GLIBC for PostgreSQL extension compatibility
FROM node:lts-bookworm

# Install Java 21 and Maven
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -sSL https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor > /usr/share/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-21-jdk maven

# Install PostgreSQL client and nginx
RUN apt-get install -y postgresql-client nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

RUN nginx -s reload

# Configure environment
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Create workspace
WORKDIR /workspace