process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
delete process.env.REDIS_HOST;

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '../src/common/enums/role.enum';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { type UserSortField } from '../src/modules/users/constants/user-query.constants';
import {
  USERS_REPOSITORY,
  type CreateUserRepositoryInput,
  type UserAuthRecord,
  type UserRecord,
  type UsersRepositoryInterface,
} from '../src/modules/users/interfaces/users-repository.interface';

class InMemoryUsersRepository implements UsersRepositoryInterface {
  private users = new Map<string, UserAuthRecord>();
  private sequence = 1;

  create(data: CreateUserRepositoryInput): Promise<UserRecord> {
    const now = new Date();
    const user: UserAuthRecord = {
      id: `user-${this.sequence++}`,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      role: data.role,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.users.set(user.id, user);
    return Promise.resolve(this.toUserRecord(user));
  }

  findAll(params: {
    skip: number;
    take: number;
    search?: string;
    sortBy?: UserSortField;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ data: UserRecord[]; total: number }> {
    const normalizedSearch = params.search?.toLowerCase();
    const filteredUsers = [...this.users.values()].filter((user) => {
      if (user.deletedAt !== null) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)
      );
    });

    const sortBy = params.sortBy ?? 'createdAt';
    filteredUsers.sort((left, right) => {
      const leftValue = left[sortBy];
      const rightValue = right[sortBy];

      if (leftValue instanceof Date && rightValue instanceof Date) {
        return leftValue.getTime() - rightValue.getTime();
      }

      return String(leftValue).localeCompare(String(rightValue));
    });

    if (params.sortOrder === 'desc') {
      filteredUsers.reverse();
    }

    const data = filteredUsers
      .slice(params.skip, params.skip + params.take)
      .map((user) => this.toUserRecord(user));

    return Promise.resolve({
      data,
      total: filteredUsers.length,
    });
  }

  findByEmail(email: string): Promise<UserAuthRecord | null> {
    const user = [...this.users.values()].find(
      (currentUser) =>
        currentUser.email === email && currentUser.deletedAt === null,
    );

    return Promise.resolve(user ?? null);
  }

  findAuthById(id: string): Promise<UserAuthRecord | null> {
    const user = this.users.get(id);
    return Promise.resolve(user?.deletedAt === null ? user : null);
  }

  findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return Promise.resolve(
      user?.deletedAt === null ? this.toUserRecord(user) : null,
    );
  }

  updateRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ): Promise<void> {
    const user = this.users.get(userId);

    if (!user) {
      return Promise.resolve();
    }

    this.users.set(userId, {
      ...user,
      refreshTokenHash,
      refreshTokenExpiresAt,
      updatedAt: new Date(),
    });

    return Promise.resolve();
  }

  async seedAdmin(): Promise<UserAuthRecord> {
    const passwordHash = await bcrypt.hash('strong-password', 10);
    const now = new Date();
    const user: UserAuthRecord = {
      id: `user-${this.sequence++}`,
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      role: Role.ADMIN,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.users.set(user.id, user);
    return user;
  }

  private toUserRecord(user: UserAuthRecord): UserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }
}

interface RegisterResponseBody {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      name: string;
      email: string;
      role: Role;
    };
  };
}

interface ErrorResponseBody {
  message: string;
}

interface AuthResponseBody {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

describe('Auth and Users (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: InMemoryUsersRepository;
  let jwtService: JwtService;

  beforeEach(async () => {
    usersRepository = new InMemoryUsersRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USERS_REPOSITORY)
      .useValue(usersRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();

    jwtService = app.get(JwtService);
  });

  it('registers a user and returns JWT tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'strong-password',
      })
      .expect(201);

    const responseBody = response.body as RegisterResponseBody;

    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe('User registered successfully');
    expect(responseBody.data.user).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      role: Role.USER,
    });
    expect(typeof responseBody.data.accessToken).toBe('string');
    expect(typeof responseBody.data.refreshToken).toBe('string');
  });

  it('revokes refresh token on logout', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'strong-password',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'john@example.com',
        password: 'strong-password',
      })
      .expect(200);

    const authResponseBody = loginResponse.body as AuthResponseBody;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${authResponseBody.data.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          message: 'Logout successful',
          data: null,
        });
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: authResponseBody.data.refreshToken,
      })
      .expect(401);
  });

  it('rejects unauthenticated managed user creation', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        name: 'Managed User',
        email: 'managed@example.com',
        password: 'strong-password',
        role: Role.ADMIN,
      })
      .expect(401);
  });

  it('rejects non-admin user creation on managed users endpoint', async () => {
    const userToken = jwtService.sign({
      sub: 'user-regular',
      email: 'user@example.com',
      role: Role.USER,
    });

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Managed User',
        email: 'managed@example.com',
        password: 'strong-password',
        role: Role.ADMIN,
      })
      .expect(403);
  });

  it('allows admin to create managed users with a role', async () => {
    await usersRepository.seedAdmin();

    const adminToken = jwtService.sign({
      sub: 'admin-seeded',
      email: 'admin@example.com',
      role: Role.ADMIN,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Manager User',
        email: 'manager@example.com',
        password: 'strong-password',
        role: Role.ADMIN,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Success',
      data: {
        email: 'manager@example.com',
        role: Role.ADMIN,
      },
    });
  });

  it('validates allowed sortBy values on users listing', async () => {
    const adminToken = jwtService.sign({
      sub: 'admin-user',
      email: 'admin@example.com',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .get('/api/v1/users?sortBy=passwordHash')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)
      .expect(({ body }) => {
        const responseBody = body as ErrorResponseBody;
        expect(responseBody.message).toContain('sortBy must be one of');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
