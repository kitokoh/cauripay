import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './roles.guard';

/** Décorateur @Roles('COMPLIANCE_OFFICER') — restriction par rôle Keycloak. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
