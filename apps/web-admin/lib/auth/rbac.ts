/**
 * RBAC par section du back-office (GOURSI-042a).
 *
 * Rôles : valeurs de `UserRole` (@goursi/shared-types) — un rôle admin doit
 * être mappé côté Keycloak dans `realm_access.roles` (client web-admin).
 *
 * Module PUR (aucune dépendance) — testé unitairement (tests/rbac.test.ts).
 */

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'FINANCE_MANAGER'
  | 'OPS_AGENT_MANAGER'
  | 'SUPPORT_L1'
  | 'SUPPORT_L2'
  | 'CUSTOMER'
  | 'MERCHANT'
  | 'AGENT'
  | 'DISTRIBUTOR';

export interface SectionAccess {
  /** Chemin de la section (préfixe). */
  path: string;
  /** Libellé affiché dans la navigation. */
  label: string;
  /** Rôles autorisés. */
  roles: readonly AdminRole[];
}

/** Sections du back-office et rôles autorisés (spec GOURSI-042a §1.2). */
export const SECTIONS: readonly SectionAccess[] = [
  { path: '/users', label: 'Utilisateurs', roles: ['SUPER_ADMIN'] },
  { path: '/transactions', label: 'Transactions', roles: ['SUPER_ADMIN', 'FINANCE_MANAGER'] },
  { path: '/kyc', label: 'KYC', roles: ['COMPLIANCE_OFFICER', 'SUPER_ADMIN'] },
  { path: '/aml', label: 'AML', roles: ['COMPLIANCE_OFFICER', 'SUPER_ADMIN'] },
  { path: '/agents', label: 'Agents', roles: ['OPS_AGENT_MANAGER', 'SUPER_ADMIN'] },
  { path: '/audit', label: 'Audit', roles: ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'FINANCE_MANAGER'] },
  { path: '/reports', label: 'Rapports', roles: ['FINANCE_MANAGER', 'SUPER_ADMIN'] },
];

/** Ensemble des rôles admis sur au moins une section. */
const ADMIN_ROLES: ReadonlySet<string> = new Set(SECTIONS.flatMap((s) => s.roles));

/** Retrouve la section correspondant à un chemin (préfixe de segment). */
export function findSection(pathname: string): SectionAccess | null {
  return SECTIONS.find((s) => pathname === s.path || pathname.startsWith(`${s.path}/`)) ?? null;
}

/**
 * Décide si un ensemble de rôles peut accéder à un chemin.
 * - `/dashboard` : tout rôle admin (au moins une section accessible) ;
 * - sections : rôle listé dans la section ;
 * - chemin inconnu : refus (fail-closed).
 */
export function canAccess(roles: readonly string[], pathname: string): boolean {
  const path = pathname ?? '/';
  if (path === '/dashboard') {
    return roles.some((role) => ADMIN_ROLES.has(role));
  }
  const section = findSection(path);
  if (!section) return false;
  return roles.some((role) => (section.roles as readonly string[]).includes(role));
}

/** Sections accessibles pour un ensemble de rôles (navigation). */
export function accessibleSections(roles: readonly string[]): SectionAccess[] {
  return SECTIONS.filter((section) => (section.roles as readonly string[]).some((role) => roles.includes(role)));
}

/** true si l'utilisateur possède au moins un rôle back-office. */
export function hasAdminRole(roles: readonly string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.has(role));
}
