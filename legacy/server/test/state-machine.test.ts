import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/payments.js';

// Matrice attendue (docs/DESIGN.md §8)
const EXPECTED: Record<string, string[]> = {
  pending: ['processing', 'cancelled', 'succeeded', 'failed', 'expired'],
  processing: ['succeeded', 'failed', 'expired'],
  succeeded: [],
  failed: [],
  cancelled: [],
  expired: [],
};

test('machine à états : toutes les transitions valides du design (#50)', () => {
  for (const [from, tos] of Object.entries(EXPECTED)) {
    for (const to of tos) {
      assert.equal(canTransition(from as never, to as never), true, `${from} → ${to} doit être valide`);
    }
  }
});

test('machine à états : aucune transition non prévue (#50)', () => {
  const all = ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'expired'];
  for (const from of all) {
    for (const to of all) {
      const expected = EXPECTED[from].includes(to);
      assert.equal(canTransition(from as never, to as never), expected, `${from} → ${to} : attendu ${expected}`);
    }
  }
});
