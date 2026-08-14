# web-business — Portail entreprises (GOURSI-043a)

Espace marchand CauriPay : **paiements, paiements bulk, rapports, réglages**.
Next.js 14 (App Router) — port **3002** (`WEB_BUSINESS_PORT`, ADR-004) —
login **OIDC Keycloak** + **2FA TOTP obligatoire**.

> Critère d'acceptation clé : **sans 2FA, aucune route n'est accessible.**
> Le middleware `middleware.ts` bloque toute requête (hors assets et `/api/*`)
> tant que la session n'a pas `twoFactorVerified=true` : pas de session → `/login`,
> 1er login → `/setup-2fa`, login suivant → `/verify-2fa`.

## Stack

| Brique | Choix |
|---|---|
| Framework | Next.js 14.2 (App Router, server components) |
| Auth | OIDC authorization code + PKCE (openid-client 5), Keycloak realm `goursi`, client public `web-business` |
| Session | JWT HS256 (jose 5), cookie httpOnly `goursi_business_session` |
| 2FA | TOTP (otplib 12), QR code (qrcode 1.5), fenêtre ±1 pas de 30 s |
| API interne | `lib/api/client.ts` — fetch wrapper business-service, en-tête `X-Service-Key` |
| Tests | Jest 29 + ts-jest (tests unitaires purs : 2FA, middleware, session, store) |

## Démarrage

```bash
# 1. Depuis la racine du monorepo (workspaces npm)
npm install

# 2. Variables d'environnement (copier .env.example → .env.local)
cd apps/web-business
cp .env.example .env.local
#    → renseigner SESSION_SECRET (>= 32 caractères) et OIDC_ISSUER_URL

# 3. Dev sur le port 3002 (WEB_BUSINESS_PORT pour changer)
npm run dev          # équivalent : WEB_BUSINESS_PORT=3002 npm run dev
```

Prérequis : Keycloak démarré avec le realm `goursi` (infra/keycloak) — le client
`web-business` y est déjà déclaré (redirect `http://localhost:3002/*`).

## Flux d'authentification (2FA obligatoire)

```
/login ──► /api/auth/login (PKCE + state) ──► Keycloak ──► /api/auth/callback
   │
   ├─ 1er login (aucun secret TOTP) : session pending2fa (secret provisoire)
   │    └─► /setup-2fa : QR code + code de vérification
   │         └─► POST /api/2fa/enroll → secret persisté, twoFactorVerified=true ──► /
   │
   └─ login suivant (secret enregistré) : session à valider
        └─► /verify-2fa : saisie du code TOTP
             └─► POST /api/2fa/verify → twoFactorVerified=true ──► /

Logout : /api/auth/logout → cookie supprimé + end_session Keycloak (id_token_hint).
```

Points d'entrée :

| Route | Rôle |
|---|---|
| `GET /api/auth/login` | démarre le flux OIDC (state + PKCE S256) |
| `GET /api/auth/callback` | échange du code, userinfo, création session, décision 2FA |
| `GET /api/auth/logout` | invalide la session + end_session Keycloak |
| `POST /api/2fa/enroll` | 1er login : vérifie le code contre le secret provisoire, l'enregistre |
| `POST /api/2fa/verify` | login suivant : vérifie le code contre le secret enregistré |
| `GET /setup-2fa` | QR code (qrcode.toDataURL) + formulaire d'enrôlement |
| `GET /verify-2fa` | formulaire de validation TOTP |
| `/` → `/dashboard` | entrée de l'espace entreprise (sidebar) |
| `/(dashboard)` | layout sidebar : `/dashboard`, payments, bulk, reports, settings |

## 2FA — implémentation

- `lib/auth/two-factor.ts` — fonctions pures : `generateSecret()` (Base32),
  `generateTotpUri(secret, email)`, `verifyTotp(secret, token)` (fenêtre ±1 pas).
  ⚠ otplib v12 : `verify()` lit `window` sur les options de l'instance —
  configurée une fois au chargement du module.
- `lib/auth/2fa-store.ts` — stockage **de démonstration** : Map en mémoire +
  fichier JSON `apps/web-business/data/2fa.json` (gitignoré). **Production :**
  remplacer par un service dédié / base chiffrée (ex. table du store utilisateur
  business-service, ou service 2FA) — ce module n'est pas un stockage sécurisé.
- `lib/auth/middleware-logic.ts` — fonction PURE `requireTwoFactor(session,
  pathname)` → `'ok' | 'setup' | 'verify' | 'login'`, appliquée par le middleware.

## Dashboard & business-service

Le tableau de bord appelle `business-service` (GOURSI-030+) via
`lib/api/client.ts` (`BUSINESS_SERVICE_URL`, header `X-Service-Key`
`INTERNAL_SERVICE_KEY`, timeout 10 s, erreurs typées `ApiClientError`). Tant que
le service n'est pas déployé, la page affiche un état de repli explicite.

## Configuration (`.env.example`)

| Variable | Défaut | Rôle |
|---|---|---|
| `WEB_BUSINESS_PORT` | `3002` | port du serveur Next.js (ADR-004) |
| `OIDC_ISSUER_URL` | `http://localhost:8080/realms/goursi` | discovery OpenID Keycloak |
| `OIDC_CLIENT_ID` | `web-business` | client public Keycloak |
| `OIDC_REDIRECT_URI` | `http://localhost:3002/api/auth/callback` | callback OIDC |
| `OIDC_POST_LOGOUT_REDIRECT_URI` | `http://localhost:3002/login` | retour après logout |
| `SESSION_SECRET` | — (requis ≥ 32 car. en prod) | signature JWT de session |
| `SESSION_MAX_AGE_H` | `8` | durée de vie de session |
| `BUSINESS_SERVICE_URL` | `http://localhost:3020` | base URL business-service |
| `INTERNAL_SERVICE_KEY` | — | clé d'appel interne (X-Service-Key) |

## Qualité

```bash
npx tsc --noEmit    # typecheck strict
npx jest            # tests unitaires (2FA, middleware, session, store)
npm run build       # next build
npm run lint        # eslint (config locale apps/web-business/eslint.config.mjs)
```

## Périmètre

- GOURSI-043a : scaffold Next.js + login OIDC + 2FA TOTP obligatoire.
- Hors périmètre (à venir) : gestion des membres et rôles d'entreprise
  (GOURSI-043b), écrans fonctionnels paiements/bulk/rapports (GOURSI-030+),
  web-admin (GOURSI-042).

## Notes d'intégration monorepo

- **Imports relatifs** : les fichiers de l'app utilisent des imports relatifs
  (pas d'alias `@/`) afin de rester compatibles avec le typecheck racine
  (`tsc -p tsconfig.base.json`, dont les `paths` ne couvrent pas `@/*`).
  L'alias reste déclaré dans `tsconfig.json` pour Next.js.
- **Typecheck racine & JSX** : `tsconfig.base.json` (racine, hors périmètre de
  GOURSI-043a) ne déclare pas `jsx`. Le typecheck de l'app (`npx tsc --noEmit`
  dans `apps/web-business`) passe, mais le typecheck RACINE émet TS17004 sur
  les `.tsx`. Quand les fronts G4 (web-admin…) arriveront, ajouter
  `"jsx": "preserve"` à `tsconfig.base.json` (config racine, décision
  transverse). Même constat pour `eslint` racine sur `.next/types/**` :
  artefacts générés absents en CI (lint exécuté avant build).
