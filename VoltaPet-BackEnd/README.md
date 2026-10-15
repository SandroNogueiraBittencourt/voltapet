# VoltaPet — Backend

API REST em Java 17 + Spring Boot 3.3.4, PostgreSQL 15 + PostGIS, Flyway e autenticação JWT. Este pacote pode ser iniciado sem o frontend.

## Execução

Requisitos: Docker Engine e Docker Compose v2.

```bash
cd VoltaPet-BackEnd
cp .env.example .env
# Abra .env e preencha DB_PASSWORD, S3_SECRET_KEY e JWT_SECRET.
# Gere valores com: openssl rand -hex 32 e openssl rand -base64 24
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

- API: http://localhost:8080/api/v1/pets
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- Healthcheck: http://localhost:8080/actuator/health
- MinIO Console: http://localhost:9001

As portas estão limitadas ao localhost. Nunca envie `.env` para um repositório remoto.

## Endpoints do MVP

| Método | Endpoint | Acesso |
|---|---|---|
| POST | `/api/v1/auth/register` | Público |
| POST | `/api/v1/auth/login` | Público |
| GET | `/api/v1/pets` | Público |
| GET | `/api/v1/pets/{id}` | Público |
| POST | `/api/v1/pets` | JWT |
| POST | `/api/v1/pets/{id}/reunite` | JWT (autor) |

## Testes

```bash
./mvnw test
```

Os testes e a execução completa com Docker **não foram realizados no ambiente de preparação** porque Maven e Docker não estavam instalados. O pacote contém os fontes, mas não um JAR pré-compilado.

## Limitações desta versão

Ainda não foram implementados os fluxos de upload no MinIO, notificações, agendamentos ou busca geoespacial por raio. O PostgreSQL/PostGIS e o MinIO estão preparados no Compose, mas o armazenamento de imagens ainda não é utilizado pelas rotas do MVP.
