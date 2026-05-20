import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../common/enums/role.enum';
import { CreateUserDto } from '../dto/create-user.dto';
import { USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import type { UsersRepositoryInterface } from '../interfaces/users-repository.interface';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepositoryInterface,
  ) {}

  async execute(dto: CreateUserDto & { role?: Role }) {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? Role.USER,
    });
  }
}
