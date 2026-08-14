import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@goursi/shared-types';
import { ROLES_KEY } from '../guards/roles.guard';

/** Restreint une route à un ou plusieurs rôles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
