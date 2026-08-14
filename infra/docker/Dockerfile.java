# Dockerfile standardisé pour ledger-service (Spring Boot 3.2 / Java 21)
# Build : maven:3.9-eclipse-temurin-21 → Runtime : eclipse-temurin:21-jre (non-root)
#
# Usage :
#   docker build -f ../../infra/docker/Dockerfile.java -t cauripay/ledger-service services/ledger-service

# ---------- Étape de build ----------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache de couches : dépendances d'abord
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Sources + build (skip tests : tests exécutés en CI)
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---------- Étape runtime ----------
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app

# Utilisateur non-root
RUN groupadd -r app -g 1000 && useradd -r -g app -u 1000 app

COPY --from=build --chown=app:app /build/target/*.jar app.jar

USER app

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:${LEDGER_PORT:-8081}/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
