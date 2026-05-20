# My Nest API

Baseline backend NestJS dengan struktur modular, JWT auth, Prisma, Swagger, validation global, dan response standard yang mengikuti `agent.md`.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
```

## Environment

Variable yang dipakai saat ini.

Catatan:
- `DATABASE_URL`, `JWT_SECRET`, dan `JWT_REFRESH_SECRET` wajib diisi untuk mode `development` dan `production`.
- Default longgar hanya disediakan saat `NODE_ENV=test` agar unit test dan e2e test bisa jalan tanpa konfigurasi manual tambahan.
- Gunakan secret JWT yang panjang dan berbeda antara access token dan refresh token.

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_nest?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL_SECONDS=60
QUEUE_PREFIX=my-nest
JWT_SECRET=change-this-development-secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=change-this-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
SEED_ADMIN_NAME=Administrator
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-this-admin-password
```

## Prisma

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:seed
```

Migration awal sudah tersedia di `prisma/migrations/0001_init/migration.sql`.

Seed akan membuat atau memperbarui satu akun admin awal berdasarkan `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, dan `SEED_ADMIN_PASSWORD`.

## Shared Infrastructure

- `shared/cache/` untuk cache abstraction berbasis Nest cache manager
- `shared/events/` untuk domain events berbasis event emitter
- `shared/queue/` untuk queue baseline yang siap dikonfigurasi ke Redis

## Run App

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

Swagger tersedia di `http://localhost:3000/api/docs`.

## Current Endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/users` - admin only
- `GET /api/v1/users` - admin only
- `GET /api/v1/users/:id` - admin only

## Security Notes

- Endpoint register publik tidak menerima `role` dari client.
- Pembuatan managed user dengan `role` hanya boleh lewat endpoint admin `POST /api/v1/users`.
- Query `sortBy` untuk listing users dibatasi ke: `createdAt`, `updatedAt`, `name`, `email`.

## Health Check Notes

- `GET /api/v1/health` sekarang mengecek status aplikasi, database, dan Redis.
- Jika `DATABASE_URL` atau `REDIS_HOST` tidak dikonfigurasi, dependency terkait akan ditandai `skipped`.
- Jika dependency dikonfigurasi tetapi tidak dapat dihubungi, status aplikasi akan menjadi `degraded`.

## Testing

```bash
npm run test
npm run test:e2e
npm run lint
npm run build
```
