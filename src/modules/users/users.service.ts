import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Role } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import type {
  UserAuthRecord,
  UserRecord,
  UsersRepositoryInterface,
} from './interfaces/users-repository.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepositoryInterface,
  ) {}

  async create(dto: CreateUserDto & { role?: Role }): Promise<UserRecord> {
    const user = await this.createUserUseCase.execute(dto);
    return this.toUserResponse(user);
  }

  async findAll(query: PaginationQueryDto): Promise<{
    message: string;
    data: UserRecord[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page;
    const limit = query.limit;

    const result = await this.usersRepository.findAll({
      skip: (page - 1) * limit,
      take: limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      message: 'Users fetched successfully',
      data: result.data.map((user) => this.toUserResponse(user)),
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async findById(id: string): Promise<UserRecord> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async findByEmail(email: string): Promise<UserAuthRecord | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findAuthById(id: string): Promise<UserAuthRecord | null> {
    return this.usersRepository.findAuthById(id);
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
    refreshTokenExpiresAt: Date | null,
  ) {
    await this.usersRepository.updateRefreshToken(
      userId,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );
  }

  private toUserResponse(user: UserRecord): UserRecord {
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
