# ── Étapes ─────────────────────────────────────────────────────────────────────
# build : maven:3.9-eclipse-temurin-21, mvn clean package (test exclu : CI)
# runtime : eclipse-temurin:21-jre, jar slim, user non-root (uid 1000)
# Usage : docker build -f infra/docker/Dockerfile.java services/ledger-service

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# 1. Dépendances (cache de couches)
COPY services/ledger-service/pom.xml ./
RUN mvn -q -B dependency:go-offline -DskipTests
# 2. Sources + build
COPY services/ledger-service/src ./src
RUN mvn -q -B clean package -DskipTests

FROM eclipse-temurin:21-jre AS runtime
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
WORKDIR /app
RUN groupadd -g 1000 goursi && useradd -u 1000 -g goursi -m goursi
COPY --from=build /app/target/ledger-service-*.jar /app/ledger-service.jar
USER goursi
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3010/actuator/health || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/ledger-service.jar"]
