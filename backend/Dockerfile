FROM gradle:8.10.2-jdk21-alpine AS build

WORKDIR /workspace
COPY . .
RUN gradle clean bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar

EXPOSE 8081

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD wget -qO- http://localhost:8081/api/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
