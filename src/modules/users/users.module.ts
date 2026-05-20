import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { USERS_REPOSITORY } from './interfaces/users-repository.interface';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserUseCase } from './use-cases/create-user.use-case';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    CreateUserUseCase,
    UsersRepository,
    {
      provide: USERS_REPOSITORY,
      useExisting: UsersRepository,
    },
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
