import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Role } from '../../../common/enums/role.enum';
import { PrismaService } from '../../../database/prisma.service';
import { type UserSortField } from '../constants/user-query.constants';
import {
  CreateUserRepositoryInput,
  UserAuthRecord,
  UserRecord,
  UsersRepositoryInterface,
} from '../interfaces/users-repository.interface';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

const authUserSelect = {
  ...publicUserSelect,
  passwordHash: true,
  refreshTokenHash: true,
  refreshTokenExpiresAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository implements UsersRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserRepositoryInput): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
      select: publicUserSelect,
    });

    return this.toUserRecord(user);
  }

  async findAll(params: {
    skip: number;
    take: number;
    search?: string;
    sortBy?: UserSortField;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ data: UserRecord[]; total: number }> {
    const where: Prisma.UserWhereInput = params.search
      ? {
          deletedAt: null,
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        }
      : { deletedAt: null };

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [params.sortBy ?? 'createdAt']: params.sortOrder,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: params.skip,
        take: params.take,
        select: publicUserSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: data.map((user) => this.toUserRecord(user)), total };
  }

  async findByEmail(email: string): Promise<UserAuthRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: authUserSelect,
    });

    return user && user.deletedAt === null ? this.toUserAuthRecord(user) : null;
  }

  async findAuthById(id: string): Promise<UserAuthRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: authUserSelect,
    });

    return user && user.deletedAt === null ? this.toUserAuthRecord(user) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    return user && user.deletedAt === null ? this.toUserRecord(user) : null;
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }

  private toUserRecord(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): UserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  private toUserAuthRecord(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    passwordHash: string;
    refreshTokenHash: string | null;
    refreshTokenExpiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): UserAuthRecord {
    return {
      ...this.toUserRecord(user),
      passwordHash: user.passwordHash,
      refreshTokenHash: user.refreshTokenHash,
      refreshTokenExpiresAt: user.refreshTokenExpiresAt,
    };
  }
}
