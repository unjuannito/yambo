# syntax=docker/dockerfile:1
# Requiere BuildKit (por defecto en Docker 23+ y en Docker Desktop; en Jenkins se
# activa con DOCKER_BUILDKIT=1).

# Stage 1: Cache dependencies
# ~/.m2 es una caché de BuildKit que persiste entre builds: aunque pom.xml cambie
# (cada PR sube la versión) solo se descarga lo que falte.
FROM eclipse-temurin:21-jdk-alpine AS deps
WORKDIR /workspace/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x ./mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw dependency:go-offline -B

# Stage 2: Build and extract layers
FROM deps AS build
COPY src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw package -DskipTests -B
RUN java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# Stage 3: Runtime (layered for fast rebuilds)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /workspace/app
VOLUME /tmp

# libvips resizes uploaded images to WebP on demand (ImageVariantService)
RUN apk add --no-cache vips-tools

# Create a non-root user for the runtime process
RUN addgroup -S app && adduser -S app -G app

# Create upload directory with correct ownership before switching to non-root
RUN mkdir -p /data/uploads && chown -R app:app /data/uploads

COPY --from=build /workspace/app/target/extracted/dependencies/ ./
COPY --from=build /workspace/app/target/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/app/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/app/target/extracted/application/ ./

ENV UPLOAD_DIR=/data/uploads
ENV TZ=Europe/Madrid

# Run as non-root
USER app

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD wget -qO- http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
