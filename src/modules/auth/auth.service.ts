import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { Role } from '../../common/enums/role.enum';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import type {
  UserAuthRecord,
  UserRecord,
} from '../users/interfaces/users-repository.interface';
import { DOMAIN_EVENTS } from '../../shared/events/constants/events.constants';

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface AuthResponse {
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RegisterResponse extends AuthResponse {
  data: AuthResponse['data'] & {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    };
  };
}

export interface LogoutResponse {
  message: string;
  data: null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const existingUser: UserAuthRecord | null =
      await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const user: UserRecord = await this.usersService.create({
      ...dto,
      role: Role.USER,
    });
    const tokens: AuthTokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.persistRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    this.eventEmitter.emit(DOMAIN_EVENTS.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'User registered successfully',
      data: {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user: UserAuthRecord | null = await this.usersService.findByEmail(
      dto.email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordHash: string = user.passwordHash;
    const isPasswordValid: boolean = await bcrypt.compare(
      dto.password,
      passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens: AuthTokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.persistRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    return {
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponse> {
    const payload: TokenPayload = await this.verifyRefreshToken(
      dto.refreshToken,
    );
    const user: UserAuthRecord | null = await this.usersService.findAuthById(
      payload.sub,
    );

    if (
      !user ||
      !user.refreshTokenHash ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenHash: string = user.refreshTokenHash;
    const isRefreshTokenValid: boolean = await bcrypt.compare(
      dto.refreshToken,
      refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens: AuthTokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.persistRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );

    return {
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  async logout(userId: string): Promise<LogoutResponse> {
    await this.usersService.updateRefreshToken(userId, null, null);

    return {
      message: 'Logout successful',
      data: null,
    };
  }

  private async issueTokens(payload: TokenPayload): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: this.getRefreshTokenExpiresAt(),
    };
  }

  private generateAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.expiresIn',
      ) as StringValue,
    });
  }

  private generateRefreshToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.refreshExpiresIn',
      ) as StringValue,
    });
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ): Promise<void> {
    const refreshTokenHash: string = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateRefreshToken(
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );
    const ttlMatch = expiresIn.match(/^(\d+)([smhd])$/);

    if (!ttlMatch) {
      throw new UnauthorizedException(
        'Invalid refresh token expiry configuration',
      );
    }

    const value = Number(ttlMatch[1]);
    const unit = ttlMatch[2];
    const multiplier =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60_000
          : unit === 'h'
            ? 3_600_000
            : 86_400_000;

    return new Date(Date.now() + value * multiplier);
  }
}
