/**
 * Point d'entrée unique vers le client Prisma généré pour notification-service.
 * Le monorepo partage plusieurs schémas Prisma : ce service génère son propre client
 * (prisma/schema.prisma → output ../../../node_modules/.prisma/notification-client)
 * afin de ne pas écraser le client par défaut utilisé par api-core.
 */
export * from '../../../../node_modules/.prisma/notification-client';
