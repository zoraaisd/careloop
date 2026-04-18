# Meditracker Backend

Single backend API serving:

- `auth-frontend`
- `doctor-frontend`
- `admin-frontend`

## Structure

```text
src/
  app.ts
  server.ts
  clients/
  common/
  config/
  entities/
  modules/
  routes/
  types/
```

## Module mapping

- `modules/auth` -> shared auth for all clients
- `modules/patient` -> APIs used by `auth-frontend`
- `modules/doctor` -> APIs used by `doctor-frontend`
- `modules/admin` -> APIs used by `admin-frontend`

## Production readiness

- `helmet`
- rate limiting
- request logging
- centralized error handling
- JWT auth
- bcrypt password hashing
- graceful shutdown hooks
- environment-driven config
- TypeORM migrations

## Environment setup

- create `backend/.env` from `backend/.env.example`
- set a real `JWT_SECRET` before production
- use `FRONTEND_ORIGINS` to allow all three frontend apps
- set `DB_AUTO_INITIALIZE=true` when the app should connect to Postgres on boot
- set `DB_RUN_MIGRATIONS=true` only when you want startup to apply pending migrations automatically
- default admin bootstrap is enabled by default with `admin123@gmail.com / admin123`; change or disable it before production

## Migrations

- `npm run migration:show` to inspect pending migrations
- `npm run migration:run` to apply migrations
- `npm run migration:revert` to roll back the last migration

## Notes on cleanliness

- shared backend infrastructure lives in `common/`
- frontend-specific API areas live in `modules/admin`, `modules/doctor`, and `modules/patient`
- authentication stays centralized in `modules/auth`
