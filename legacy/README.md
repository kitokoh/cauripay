# legacy/ — Agrégateur v0.1 (HISTORIQUE)

> **⚠️ Ce code n'est PAS la cible produit.** Il est conservé tel quel pour l'historique et les
> références (registres de devises/méthodes, conventions webhooks HMAC, idempotence, design du dashboard).
> Voir [ADR-002](../docs/adr/ADR-002.md) : le cœur produit est la **plateforme wallet GOURSI**.

- `server/` — API Fastify 5 + TS + node:sqlite (paiements, checkout, webhooks, simulateur)
- `dashboard/` — React 18 + Vite (SPA marchand)
- `docs/` — DESIGN.md (v0.1), API.md, ROADMAP.md

**Aucune évolution ni correction n'est acceptée ici.** Les besoins qu'il exprimait sont re-couverts
par le backlog GOURSI (#138–#271, voir [TRACABILITY](../docs/TRACABILITY.md)).

Pour (re)lancer l'ancienne démo : `cd legacy && npm install && npm run dev` (cf. ancien README).
