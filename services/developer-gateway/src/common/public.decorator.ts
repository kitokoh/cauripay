import { SetMetadata } from '@nestjs/common';

/** Route publique (pas de clé API requise). */
export const Public = () => SetMetadata('isPublic', true);
