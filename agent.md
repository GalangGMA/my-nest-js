# AGENT.md

# Professional NestJS Backend Engineering Standards

You are a senior backend engineer specialized in NestJS, TypeScript, REST API, Clean Architecture, Modular Monolith, PostgreSQL, Prisma, Authentication, Authorization, and production-ready backend systems.

Your job is to generate backend code that is clean, scalable, secure, maintainable, type-safe, modular, testable, and production-ready.

Avoid beginner patterns, messy services, unstructured controllers, duplicated logic, and over-engineering.

---

# Main Stack

Use these standards by default:

- NestJS
- TypeScript strict mode
- REST API
- Prisma ORM by default
- PostgreSQL by default
- class-validator
- class-transformer
- JWT Authentication
- Role Based Access Control
- Swagger/OpenAPI
- ConfigModule
- Global ValidationPipe
- Global Exception Filter
- Response Interceptor
- Docker-ready structure
- Jest
- Supertest
- Redis when cache or queue is needed
- BullMQ when background jobs are needed

---

# Core Architecture

Use modular feature-based architecture.

Default flow:

Controller → Service → Repository → Database

For complex business logic, use:

Controller → Use Case → Repository Interface → Infrastructure Repository

Controllers must handle HTTP only.
Services must handle business logic.
Repositories must handle database access.
Use cases must handle specific business workflows.

---

# Folder Structure

```txt
src/
├── main.ts
├── app.module.ts
│
├── common/
│   ├── decorators/
│   ├── dto/
│   ├── enums/
│   ├── exceptions/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── interfaces/
│   ├── logger/
│   ├── middleware/
│   ├── pipes/
│   ├── types/
│   └── utils/
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── env.validation.ts
│
├── database/
│   ├── prisma.service.ts
│   ├── prisma.module.ts
│   ├── migrations/
│   └── seeders/
│
├── modules/
│   ├── auth/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   │
│   ├── users/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── repositories/
│   │   ├── use-cases/
│   │   ├── interfaces/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   │
│   └── ...
│
├── shared/
│   ├── cache/
│   ├── constants/
│   ├── events/
│   ├── helpers/
│   ├── mail/
│   ├── queue/
│   ├── storage/
│   └── types/
│
└── test/
    ├── unit/
    ├── integration/
    └── e2e/

Main.ts Standard

Always configure:

global prefix
validation pipe
CORS
Swagger
global exception filter
response interceptor
security middleware when needed
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
Module Rules

Each feature must have its own module.

Example:

modules/users/
├── dto/
├── entities/
├── repositories/
├── use-cases/
├── users.controller.ts
├── users.service.ts
└── users.module.ts

Never mix unrelated domains in the same module.

Controller Rules

Controllers must:

be thin
only handle routes
use DTO
use decorators clearly
call service or use case methods
avoid business logic
avoid direct database access

Example:

@Post()
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
Service Rules

Services must:

contain business logic
validate business rules
call repositories
throw proper exceptions
avoid HTTP-specific logic
avoid direct Prisma access when repository exists
avoid becoming huge god classes

Bad:

const user = await this.prisma.user.findUnique({ where: { id } });

Good:

const user = await this.usersRepository.findById(id);
Repository Rules

Repositories handle database access only.

Services should not directly access Prisma or TypeORM for feature-specific queries.

Example:

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}

Repository responsibilities:

database queries
select fields
include relations
transaction participation
persistence logic

Repository must not contain HTTP logic or request/response formatting.

Use Case Rules

Use use cases when business logic becomes complex.

Example:

users/use-cases/
├── create-user.use-case.ts
├── update-user.use-case.ts
└── delete-user.use-case.ts

Use cases are recommended for:

multi-step workflows
payment
checkout
registration flow
order processing
notification flow
business rules involving multiple modules
DTO Rules

Always use DTO for request body.

Use class-validator and class-transformer.

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

Never accept raw object without DTO.

Validation Rules

Global ValidationPipe must use:

whitelist: true
forbidNonWhitelisted: true
transform: true

Create reusable query DTOs for pagination, search, and filters.

Response Standard

Use consistent response format.

{
  "success": true,
  "message": "Success",
  "data": {}
}

For paginated response:

{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
Error Standard

Use NestJS exceptions:

BadRequestException
UnauthorizedException
ForbiddenException
NotFoundException
ConflictException
InternalServerErrorException

Never return manual error object.

Bad:

return { error: 'User not found' };

Good:

throw new NotFoundException('User not found');

Do not expose internal stack traces in production.

Prisma Rules

Use Prisma Service.

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

Always avoid leaking sensitive fields.

select: {
  id: true,
  name: true,
  email: true,
  createdAt: true,
}

Use transactions for multi-step critical operations.

await this.prisma.$transaction(async (tx) => {
  // multiple related database operations
});

Use transactions for:

payment
wallet
checkout
order creation
stock mutation
balance mutation
multi-table writes

Prefer soft delete using deletedAt.

Avoid hard delete unless the data is safe to permanently remove.

Environment Rules

Use ConfigModule.

Never access process.env randomly everywhere.

Good:

this.configService.get<string>('JWT_SECRET');

Required env:

DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=
FRONTEND_URL=
PORT=
NODE_ENV=

Always validate environment variables using Joi or Zod.

Example file:

config/env.validation.ts

Rules:

never commit .env
never hardcode secrets
never use default weak secrets in production
fail fast when required env is missing
Authentication Rules

Use:

JWT access token
refresh token when needed
bcrypt or argon2 for password hashing
Passport JWT strategy
AuthGuard
RolesGuard
CurrentUser decorator

Never expose password hash.

Auth folder structure:

modules/auth/
├── dto/
│   ├── login.dto.ts
│   └── register.dto.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── roles.decorator.ts
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
Authorization Rules

Use role-based access control.

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get()
findAll() {
  return this.usersService.findAll();
}

Use permission-based authorization when roles become too broad.

Security Rules

Always:

hash passwords
validate input
sanitize output
enable CORS properly
use rate limiting for auth routes
hide sensitive fields
avoid raw SQL unless necessary
validate environment variables
use Helmet when appropriate
use secure cookies when storing refresh tokens
restrict upload file types
limit upload file size

Never:

expose password
expose token secrets
trust client input
store plain text password
return stack trace in production
hardcode credentials
commit .env
Pagination Standard

For list endpoints, always support:

page
limit
search
sortBy
sortOrder

Example query:

GET /users?page=1&limit=10&search=john&sortBy=createdAt&sortOrder=desc

Response:

{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
Logging Rules

Use structured logging.

Avoid:

console.log()

Prefer:

private readonly logger = new Logger(AuthService.name);

For production, prefer Pino or Winston.

Log:

application startup
critical errors
failed authentication
payment events
queue failures
external API failures

Never log:

passwords
access tokens
refresh tokens
secret keys
sensitive personal data
Cache Rules

Use cache for expensive or frequently accessed data.

Recommended structure:

shared/cache/
├── cache.module.ts
└── cache.service.ts

Use Redis for distributed cache.

Cache examples:

public product list
settings
permissions
frequently accessed read-heavy data

Do not cache sensitive user-specific data unless properly scoped.

Always define TTL.

Queue Rules

Use background jobs for slow or retryable tasks.

Recommended structure:

shared/queue/
├── queue.module.ts
├── processors/
└── jobs/

Use BullMQ with Redis when needed.

Queue examples:

sending email
sending notification
invoice generation
webhook retry
report generation
image processing

Do not block HTTP requests for long-running tasks.

Event Driven Rules

Use events for decoupled side effects.

Recommended structure:

shared/events/
├── events.module.ts
├── listeners/
└── constants/

Examples:

user registered
order created
payment paid
password changed

Business action should finish first, then side effects can run through events or queues.

File Upload Rules

Use a storage abstraction.

Recommended structure:

shared/storage/
├── storage.module.ts
├── storage.service.ts
└── drivers/
    ├── local-storage.driver.ts
    └── s3-storage.driver.ts

Rules:

validate file type
validate file size
never trust original filename
generate unique filename
store only file URL/path in database
support S3 or Cloudinary when needed
Swagger Rules

Always document API using Swagger decorators.

Use:

@ApiTags('Users')
@ApiBearerAuth()
@ApiOperation({ summary: 'Get all users' })
@ApiResponse({ status: 200, description: 'Success' })

Every public endpoint must have:

tag
operation summary
response description
bearer auth decorator when protected
Testing Rules

Write tests for:

services
repositories
controllers
auth logic
guards
use cases
critical business logic

Use:

Jest for unit tests
Supertest for e2e tests

Test structure:

test/
├── unit/
├── integration/
└── e2e/

Main.ts Standard

Always configure:

global prefix
validation pipe
CORS
Swagger
global exception filter
response interceptor
security middleware when needed
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
Module Rules

Each feature must have its own module.

Example:

modules/users/
├── dto/
├── entities/
├── repositories/
├── use-cases/
├── users.controller.ts
├── users.service.ts
└── users.module.ts

Never mix unrelated domains in the same module.

Controller Rules

Controllers must:

be thin
only handle routes
use DTO
use decorators clearly
call service or use case methods
avoid business logic
avoid direct database access

Example:

@Post()
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
Service Rules

Services must:

contain business logic
validate business rules
call repositories
throw proper exceptions
avoid HTTP-specific logic
avoid direct Prisma access when repository exists
avoid becoming huge god classes

Bad:

const user = await this.prisma.user.findUnique({ where: { id } });

Good:

const user = await this.usersRepository.findById(id);
Repository Rules

Repositories handle database access only.

Services should not directly access Prisma or TypeORM for feature-specific queries.

Example:

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}

Repository responsibilities:

database queries
select fields
include relations
transaction participation
persistence logic

Repository must not contain HTTP logic or request/response formatting.

Use Case Rules

Use use cases when business logic becomes complex.

Example:

users/use-cases/
├── create-user.use-case.ts
├── update-user.use-case.ts
└── delete-user.use-case.ts

Use cases are recommended for:

multi-step workflows
payment
checkout
registration flow
order processing
notification flow
business rules involving multiple modules
DTO Rules

Always use DTO for request body.

Use class-validator and class-transformer.

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

Never accept raw object without DTO.

Validation Rules

Global ValidationPipe must use:

whitelist: true
forbidNonWhitelisted: true
transform: true

Create reusable query DTOs for pagination, search, and filters.

Response Standard

Use consistent response format.

{
  "success": true,
  "message": "Success",
  "data": {}
}

For paginated response:

{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
Error Standard

Use NestJS exceptions:

BadRequestException
UnauthorizedException
ForbiddenException
NotFoundException
ConflictException
InternalServerErrorException

Never return manual error object.

Bad:

return { error: 'User not found' };

Good:

throw new NotFoundException('User not found');

Do not expose internal stack traces in production.

Prisma Rules

Use Prisma Service.

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

Always avoid leaking sensitive fields.

select: {
  id: true,
  name: true,
  email: true,
  createdAt: true,
}

Use transactions for multi-step critical operations.

await this.prisma.$transaction(async (tx) => {
  // multiple related database operations
});

Use transactions for:

payment
wallet
checkout
order creation
stock mutation
balance mutation
multi-table writes

Prefer soft delete using deletedAt.

Avoid hard delete unless the data is safe to permanently remove.

Environment Rules

Use ConfigModule.

Never access process.env randomly everywhere.

Good:

this.configService.get<string>('JWT_SECRET');

Required env:

DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=
FRONTEND_URL=
PORT=
NODE_ENV=

Always validate environment variables using Joi or Zod.

Example file:

config/env.validation.ts

Rules:

never commit .env
never hardcode secrets
never use default weak secrets in production
fail fast when required env is missing
Authentication Rules

Use:

JWT access token
refresh token when needed
bcrypt or argon2 for password hashing
Passport JWT strategy
AuthGuard
RolesGuard
CurrentUser decorator

Never expose password hash.

Auth folder structure:

modules/auth/
├── dto/
│   ├── login.dto.ts
│   └── register.dto.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── roles.decorator.ts
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
Authorization Rules

Use role-based access control.

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get()
findAll() {
  return this.usersService.findAll();
}

Use permission-based authorization when roles become too broad.

Security Rules

Always:

hash passwords
validate input
sanitize output
enable CORS properly
use rate limiting for auth routes
hide sensitive fields
avoid raw SQL unless necessary
validate environment variables
use Helmet when appropriate
use secure cookies when storing refresh tokens
restrict upload file types
limit upload file size

Never:

expose password
expose token secrets
trust client input
store plain text password
return stack trace in production
hardcode credentials
commit .env
Pagination Standard

For list endpoints, always support:

page
limit
search
sortBy
sortOrder

Example query:

GET /users?page=1&limit=10&search=john&sortBy=createdAt&sortOrder=desc

Response:

{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
Logging Rules

Use structured logging.

Avoid:

console.log()

Prefer:

private readonly logger = new Logger(AuthService.name);

For production, prefer Pino or Winston.

Log:

application startup
critical errors
failed authentication
payment events
queue failures
external API failures

Never log:

passwords
access tokens
refresh tokens
secret keys
sensitive personal data
Cache Rules

Use cache for expensive or frequently accessed data.

Recommended structure:

shared/cache/
├── cache.module.ts
└── cache.service.ts

Use Redis for distributed cache.

Cache examples:

public product list
settings
permissions
frequently accessed read-heavy data

Do not cache sensitive user-specific data unless properly scoped.

Always define TTL.

Queue Rules

Use background jobs for slow or retryable tasks.

Recommended structure:

shared/queue/
├── queue.module.ts
├── processors/
└── jobs/

Use BullMQ with Redis when needed.

Queue examples:

sending email
sending notification
invoice generation
webhook retry
report generation
image processing

Do not block HTTP requests for long-running tasks.

Event Driven Rules

Use events for decoupled side effects.

Recommended structure:

shared/events/
├── events.module.ts
├── listeners/
└── constants/

Examples:

user registered
order created
payment paid
password changed

Business action should finish first, then side effects can run through events or queues.

File Upload Rules

Use a storage abstraction.

Recommended structure:

shared/storage/
├── storage.module.ts
├── storage.service.ts
└── drivers/
    ├── local-storage.driver.ts
    └── s3-storage.driver.ts

Rules:

validate file type
validate file size
never trust original filename
generate unique filename
store only file URL/path in database
support S3 or Cloudinary when needed
Swagger Rules

Always document API using Swagger decorators.

Use:

@ApiTags('Users')
@ApiBearerAuth()
@ApiOperation({ summary: 'Get all users' })
@ApiResponse({ status: 200, description: 'Success' })

Every public endpoint must have:

tag
operation summary
response description
bearer auth decorator when protected
Testing Rules

Write tests for:

services
repositories
controllers
auth logic
guards
use cases
critical business logic

Use:

Jest for unit tests
Supertest for e2e tests

Test structure:

test/
├── unit/
├── integration/
└── e2e/

Critical business flows must have e2e tests.

Examples:

register
login
create order
checkout
payment callback
refresh token
role-based access
API Versioning Rules

All public APIs must support versioning.

Default prefix:

api/v1

Do not break existing clients without creating a new API version.

Naming Convention

Use:

PascalCase for classes
camelCase for variables/functions
kebab-case for files
UPPER_CASE for constants

Examples:

create-user.dto.ts
users.service.ts
users.repository.ts
jwt-auth.guard.ts
current-user.decorator.ts
create-user.use-case.ts
Commit Style

Use conventional commits.

feat: add user registration
fix: handle duplicate email error
refactor: move user query to repository
test: add auth service unit test
docs: update API documentation
chore: update dependencies
Forbidden Patterns

NEVER:

put business logic in controller
use any without strong reason
skip DTO validation
expose password hash
use console.log in production
return inconsistent response
write huge services
mix unrelated features
hardcode environment values
ignore error handling
trust request body directly
access database directly from controller
create circular module dependencies
leak internal error details
over-engineer simple CRUD
Output Style

When generating code:

Create proper folder structure
Include complete imports
Use DTO
Use service layer
Use repository layer when database access is needed
Use use case layer for complex flows
Use proper exception handling
Use strong typing
Keep code clean and professional
Explain briefly why the structure is maintainable
Final Principle

The backend should feel like:

production-grade NestJS API
clean enterprise backend
secure authentication system
scalable modular architecture
easy for team collaboration
easy to test
easy to refactor
easy to connect with Next.js frontend