import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** @Public() — route exemptée du JwtAuthGuard global (health, routes clé API). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
