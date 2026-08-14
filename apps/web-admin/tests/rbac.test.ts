import { SECTIONS, accessibleSections, canAccess, hasAdminRole } from '../lib/auth/rbac';

describe('RBAC par section — canAccess (GOURSI-042a)', () => {
  it('autorise SUPER_ADMIN sur /users (section réservée)', () => {
    expect(canAccess(['SUPER_ADMIN'], '/users')).toBe(true);
  });

  it('refuse FINANCE_MANAGER sur /users', () => {
    expect(canAccess(['FINANCE_MANAGER'], '/users')).toBe(false);
  });

  it('autorise FINANCE_MANAGER et SUPER_ADMIN sur /transactions', () => {
    expect(canAccess(['FINANCE_MANAGER'], '/transactions')).toBe(true);
    expect(canAccess(['SUPER_ADMIN'], '/transactions')).toBe(true);
  });

  it('autorise COMPLIANCE_OFFICER sur /kyc et /aml', () => {
    expect(canAccess(['COMPLIANCE_OFFICER'], '/kyc')).toBe(true);
    expect(canAccess(['COMPLIANCE_OFFICER'], '/aml')).toBe(true);
  });

  it('autorise OPS_AGENT_MANAGER sur /agents', () => {
    expect(canAccess(['OPS_AGENT_MANAGER'], '/agents')).toBe(true);
  });

  it('autorise SUPER_ADMIN, COMPLIANCE_OFFICER et FINANCE_MANAGER sur /audit', () => {
    expect(canAccess(['SUPER_ADMIN'], '/audit')).toBe(true);
    expect(canAccess(['COMPLIANCE_OFFICER'], '/audit')).toBe(true);
    expect(canAccess(['FINANCE_MANAGER'], '/audit')).toBe(true);
  });

  it('autorise FINANCE_MANAGER et SUPER_ADMIN sur /reports', () => {
    expect(canAccess(['FINANCE_MANAGER'], '/reports')).toBe(true);
    expect(canAccess(['SUPER_ADMIN'], '/reports')).toBe(true);
  });

  it('refuse CUSTOMER sur TOUTES les sections', () => {
    for (const section of SECTIONS) {
      expect(canAccess(['CUSTOMER'], section.path)).toBe(false);
    }
  });

  it('refuse un token CUSTOMER sur /dashboard (preuve de sécurité GOURSI-042a)', () => {
    expect(canAccess(['CUSTOMER'], '/dashboard')).toBe(false);
  });

  it('autorise SUPER_ADMIN sur toutes les sections + /dashboard', () => {
    for (const section of SECTIONS) {
      expect(canAccess(['SUPER_ADMIN'], section.path)).toBe(true);
    }
    expect(canAccess(['SUPER_ADMIN'], '/dashboard')).toBe(true);
  });

  it('autorise un rôle admin (COMPLIANCE_OFFICER) sur /dashboard', () => {
    expect(canAccess(['COMPLIANCE_OFFICER'], '/dashboard')).toBe(true);
  });

  it('refuse les rôles non-admin (MERCHANT, AGENT, DISTRIBUTOR, SUPPORT_L1) sur /dashboard', () => {
    expect(canAccess(['MERCHANT'], '/dashboard')).toBe(false);
    expect(canAccess(['AGENT'], '/dashboard')).toBe(false);
    expect(canAccess(['DISTRIBUTOR'], '/dashboard')).toBe(false);
    expect(canAccess(['SUPPORT_L1'], '/dashboard')).toBe(false);
  });

  it('refuse une liste de rôles vide', () => {
    expect(canAccess([], '/transactions')).toBe(false);
    expect(canAccess([], '/dashboard')).toBe(false);
  });

  it('gère les sous-chemins d\u2019une section (/users/123)', () => {
    expect(canAccess(['SUPER_ADMIN'], '/users/123')).toBe(true);
    expect(canAccess(['OPS_AGENT_MANAGER'], '/users/123')).toBe(false);
  });

  it('ferme par défaut (fail-closed) sur un chemin inconnu', () => {
    expect(canAccess(['SUPER_ADMIN'], '/inconnu')).toBe(false);
    expect(canAccess(['SUPER_ADMIN'], '/settings')).toBe(false);
  });

  it('ne confond pas deux sections (préfixe strict)', () => {
    // '/audit-trail' ne doit pas matcher la section '/audit'
    expect(canAccess(['SUPER_ADMIN'], '/audit-trail')).toBe(false);
  });

  it('expose accessibleSections par rôle (navigation)', () => {
    expect(accessibleSections(['FINANCE_MANAGER']).map((s) => s.path)).toEqual([
      '/transactions',
      '/audit',
      '/reports',
    ]);
    expect(accessibleSections(['SUPER_ADMIN']).map((s) => s.path)).toEqual(
      SECTIONS.map((s) => s.path),
    );
    expect(accessibleSections(['CUSTOMER'])).toEqual([]);
  });

  it('hasAdminRole distingue admin de CUSTOMER', () => {
    expect(hasAdminRole(['CUSTOMER'])).toBe(false);
    expect(hasAdminRole(['AGENT', 'SUPER_ADMIN'])).toBe(true);
  });
});
