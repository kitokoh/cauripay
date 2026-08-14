import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/roles.guard';

/** Restreint une route à certains rôles Keycloak (realm_access.roles). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
