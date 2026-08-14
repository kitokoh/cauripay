import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@goursi/shared-types';

export const ROLES_KEY = 'roles';

/** Restreint une route à un ou plusieurs rôles (claims Keycloak realm_access.roles). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
