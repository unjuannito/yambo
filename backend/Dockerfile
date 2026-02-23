FROM eclipse-temurin:21-jdk-alpine as build
WORKDIR /workspace/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN chmod +x ./mvnw
RUN ./mvnw install -DskipTests

FROM eclipse-temurin:21-jre-alpine
VOLUME /tmp
RUN mkdir -p /data/uploads
COPY --from=build /workspace/app/target/*.jar app.jar
ENV UPLOAD_DIR=/data/uploads
ENTRYPOINT ["java","-jar","/app.jar"]
