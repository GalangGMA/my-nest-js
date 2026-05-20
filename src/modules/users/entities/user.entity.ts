import { Role } from '../../../common/enums/role.enum';

export class UserEntity {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;
  createdAt!: Date;
  updatedAt!: Date;
}
