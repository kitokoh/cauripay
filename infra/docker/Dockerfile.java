# =============================================================================
# Dockerfile.java — build multi-stage pour un service Java (Spring Boot),
# image d'exécution JRE 21 slim (GOURSI-002b).
# Usage : docker build -f infra/docker/Dockerfile.java \
#         --build-arg SERVICE_DIR=services/ledger .
# =============================================================================

ARG MAVEN_IMAGE=maven:3.9-eclipse-temurin-21
ARG RUNTIME_IMAGE=eclipse-temurin:21-jre-jammy

# ---- Stage 1 : build Maven -------------------------------------------------
FROM ${MAVEN_IMAGE} AS build
ARG SERVICE_DIR
WORKDIR /repo

COPY ${SERVICE_DIR}/pom.xml ${SERVICE_DIR}/
RUN cd ${SERVICE_DIR} && mvn -q -B dependency:go-offline

COPY ${SERVICE_DIR} ${SERVICE_DIR}
RUN cd ${SERVICE_DIR} && mvn -q -B -DskipTests package

# ---- Stage 2 : runtime JRE 21 slim -----------------------------------------
FROM ${RUNTIME_IMAGE} AS runtime
ARG SERVICE_DIR
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

COPY --from=build /repo/${SERVICE_DIR}/target/*.jar /app/app.jar

RUN useradd -r -u 10001 appuser
USER appuser
EXPOSE 8100
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
