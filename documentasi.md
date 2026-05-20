# Dokumentasi Project

Dokumen ini menjelaskan struktur folder project, fungsi tiap bagian, dan flow utama aplikasi berdasarkan implementasi yang ada saat ini.

## Gambaran Umum

Project ini adalah backend NestJS dengan pendekatan modular. Struktur utamanya mengikuti pola:

`Controller -> Service -> Use Case/Repository -> Database`

Komponen pendukung global yang juga aktif:

- validasi request global
- versioning API
- response interceptor
- exception filter
- Swagger
- JWT auth
- role guard
- Prisma
- event emitter
- cache baseline
- queue baseline

## Struktur Root

### `src/`

Folder utama source code aplikasi.

### `prisma/`

Folder schema dan migration database Prisma.

### `test/`

Folder e2e test level aplikasi.

### `.env.example`

Template environment variable yang perlu diisi developer.

### `README.md`

Ringkasan setup dan cara menjalankan project.

## Struktur `src/`

## `src/main.ts`

Entry point aplikasi.

Tugasnya:

- membuat instance Nest app
- mengambil `ConfigService`
- memasang `helmet`
- memanggil `configureApp()`
- menjalankan server pada port yang ditentukan
- menulis log startup

## `src/app.module.ts`

Root module aplikasi.

Tugasnya:

- load semua config global
- validasi env dengan Joi
- mendaftarkan module utama project

Module yang saat ini di-import:

- `DatabaseModule`
- `CacheModule`
- `EventsModule`
- `QueueModule`
- `HealthModule`
- `UsersModule`
- `AuthModule`

## `src/app.setup.ts`

Tempat konfigurasi global aplikasi.

Tugasnya:

- set global prefix `api`
- enable versioning URI dengan default `v1`
- enable CORS
- pasang global `ValidationPipe`
- pasang `GlobalExceptionFilter`
- pasang `ResponseInterceptor`
- setup Swagger di `api/docs`

## `src/common/`

Berisi komponen umum lintas fitur.

### `src/common/dto/pagination-query.dto.ts`

DTO query reusable untuk endpoint list.

Field yang didukung:

- `page`
- `limit`
- `search`
- `sortBy`
- `sortOrder`

### `src/common/enums/role.enum.ts`

Enum role user.

Saat ini ada:

- `ADMIN`
- `USER`

### `src/common/interfaces/authenticated-user.interface.ts`

Kontrak object user hasil autentikasi JWT yang ditempel ke request.

### `src/common/interceptors/response.interceptor.ts`

Interceptor global untuk membungkus response ke format konsisten.

Format umum:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Kalau ada pagination, interceptor tetap mempertahankan `meta`.

### `src/common/filters/global-exception.filter.ts`

Filter global untuk merapikan response error.

Tugasnya:

- tentukan status code
- ambil pesan error yang aman
- kirim response error seragam
- sertakan timestamp dan path

## `src/config/`

Berisi config terstruktur yang di-load oleh `ConfigModule`.

### `src/config/app.config.ts`

Config umum aplikasi:

- `port`
- `frontendUrl`
- `nodeEnv`

### `src/config/database.config.ts`

Config database:

- `DATABASE_URL`

### `src/config/jwt.config.ts`

Config JWT:

- `secret`
- `expiresIn`
- `refreshSecret`
- `refreshExpiresIn`

### `src/config/redis.config.ts`

Config Redis dan infrastruktur terkait:

- `host`
- `port`
- `password`
- `db`
- `cacheTtlSeconds`
- `queuePrefix`

### `src/config/env.validation.ts`

Schema validasi env dengan Joi.

Fungsinya supaya aplikasi fail fast saat env penting tidak valid.

## `src/database/`

Lapisan akses Prisma secara global.

### `src/database/prisma.module.ts`

Module global yang mengekspor `PrismaService`.

### `src/database/prisma.service.ts`

Wrapper `PrismaClient`.

Tugasnya:

- connect ke database saat module init
- disconnect saat app shutdown
- log warning kalau `DATABASE_URL` belum diisi

## `src/modules/`

Berisi fitur bisnis aplikasi.

## `src/modules/health/`

Module sederhana untuk health check.

### File penting

- `health.module.ts`: deklarasi module
- `health.controller.ts`: endpoint `/api/v1/health`
- `health.service.ts`: logic health status
- `health.controller.spec.ts`: unit test health

### Fungsi

Memastikan aplikasi punya endpoint ringan untuk mengecek apakah service hidup.

## `src/modules/users/`

Module domain user.

### `dto/`

- `create-user.dto.ts`: validasi input create user
- `update-user.dto.ts`: DTO update berbasis partial create DTO

### `entities/`

- `user.entity.ts`: representasi entity user tingkat aplikasi

### `interfaces/`

- `users-repository.interface.ts`: kontrak repository user

Interface penting di file ini:

- `UserRecord`: data user publik
- `UserAuthRecord`: data user auth, termasuk `passwordHash` dan refresh token fields
- `UsersRepositoryInterface`: kontrak operasi repository

### `repositories/users.repository.ts`

Implementasi repository user berbasis Prisma.

Tugasnya:

- create user
- list user dengan pagination/search/sort
- ambil user by email untuk auth
- ambil user auth by id untuk refresh token
- update refresh token hash
- hanya select field yang memang diperlukan

Catatan penting:

- endpoint publik tidak mengambil `passwordHash`
- soft delete dasar sudah disiapkan dengan `deletedAt`

### `use-cases/create-user.use-case.ts`

Use case khusus create user.

Tugasnya:

- cek email duplicate
- hash password
- panggil repository create

### `users.service.ts`

Service utama module user.

Tugasnya:

- delegasi create ke use case
- fetch list user dengan metadata pagination
- fetch user by id
- expose `findByEmail()` untuk auth
- expose `findAuthById()` untuk refresh token
- expose `updateRefreshToken()` untuk simpan hash refresh token

### `users.controller.ts`

Controller HTTP untuk route user.

Endpoint saat ini:

- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`

Proteksi:

- list dan detail user dilindungi `JwtAuthGuard + RolesGuard`
- hanya role `ADMIN` yang boleh akses list/detail

### `users.module.ts`

Wiring dependency module user.

Mendaftarkan:

- controller
- service
- use case
- repository
- token DI `USERS_REPOSITORY`

## `src/modules/auth/`

Module autentikasi dan otorisasi.

### `dto/`

- `login.dto.ts`: validasi login
- `register.dto.ts`: validasi register
- `refresh-token.dto.ts`: validasi refresh token

### `decorators/`

- `current-user.decorator.ts`: ambil user dari request
- `roles.decorator.ts`: set metadata role pada route

### `guards/`

- `jwt-auth.guard.ts`: memastikan request punya JWT valid
- `roles.guard.ts`: memastikan role user sesuai metadata route

### `strategies/jwt.strategy.ts`

Strategi Passport JWT untuk membaca bearer token dan membentuk object user auth.

### `auth.service.ts`

Pusat business logic auth.

Tugasnya:

- register
- login
- issue access token
- issue refresh token
- verify refresh token
- hash refresh token sebelum disimpan
- rotate refresh token
- emit event `user.registered`

### `auth.controller.ts`

Controller HTTP auth.

Endpoint saat ini:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

Proteksi tambahan:

- route auth memakai `ThrottlerGuard`
- rate limit berbeda untuk register/login/refresh

### `auth.module.ts`

Wiring auth module.

Tugasnya:

- import `UsersModule`
- setup `PassportModule`
- setup `JwtModule`
- setup `ThrottlerModule`
- daftarkan `AuthService`, `JwtStrategy`, `RolesGuard`

## `src/shared/`

Berisi infrastruktur reusable di luar domain bisnis.

## `src/shared/cache/`

Baseline cache abstraction.

### `cache.module.ts`

Mendaftarkan Nest cache manager secara global.

### `cache.service.ts`

Wrapper sederhana untuk operasi cache:

- `get`
- `set`
- `del`

Saat ini cache belum dipakai oleh feature tertentu, tapi fondasinya sudah siap.

## `src/shared/events/`

Baseline domain event.

### `constants/events.constants.ts`

Menentukan nama event domain secara terpusat.

Saat ini ada:

- `user.registered`

### `interfaces/user-registered-event.interface.ts`

Kontrak payload event saat user register.

### `listeners/user-registered.listener.ts`

Listener untuk event `user.registered`.

Saat ini fungsinya menulis log bahwa event diterima.

### `events.module.ts`

Setup global `EventEmitterModule` dan daftarkan listener.

## `src/shared/queue/`

Baseline queue processing.

### `queue.module.ts`

Mendaftarkan `QueueService`.

### `queue.service.ts`

Service utilitas untuk queue.

Tugasnya:

- cek apakah Redis queue aktif
- sediakan opsi koneksi Redis
- sediakan prefix queue

Saat ini queue worker/job belum dipakai, tapi fondasi untuk background job sudah disiapkan.

## Struktur `prisma/`

## `prisma/schema.prisma`

Schema database Prisma.

Model saat ini:

- `User`

Field penting pada `User`:

- `id`
- `name`
- `email`
- `passwordHash`
- `refreshTokenHash`
- `refreshTokenExpiresAt`
- `role`
- `createdAt`
- `updatedAt`
- `deletedAt`

## `prisma/migrations/`

Berisi histori perubahan schema database.

### `0001_init`

Membuat tabel user awal.

### `0002_add_deleted_at_to_users`

Menambahkan field soft delete `deletedAt`.

### `0003_add_refresh_token_fields_to_users`

Menambahkan field refresh token hash dan expiry.

## Struktur `test/`

## `test/app.e2e-spec.ts`

E2E test aplikasi dasar.

Saat ini fokus pada endpoint health.

## `test/jest-e2e.json`

Konfigurasi Jest untuk e2e test.

## Flow Aplikasi

## 1. Flow Bootstrap Aplikasi

Urutan saat app start:

1. `main.ts` membuat Nest app dari `AppModule`
2. `ConfigModule` load semua config dan validasi env
3. `helmet` dipasang
4. `configureApp()` memasang prefix, versioning, validation, filter, interceptor, Swagger
5. `PrismaService` mencoba konek ke database jika `DATABASE_URL` tersedia
6. app listen pada port yang ditentukan

## 2. Flow Request Umum

Flow umum request HTTP:

1. Request masuk ke route controller
2. Guard dijalankan jika ada
3. DTO request divalidasi oleh global `ValidationPipe`
4. Controller memanggil service
5. Service menjalankan business logic atau use case
6. Repository akses database jika diperlukan
7. Hasil kembali ke controller
8. `ResponseInterceptor` membungkus response sukses
9. Kalau ada error, `GlobalExceptionFilter` merapikan response error

## 3. Flow Register User

Route:

`POST /api/v1/auth/register`

Urutannya:

1. request masuk ke `AuthController.register()`
2. `RegisterDto` divalidasi
3. `AuthService.register()` dipanggil
4. service cek apakah email sudah ada via `UsersService.findByEmail()`
5. jika email sudah ada, lempar `ConflictException`
6. jika belum ada, service panggil `UsersService.create()`
7. `UsersService.create()` delegasi ke `CreateUserUseCase`
8. use case hash password lalu memanggil `UsersRepository.create()`
9. repository simpan user ke database lewat Prisma
10. `AuthService` membuat access token dan refresh token
11. refresh token di-hash lalu disimpan ke user record
12. event `user.registered` di-emit
13. listener event menerima event dan menulis log
14. response dikembalikan ke client melalui interceptor

Output utama:

- user publik
- access token
- refresh token

## 4. Flow Login

Route:

`POST /api/v1/auth/login`

Urutannya:

1. request masuk ke `AuthController.login()`
2. `LoginDto` divalidasi
3. `AuthService.login()` dipanggil
4. service ambil user auth via `UsersService.findByEmail()`
5. password plain dibandingkan dengan `passwordHash` menggunakan bcrypt
6. jika gagal, lempar `UnauthorizedException`
7. jika sukses, service generate access token dan refresh token baru
8. refresh token baru di-hash lalu disimpan ke database
9. response sukses dikembalikan

## 5. Flow Refresh Token

Route:

`POST /api/v1/auth/refresh`

Urutannya:

1. request masuk ke `AuthController.refresh()`
2. `RefreshTokenDto` divalidasi
3. `AuthService.refreshToken()` dipanggil
4. refresh token diverifikasi dengan `jwt.refreshSecret`
5. payload hasil verify dipakai untuk mencari user via `findAuthById()`
6. dicek apakah user punya `refreshTokenHash`
7. dicek apakah `refreshTokenExpiresAt` masih valid
8. token plain dibandingkan dengan hash yang tersimpan
9. jika valid, token baru dibuat
10. refresh token lama di-rotate dengan hash baru
11. response sukses dikirim

## 6. Flow `GET /auth/me`

Route:

`GET /api/v1/auth/me`

Urutannya:

1. request membawa bearer token
2. `JwtAuthGuard` memanggil `JwtStrategy`
3. `JwtStrategy` verify token access
4. payload user ditempel ke request
5. `CurrentUser` decorator mengambil user dari request
6. controller mengembalikan user auth saat ini

## 7. Flow Create User Langsung dari Users Module

Route:

`POST /api/v1/users`

Urutannya:

1. request masuk ke `UsersController.create()`
2. `CreateUserDto` divalidasi
3. `UsersService.create()` dipanggil
4. service delegasi ke `CreateUserUseCase`
5. use case cek duplicate email
6. password di-hash
7. repository menyimpan user ke database
8. service mengembalikan data user publik tanpa `passwordHash`

## 8. Flow List Users

Route:

`GET /api/v1/users`

Urutannya:

1. request masuk ke `UsersController.findAll()`
2. `JwtAuthGuard` memastikan user login
3. `RolesGuard` memastikan user punya role `ADMIN`
4. query pagination divalidasi oleh `PaginationQueryDto`
5. `UsersService.findAll()` dipanggil
6. service hitung `skip/take`
7. repository menjalankan query Prisma dengan:
   - filter `deletedAt: null`
   - search pada `name/email`
   - sort dinamis
   - count total row
8. service membentuk `meta` pagination
9. interceptor membungkus response

## 9. Flow Role Authorization

Flow proteksi role:

1. route diberi decorator `@Roles(Role.ADMIN)`
2. `RolesGuard` membaca metadata role dari route
3. `JwtAuthGuard` lebih dulu memastikan user sudah terautentikasi
4. `RolesGuard` membandingkan role request user dengan role yang diwajibkan
5. jika tidak cocok, lempar `ForbiddenException`

## 10. Flow Error Handling

Saat ada exception:

1. service/guard/controller melempar exception NestJS
2. `GlobalExceptionFilter` menangkap exception
3. filter menentukan status code dan message
4. response error dikirim dalam format seragam

Contoh bentuk error:

```json
{
  "success": false,
  "message": "Invalid email or password",
  "timestamp": "2026-05-19T00:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

## 11. Flow Event Saat User Register

Saat user baru berhasil register:

1. `AuthService.register()` emit event `user.registered`
2. payload event berisi `userId`, `email`, dan `role`
3. `UserRegisteredListener` menerima event itu
4. listener saat ini hanya log event
5. nanti listener bisa diperluas untuk:
   - kirim email welcome
   - audit log
   - analytics
   - enqueue background job

## 12. Flow Cache dan Queue Saat Ini

Saat ini cache dan queue masih baseline.

Artinya:

- `CacheService` sudah siap dipakai service lain
- `QueueService` sudah siap membaca config Redis
- belum ada feature bisnis yang benar-benar menyimpan cache
- belum ada worker/job yang benar-benar dijalankan

Tujuannya supaya saat kebutuhan muncul, arsitektur tidak perlu dirombak besar.

## Endpoint Aktif Saat Ini

- `GET /api/v1/health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`

## Ringkasan Arsitektur

Secara singkat, project ini dibagi menjadi empat lapisan besar:

1. `common/` dan `config/`
   untuk kebutuhan global dan reusable
2. `modules/`
   untuk business feature utama
3. `database/` dan `prisma/`
   untuk persistence layer
4. `shared/`
   untuk infrastruktur pendukung seperti cache, event, dan queue

Dengan struktur ini, project tetap mudah dibaca saat kecil, tapi juga siap berkembang saat fitur bertambah.
