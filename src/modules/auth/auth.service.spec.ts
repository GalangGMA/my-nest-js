import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;

  const usersService = {
    findByEmail: jest.fn(),
    findAuthById: jest.fn(),
    create: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'jwt.secret') {
        return 'test-secret-value';
      }

      if (key === 'jwt.expiresIn') {
        return '1d';
      }

      if (key === 'jwt.refreshSecret') {
        return 'test-refresh-secret-value';
      }

      if (key === 'jwt.refreshExpiresIn') {
        return '7d';
      }

      throw new Error(`Unknown config key: ${key}`);
    }),
  };

  const eventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('registers a user and returns an access token', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: Role.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('signed-access-token')
      .mockResolvedValueOnce('signed-refresh-token');

    const result = await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'strong-password',
    });

    expect(usersService.create).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'strong-password',
      role: Role.USER,
    });
    expect(result).toMatchObject({
      message: 'User registered successfully',
      data: {
        accessToken: 'signed-access-token',
        refreshToken: 'signed-refresh-token',
        user: {
          email: 'john@example.com',
          role: Role.USER,
        },
      },
    });
    expect(usersService.updateRefreshToken).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate registration email', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(
      authService.register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'strong-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in a valid user', async () => {
    const passwordHash = await bcrypt.hash('strong-password', 10);

    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: Role.USER,
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('signed-access-token')
      .mockResolvedValueOnce('signed-refresh-token');

    const result = await authService.login({
      email: 'john@example.com',
      password: 'strong-password',
    });

    expect(result).toMatchObject({
      message: 'Login successful',
      data: {
        accessToken: 'signed-access-token',
        refreshToken: 'signed-refresh-token',
      },
    });
    expect(usersService.updateRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid password', async () => {
    const passwordHash = await bcrypt.hash('different-password', 10);

    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: Role.USER,
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await expect(
      authService.login({
        email: 'john@example.com',
        password: 'strong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens for a valid refresh token', async () => {
    const refreshTokenHash = await bcrypt.hash('valid-refresh-token', 10);

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      email: 'john@example.com',
      role: Role.USER,
    });
    usersService.findAuthById.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: Role.USER,
      passwordHash: 'stored-password-hash',
      refreshTokenHash,
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await authService.refreshToken({
      refreshToken: 'valid-refresh-token',
    });

    expect(result).toMatchObject({
      message: 'Token refreshed successfully',
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    });
    expect(usersService.updateRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid refresh token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(
      authService.refreshToken({
        refreshToken: 'invalid-refresh-token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes refresh token on logout', async () => {
    const result = await authService.logout('user-1');

    expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
      'user-1',
      null,
      null,
    );
    expect(result).toEqual({
      message: 'Logout successful',
      data: null,
    });
  });
});
