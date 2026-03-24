# Stage 1: Cache dependencies (only re-runs when pom.xml changes)
FROM eclipse-temurin:21-jdk-alpine AS deps
WORKDIR /workspace/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline -B

# Stage 2: Build and extract layers
FROM deps AS build
COPY src src
RUN ./mvnw package -DskipTests -B
RUN java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

# Stage 3: Runtime (layered for fast rebuilds)
FROM eclipse-temurin:21-jre-alpine
VOLUME /tmp
RUN mkdir -p /data/uploads

COPY --from=build /workspace/app/target/extracted/dependencies/ ./
COPY --from=build /workspace/app/target/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/app/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/app/target/extracted/application/ ./

ENV UPLOAD_DIR=/data/uploads
ENV TZ=Europe/Madrid
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
