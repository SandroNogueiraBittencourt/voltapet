# VoltaPet-backend/Dockerfile

# ---- Stage 1: build ----
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Cache de dependências: copia só o pom.xml primeiro
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# ---- Stage 2: runtime ----
FROM eclipse-temurin:17-jre-alpine AS runtime
WORKDIR /app

# Usuário não-root
RUN addgroup -S voltapet && adduser -S voltapet -G voltapet
USER voltapet

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
