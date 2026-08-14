# GOURSI — web-admin (back-office)

Back-office Next.js (App Router) de la plateforme CauriPay — auth **Keycloak OIDC**
(authorization code flow) + **RBAC par section**. Port **3001** (`WEB_ADMIN_PORT`).

> Spec : GOURSI-042a (#245) — bloc GOURSI-042 §1.2.

## Stack

| Brique | Choix |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 |
| Auth | `openid-client` (code flow) + session chiffrée `jose` (JWE A256GCM) |
| Session | cookie `goursi_admin_session` (HttpOnly, SameSite=Lax, Secure en prod, 8 h) |
| Données | api-core via `lib/api/client.ts` (en-tête `X-Service-Key`) |
| Tests | Jest + ts-jest (openid-client mocké) |

## Démarrage

```bash
# 1. Dépendances (monorepo — workspaces apps/*)
npm install

# 2. Variables d'environnement (voir section ci-dessous)
cp apps/web-admin/.env.example apps/web-admin/.env.local   # ou variables du shell

# 3. Lancer (port piloté par WEB_ADMIN_PORT, défaut 3001)
npm run dev -w @goursi/web-admin
# → http://localhost:3001
```

Autres commandes :

```bash
npm run build -w @goursi/web-admin      # next build
npm start -w @goursi/web-admin          # next start (build requis)
npm test -w @goursi/web-admin           # jest (rbac + session + oidc mocké)
npm run typecheck -w @goursi/web-admin  # tsc --noEmit
```

Le port dev/start vient de `WEB_ADMIN_PORT` (convention ADR-004) :
`next dev -p ${WEB_ADMIN_PORT:-3001}`.

## Variables d'environnement

| Variable | Défaut (dev) | Description |
|---|---|---|
| `WEB_ADMIN_PORT` | `3001` | Port du serveur Next.js |
| `JWT_ISSUER` | `http://localhost:8080/realms/goursi` | Issuer Keycloak (découverte `/.well-known/openid-configuration`) |
| `KEYCLOAK_CLIENT_ID` | `web-admin` | Client confidentiel Keycloak |
| `KEYCLOAK_CLIENT_SECRET` | `dev-client-secret` | Secret du client Keycloak |
| `SESSION_SECRET` | — (repli `JWT_SECRET`) | Clé de chiffrement de la session (JWE) — **requise en production** |
| `API_CORE_BASE_URL` | `http://localhost:3000` | Base URL d'api-core |
| `INTERNAL_SERVICE_KEY` | `dev_internal_service_key_change_me` | Clé inter-services (`X-Service-Key`) |

Aucun secret n'est embarqué côté client : tout est lu côté serveur (middleware,
route handlers, composants serveur).

## Flux OIDC

```
Navigateur            web-admin                        Keycloak
   │  GET /login          │                                │
   │── Se connecter ─────▶│  GET /api/auth/login            │
   │                      │  state+nonce → cookie signé     │
   │◀── 302 ──────────────│  (goursi_admin_oauth_state)     │
   │── GET authorize ─────────────────────────────────────▶│
   │                      │                                 │ consentement
   │◀────────────────────────────────── 302 code+state ────│
   │── GET /api/auth/callback ──▶│                          │
   │                      │  vérif state, échange code      │
   │                      │  (openid-client)                │
   │                      │  roles ← realm_access.roles     │
   │                      │  session JWE → cookie           │
   │◀── 302 / ────────────│                                 │
   │── GET / ──▶  middleware : session ? RBAC ?             │
   │              /dashboard (overview) ou /forbidden       │
   │── POST /api/auth/logout ──▶  cookie supprimé           │
   │◀── 302 end_session ──────────────────────────────────▶│ SSO déconnecté
```

- **Sécurité** : `state` + `nonce` vérifiés par `openid-client` ; session
  chiffrée (JWE, clé dérivée du secret) → les rôles ne sont pas modifiables
  côté client ; cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` en production).
- **Déconnexion** : cookie local effacé puis redirection vers
  `end_session_endpoint` Keycloak (déconnexion SSO).

## RBAC par section

Rôles issus de `realm_access.roles` du token ID Keycloak (valeurs `UserRole`,
cf. `@goursi/shared-types`). Le middleware (et le layout du dashboard) refuse
tout accès hors autorisation → page 403 (`/forbidden`).

| Section | Chemin | Rôles autorisés |
|---|---|---|
| Utilisateurs | `/users` | `SUPER_ADMIN` |
| Transactions | `/transactions` | `SUPER_ADMIN`, `FINANCE_MANAGER` |
| KYC | `/kyc` | `COMPLIANCE_OFFICER`, `SUPER_ADMIN` |
| AML | `/aml` | `COMPLIANCE_OFFICER`, `SUPER_ADMIN` |
| Agents | `/agents` | `OPS_AGENT_MANAGER`, `SUPER_ADMIN` |
| Audit | `/audit` | `SUPER_ADMIN`, `COMPLIANCE_OFFICER`, `FINANCE_MANAGER` |
| Rapports | `/reports` | `FINANCE_MANAGER`, `SUPER_ADMIN` |
| Vue d'ensemble | `/dashboard` | tout rôle admin ci-dessus |

Un token `CUSTOMER` (ou tout rôle non admin) ne peut accéder à aucune page du
back-office — vérifié par test (`tests/rbac.test.ts`).

## Structure

```
apps/web-admin/
├── app/
│   ├── page.tsx                  # garde racine → /login ou /dashboard
│   ├── login/page.tsx            # bouton « Se connecter avec Keycloak »
│   ├── forbidden/page.tsx        # 403
│   ├── (dashboard)/              # layout sidebar + sections
│   │   ├── layout.tsx            # nav par section (RBAC), profil, déconnexion
│   │   ├── dashboard/page.tsx    # vue d'ensemble (stats api-core)
│   │   └── {users,transactions,kyc,aml,agents,audit,reports}/page.tsx
│   └── api/auth/{login,callback,logout}/route.ts
├── components/data-table.tsx     # tableau de données placeholder
├── lib/
│   ├── config.ts                 # lecture env (edge-safe)
│   ├── auth/{session,oidc,rbac}.ts
│   └── api/client.ts             # wrapper fetch api-core (X-Service-Key)
├── middleware.ts                 # garde session + RBAC
└── tests/                        # jest (rbac, session, oidc mocké)
```

## Tests

```bash
npm test -w @goursi/web-admin
```

- `tests/rbac.test.ts` — canAccess par section (autorisé/refusé), CUSTOMER
  refusé partout, SUPER_ADMIN partout, /dashboard, fail-closed ;
- `tests/session.test.ts` — round-trip chiffrement/déchiffrement, jeton
  trafiqué, expiré, autre clé, options du cookie (Secure en prod) ;
- `tests/oidc.test.ts` — flux OIDC avec `openid-client` mocké (URL
  d'autorisation, échange de code, extraction des rôles, fin de session).

## Remarques

- Les pages de sections sont des skeletons : elles appellent api-core
  (`/api/v1/*`) et affichent un tableau vide + avertissement tant que les
  endpoints administrateurs ne sont pas exposés (GOURSI-042b et suivants).
- `app/(dashboard)/page.tsx` n'existe volontairement pas : il entrerait en
  conflit avec `app/page.tsx` (les deux résolvent `/`). La vue d'ensemble est
  servie sur `/dashboard` → `app/(dashboard)/dashboard/page.tsx`.
