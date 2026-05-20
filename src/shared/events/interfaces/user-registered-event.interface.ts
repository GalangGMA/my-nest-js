import { Role } from '../../../common/enums/role.enum';

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  role: Role;
}
