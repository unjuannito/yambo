# Yambo Backend

Spring Boot backend application for the Yambo web platform.

## Requirements

- Java 21+
- Maven 3.8+
- MySQL/PostgreSQL database

## Configuration

The application can be configured through `src/main/resources/application.properties`. Key configuration options include:

- Database connection settings
- JWT token configuration
- Server port and context path

## Development

To run the application in development mode:

```bash
./mvnw spring-boot:run
```

## Testing

Run the test suite with:

```bash
./mvnw test
```

## Building

Create a production build:

```bash
./mvnw clean package
```

The built JAR will be in `target/web-0.0.1-SNAPSHOT.jar`

## Database Migrations

Database migrations are managed with Flyway and located in `src/main/resources/db/migration/`.