import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@cauripay/shared-types';

/** Route publique (pas de JWT requis). */
export const Public = () => SetMetadata('isPublic', true);

/** Rôles requis sur une route. */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
