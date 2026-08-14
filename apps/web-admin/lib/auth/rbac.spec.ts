import { canAccessSection, SECTION_ROLES } from './rbac';
import { UserRole } from '@goursi/shared-types';

/**
 * PREUVE DE SÉCURITÉ (GOURSI-042a) :
 * un token CUSTOMER ne peut accéder à AUCUNE section du back-office.
 */
describe('RBAC web-admin (preuve de sécurité)', () => {
  const customerRoles = [UserRole.CUSTOMER];

  it('CUSTOMER ne peut accéder à aucune section admin', () => {
    for (const section of Object.keys(SECTION_ROLES)) {
      expect(canAccessSection(section, customerRoles)).toBe(false);
    }
  });

  it('COMPLIANCE_OFFICER accède à kyc et aml mais pas aux agents', () => {
    const roles = [UserRole.COMPLIANCE_OFFICER];
    expect(canAccessSection('kyc', roles)).toBe(true);
    expect(canAccessSection('aml', roles)).toBe(true);
    expect(canAccessSection('agents', roles)).toBe(false);
  });

  it('SUPER_ADMIN accède à tout', () => {
    const roles = [UserRole.SUPER_ADMIN];
    for (const section of Object.keys(SECTION_ROLES)) {
      expect(canAccessSection(section, roles)).toBe(true);
    }
  });

  it('FINANCE_MANAGER accède à transactions, audit et reporting', () => {
    const roles = [UserRole.FINANCE_MANAGER];
    expect(canAccessSection('transactions', roles)).toBe(true);
    expect(canAccessSection('audit', roles)).toBe(true);
    expect(canAccessSection('reporting', roles)).toBe(true);
    expect(canAccessSection('kyc', roles)).toBe(false);
  });

  it('section inconnue → refus', () => {
    expect(canAccessSection('secret', [UserRole.SUPER_ADMIN])).toBe(false);
  });
});
