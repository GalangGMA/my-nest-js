import { Role } from '../../../common/enums/role.enum';
import type { UserSortField } from '../constants/user-query.constants';

export interface CreateUserRepositoryInput {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserAuthRecord extends UserRecord {
  passwordHash: string;
  refreshTokenHash: string | null;
  refreshTokenExpiresAt: Date | null;
}

export interface UsersRepositoryInterface {
  create(data: CreateUserRepositoryInput): Promise<UserRecord>;
  findAll(params: {
    skip: number;
    take: number;
    search?: string;
    sortBy?: UserSortField;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ data: UserRecord[]; total: number }>;
  findByEmail(email: string): Promise<UserAuthRecord | null>;
  findAuthById(id: string): Promise<UserAuthRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  updateRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
