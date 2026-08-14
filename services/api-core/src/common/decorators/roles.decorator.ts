import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@goursi/shared-types';
import { ROLES_KEY } from '../guards/roles.guard';

/** @Roles(UserRole.SUPER_ADMIN) — restreint une route à un/des rôles Keycloak. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
