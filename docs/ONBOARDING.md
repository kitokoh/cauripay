# ONBOARDING — Guide d'environnement développeur

> Objectif : poste prêt en **< 15 min sur machine vierge** (GOURSI-QA6).

## Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Node.js | ≥ 20 LTS | `node -v` |
| JDK | 21 (Temurin recommandé) | `java -version` |
| Docker + compose | récent | `docker compose version` |
| Make | — | `make --version` |

```bash
./scripts/setup-check.sh   # valide tout ce qui précède
```

## Setup (une commande)

```bash
git clone https://github.com/kitokoh/cauripay.git && cd cauripay
cp .env.example .env
make setup   # npm ci + compose up + migrations + seed
make health
```

## Pièges connus

1. **Node 24 vs 20** : le monorepo exige ≥ 20 (`.nvmrc`). Si votre shell a un autre Node, `nvm use`.
2. **JDK 11 par défaut sur certaines distros** : Spring Boot 3.2 exige **17+ (cible 21)**.
   `sudo apt install openjdk-21-jdk` puis `update-alternatives --config java`.
3. **Ports occupés** : la convention ADR-004 fixe 3000–3080. Si un port est pris, ajustez
   la variable correspondante dans `.env` (et la config du service).
4. **Keycloak au premier boot** : ~30–60 s avant que `/health/ready` réponde (import du realm).
5. **RabbitMQ definitions** : chargées au boot via `management.load_definitions` ; un changement
   de topologie = redémarrage du conteneur (`make up`).
6. **Prisma** : après un `git pull` avec de nouvelles migrations, relancer `make migrate-prisma`.
7. **Jamais** de `prisma db push` en dev sur le schéma ledger — le DDL ledger appartient à Flyway.

## Commandes utiles

```bash
make dev          # hot-reload services NestJS (si implémenté par service)
make test         # jest + mvn
make audit        # audits SQL (immutabilité + équilibre comptable)
make logs         # logs compose
make reset        # ⚠️ réinitialisation complète (taper RESET)
```
