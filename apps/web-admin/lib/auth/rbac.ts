import { UserRole } from '@goursi/shared-types';

/**
 * RBAC web-admin — section par section.
 * Un token CUSTOMER ne peut accéder à AUCUNE section (test de preuve).
 */
export const SECTION_ROLES: Record<string, UserRole[]> = {
  users: [UserRole.SUPER_ADMIN, UserRole.SUPPORT_L1, UserRole.SUPPORT_L2],
  transactions: [
    UserRole.SUPER_ADMIN,
    UserRole.SUPPORT_L1,
    UserRole.SUPPORT_L2,
    UserRole.FINANCE_MANAGER,
  ],
  kyc: [UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER],
  aml: [UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER],
  agents: [UserRole.SUPER_ADMIN, UserRole.OPS_AGENT_MANAGER],
  audit: [UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER],
  reporting: [UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER],
};

/** Vérifie qu'un utilisateur a AU MOINS un des rôles requis pour une section. */
export function canAccessSection(section: string, roles: string[]): boolean {
  const required = SECTION_ROLES[section];
  if (!required) return false;
  return required.some((r) => roles.includes(r));
}
