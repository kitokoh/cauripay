/**
 * Tests unitaires — 2fa-store (GOURSI-043a).
 * Enrôlement, lecture, persistance fichier JSON (store isolé sur fichier
 * temporaire, jamais le singleton de l'app).
 */
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTwoFactorStore } from '../lib/auth/2fa-store';

const tmpFile = path.join(os.tmpdir(), `goursi-2fa-test-${process.pid}-${Date.now()}.json`);

afterEach(() => {
  rmSync(tmpFile, { force: true });
});

describe('lib/auth/2fa-store', () => {
  it('utilisateur inconnu : non enrôlé, secret null', () => {
    const store = createTwoFactorStore(tmpFile);
    expect(store.isEnrolled('ghost-user')).toBe(false);
    expect(store.getSecret('ghost-user')).toBeNull();
  });

  it('setSecret → utilisateur enrôlé et secret restitué', () => {
    const store = createTwoFactorStore(tmpFile);
    const secret = 'SECRETBASE32TEST1234';
    store.setSecret('user-42', secret);

    expect(store.isEnrolled('user-42')).toBe(true);
    expect(store.getSecret('user-42')).toBe(secret);
  });

  it('les secrets sont persistés sur disque (rechargeables par un nouvel instance)', () => {
    const store = createTwoFactorStore(tmpFile);
    store.setSecret('user-42', 'SECRETBASE32TEST1234');

    // Nouvelle instance (simule un redémarrage) → lecture depuis le fichier JSON
    const reloaded = createTwoFactorStore(tmpFile);
    expect(reloaded.isEnrolled('user-42')).toBe(true);
    expect(reloaded.getSecret('user-42')).toBe('SECRETBASE32TEST1234');
  });

  it('setSecret écrase le secret existant (ré-enrôlement)', () => {
    const store = createTwoFactorStore(tmpFile);
    store.setSecret('user-42', 'OLD SECRET');
    store.setSecret('user-42', 'NEW SECRET');
    expect(store.getSecret('user-42')).toBe('NEW SECRET');
  });
});
