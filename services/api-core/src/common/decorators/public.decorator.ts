import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** @Public() — route accessible sans JWT (health, webhooks entrants). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
