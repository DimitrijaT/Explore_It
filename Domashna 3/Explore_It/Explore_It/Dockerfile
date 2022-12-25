FROM maven:3.8.1-jdk-11-openj9 as build

COPY pom.xml .
COPY src ./src

RUN mvn package -DskipTests

FROM openjdk:11-jdk-slim-buster

COPY --from=build target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]