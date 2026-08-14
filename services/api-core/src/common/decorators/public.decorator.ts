import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marque une route comme publique (hors auth JWT globale). Ex. : /health, /auth/register. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
