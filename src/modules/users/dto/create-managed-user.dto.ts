import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { CreateUserDto } from './create-user.dto';

export class CreateManagedUserDto extends CreateUserDto {
  @ApiPropertyOptional({ enum: Role, example: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
