import { useEffect, useState } from 'react';
import { request } from '../api';
import { copyText, maskSecret } from '../format';
import { PageHead } from '../components/Layout';
import { Spinner } from '../components/StatCard';
import { toast } from '../components/Toast';

interface KeysData {
  keys: {
    publishable_test: string;
    secret_test: string;
    publishable_live: string;
    secret_live: string;
    webhook_secret_test: string;
    webhook_secret_live: string;
  };
  live_enabled: number;
}

interface KeyRow {
  label: string;
  value: string;
  scope: 'publishable' | 'secret' | 'webhook';
  mode: 'test' | 'live';
  reveal?: boolean;
}

export function KeysPage(): JSX.Element {
  const [data, setData] = useState<KeysData | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const load = () => request<KeysData>('/keys').then(setData).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  if (!data) return <Spinner />;

  const rows: KeyRow[] = [
    { label: 'Clé publiable (test)', value: data.keys.publishable_test, scope: 'publishable', mode: 'test' },
    { label: 'Clé secrète (test)', value: data.keys.secret_test, scope: 'secret', mode: 'test', reveal: true },
    { label: 'Secret webhook (test)', value: data.keys.webhook_secret_test, scope: 'webhook', mode: 'test', reveal: true },
    { label: 'Clé publiable (live)', value: data.keys.publishable_live, scope: 'publishable', mode: 'live' },
    { label: 'Clé secrète (live)', value: data.keys.secret_live, scope: 'secret', mode: 'live', reveal: true },
    { label: 'Secret webhook (live)', value: data.keys.webhook_secret_live, scope: 'webhook', mode: 'live', reveal: true },
  ];

  const rotate = async (r: KeyRow) => {
    if (!confirm(`Régénérer ${r.label} ? L'ancienne clé cessera d'être valide immédiatement.`)) return;
    try {
      const res = await request<{ key: string }>('/keys/rotate', { method: 'POST', body: { mode: r.mode, scope: r.scope } });
      toast('info', `${r.label} régénérée : ${res.key}`);
      load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Erreur');
    }
  };

  const copy = (r: KeyRow) => {
    copyText(r.value);
    toast('success', 'Copié dans le presse-papiers.');
  };

  return (
    <>
      <PageHead title="Clés API" sub="Authentifiez vos appels à l'API v1. Les clés secrètes ne sont visibles que par vous." />
      {!data.live_enabled && (
        <div className="note">🔒 Le mode <strong>live</strong> n'est pas encore activé sur ce compte — les paiements réels arriveront en v0.2 avec les connecteurs PSP.</div>
      )}
      <div className="keys-grid">
        {(['test', 'live'] as const).map((mode) => (
          <div key={mode} className="card">
            <h3 className="card-title">{mode === 'test' ? '🧪 Mode test' : '🔒 Mode live'}</h3>
            <p className="hint">{mode === 'test' ? 'Simulateur — aucun argent réel.' : 'Transactions réelles (v0.2).'}</p>
            {rows
              .filter((r) => r.mode === mode)
              .map((r) => {
                const keyId = `${r.mode}-${r.scope}`;
                const isRevealed = revealed.has(keyId);
                const display = r.reveal && !isRevealed ? maskSecret(r.value) : r.value;
                return (
                  <div key={keyId} className="key-row">
                    <div className="key-label">
                      {r.label}
                      {r.reveal && (
                        <button className="btn btn-sm" onClick={() => setRevealed((prev) => { const s = new Set(prev); if (s.has(keyId)) s.delete(keyId); else s.add(keyId); return s; })}>
                          {isRevealed ? 'Masquer' : 'Afficher'}
                        </button>
                      )}
                    </div>
                    <div className="key-value">
                      <code>{display}</code>
                      <button className="btn btn-sm" onClick={() => copy(r)}>Copier</button>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={() => rotate(r)}>↻ Régénérer</button>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </>
  );
}
