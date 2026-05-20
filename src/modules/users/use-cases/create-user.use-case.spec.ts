import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../../common/enums/role.enum';
import {
  USERS_REPOSITORY,
  type UsersRepositoryInterface,
} from '../interfaces/users-repository.interface';
import { CreateUserUseCase } from './create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;

  const usersRepository: jest.Mocked<UsersRepositoryInterface> = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByEmail: jest.fn(),
    findAuthById: jest.fn(),
    findById: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        {
          provide: USERS_REPOSITORY,
          useValue: usersRepository,
        },
      ],
    }).compile();

    useCase = module.get(CreateUserUseCase);
  });

  it('creates a user with a hashed password', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation((data) =>
      Promise.resolve({
        id: 'user-1',
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    );

    const result = await useCase.execute({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'strong-password',
      role: Role.ADMIN,
    });

    expect(usersRepository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        role: Role.ADMIN,
      }),
    );
    expect(usersRepository.create.mock.calls[0]?.[0].passwordHash).not.toBe(
      'strong-password',
    );
    expect(result).toMatchObject({
      email: 'john@example.com',
      role: Role.ADMIN,
    });
  });

  it('rejects duplicate email', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Existing User',
      email: 'john@example.com',
      role: Role.USER,
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await expect(
      useCase.execute({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'strong-password',
        role: Role.USER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
