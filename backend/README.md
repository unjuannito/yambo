# Yambo Backend

Spring Boot backend application for the Yambo web platform.

## Requirements

- Java 21+
- Maven 3.8+
- PostgreSQL database

## Configuration

The application can be configured through `src/main/resources/application.properties`. Key configuration options include:

- Database connection settings
- JWT token configuration
- Server port and context path

### Profiles

| Profile | Purpose | SQL Logging |
|---------|---------|-------------|
| (default) | Production / CI | Off |
| `dev` | Local development | On |

Activate the dev profile: `SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run`

## Quick Commands

```bash
# Dev with hot reload (DevTools auto-restart on code change)
./mvnw spring-boot:run

# Dev with profile (enables SQL logging)
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run

# Fast parallel build (skip tests)
./mvnw -T 1C package -DskipTests

# Run tests
./mvnw test

# Full build
./mvnw clean package

# Docker Compose — development (hot reload with volume mounts)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Verify layered JAR (after build)
java -Djarmode=layertools -jar target/*.jar list
```

## Development

The backend includes **Spring Boot DevTools** for fast development iteration:

- **Auto-restart**: Automatically restarts when class files change (~2s)
- **LiveReload**: Browser auto-refresh on port 35729
- **Dev profile**: Activate with `SPRING_PROFILES_ACTIVE=dev` for SQL logging

To run in development mode:

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

### Docker

The Dockerfile uses **layered JARs** for fast rebuilds:

1. **Dependencies layer** — cached, only re-downloads when `pom.xml` changes
2. **Spring Boot loader layer** — rarely changes
3. **Snapshot dependencies layer** — changes with snapshot updates
4. **Application layer** — rebuilds on code changes (~30s)

```bash
docker build -t yambo-backend ./backend
```

## Database Migrations

Database migrations are managed with Liquibase and located in `src/main/resources/db/changelog/`.