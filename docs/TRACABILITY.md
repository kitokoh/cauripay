# CauriPay — Matrice de traçabilité (GOURSI-QA7)

> Chaque exigence de la spec est tracée vers une ou plusieurs issues du backlog GOURSI (#138–#271),
> organisées en blocs G0→G6 (milestones GitHub). Mise à jour : 2026-08-14.

## Couverture

| Bloc | Milestone | Issues | Exigences spec couvertes |
|---|---|---|---|
| G0 | G0 — EPIC-G0 | 15 issues enfants | GOURSI-001 (acceptance) + §3.9 application.yml, GOURSI-001 (§1), GOURSI-002, GOURSI-002 (fichiers infra/docker/), GOURSI-002 (§1.2, §3.9), GOURSI-003… |
| G1 | G1 — EPIC-G1 | 26 issues enfants | GOURSI-010, GOURSI-011, GOURSI-011 (acceptance), GOURSI-012, GOURSI-013, GOURSI-014… |
| G2 | G2 — EPIC-G2 | 37 issues enfants | GOURSI-020, GOURSI-020 (acceptance), GOURSI-021, GOURSI-021 (acceptance), GOURSI-022, GOURSI-022 (acceptance)… |
| G3 | G3 — EPIC-G3 | 13 issues enfants | GOURSI-030, GOURSI-030 (acceptance), GOURSI-031 (acceptance), GOURSI-032 (acceptance), GOURSI-033, GOURSI-033 (acceptance) |
| G4 | G4 — EPIC-G4 | 22 issues enfants | GOURSI-040, GOURSI-040 (acceptance), GOURSI-041, GOURSI-041 (acceptance), GOURSI-042, GOURSI-042 (acceptance)… |
| G5 | G5 — EPIC-G5 | 6 issues enfants | GOURSI-050, GOURSI-050 (acceptance), GOURSI-051 (acceptance) |
| G6 | G6 — EPIC-G6 | 8 issues enfants | GOURSI-003 (complément), REVUE-CONSTITUTION.md §4, Transversal, §8.4, §8.4 (zap-baseline), §8.5 |

## Détail par issue

| Issue | Clé | Bloc | Labels | Référence spec |
|---|---|---|---|---|
| #138 | GOURSI-001 | G0 | prio:critical, area:infra, source:goursi_ | GOURSI-001 (§1) |
| #139 | GOURSI-001b | G0 | prio:critical, area:infra, source:goursi_ | GOURSI-001 (acceptance) + §3.9 application.yml |
| #140 | GOURSI-002a | G0 | prio:critical, area:infra, source:goursi_ | GOURSI-002 (§1.2, §3.9) |
| #141 | GOURSI-002b | G0 | prio:critical, area:infra, source:goursi_ | GOURSI-002 (fichiers infra/docker/) |
| #142 | GOURSI-002c | G0 | prio:high, area:infra, source:goursi_ | GOURSI-002 |
| #143 | GOURSI-003 | G0 | prio:critical, area:infra, source:goursi_ | GOURSI-003 |
| #144 | GOURSI-004a | G0 | prio:critical, DX, source:goursi_ | GOURSI-004 |
| #145 | GOURSI-004b | G0 | prio:critical, testing, source:goursi_ | GOURSI-004 (acceptance) + §2.3 |
| #146 | GOURSI-005a | G0 | prio:critical, area:infra, source:goursi_ | GOURSI-005 |
| #147 | GOURSI-005b | G0 | prio:critical, security, area:infra, source:goursi_ | GOURSI-005 (acceptance) |
| #148 | GOURSI-005c | G0 | prio:high, area:infra, source:goursi_ | GOURSI-005 |
| #149 | GOURSI-KC1 | G0 | prio:critical, security, area:auth, source:goursi_ | §1.2 (auth JWT Keycloak) |
| #150 | GOURSI-RMQ1 | G0 | prio:critical, area:infra, source:goursi_ | §1.2 |
| #151 | GOURSI-OBS1 | G0 | prio:medium, area:infra, source:goursi_ | §3.9 (management endpoints) |
| #152 | GOURSI-SEC1 | G0 | prio:high, security, source:goursi_ | §1.2 (X-Service-Key) |
| #153 | EPIC-G0 | G0 | epic, prio:critical, area:infra, source:goursi_ | Bloc 0 (§7) |
| #154 | GOURSI-010a | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-010 |
| #155 | GOURSI-010b | G1 | prio:critical, security, service:ledger, source:goursi_ | GOURSI-010 |
| #156 | GOURSI-010c | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-010 |
| #157 | GOURSI-011a | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-011 |
| #158 | GOURSI-011b | G1 | prio:high, service:ledger, source:goursi_ | GOURSI-011 |
| #159 | GOURSI-011c | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-011 |
| #160 | GOURSI-011d | G1 | prio:high, testing, service:ledger, source:goursi_ | GOURSI-011 (acceptance) |
| #161 | GOURSI-012a | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-012 |
| #162 | GOURSI-012b | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-012 |
| #163 | GOURSI-012c | G1 | prio:high, service:ledger, source:goursi_ | GOURSI-012 |
| #164 | GOURSI-013a | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-013 |
| #165 | GOURSI-013b | G1 | prio:high, service:ledger, source:goursi_ | GOURSI-013 |
| #166 | GOURSI-014a | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-014 |
| #167 | GOURSI-014b | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-014 |
| #168 | GOURSI-014c | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-014 |
| #169 | GOURSI-014d | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-014 |
| #170 | GOURSI-014e | G1 | prio:high, service:ledger, source:goursi_ | §6 (table des événements) |
| #171 | GOURSI-014f | G1 | prio:critical, testing, service:ledger, source:goursi_ | GOURSI-014 (acceptance) |
| #172 | GOURSI-014g | G1 | prio:critical, testing, service:ledger, source:goursi_ | §8.3 |
| #173 | GOURSI-015a | G1 | prio:high, service:ledger, source:goursi_ | GOURSI-015 |
| #174 | GOURSI-015b | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-015 |
| #175 | GOURSI-015c | G1 | prio:high, testing, service:ledger, source:goursi_ | GOURSI-015 (acceptance) |
| #176 | GOURSI-016a | G1 | prio:critical, service:ledger, source:goursi_ | GOURSI-016 |
| #177 | GOURSI-016b | G1 | prio:high, service:ledger, source:goursi_ | GOURSI-016 |
| #178 | GOURSI-016c | G1 | prio:high, service:ledger, source:goursi_ | GOURSI-016 |
| #179 | GOURSI-LED1 | G1 | prio:medium, service:ledger, source:goursi_ | §3.9 (management.metrics) |
| #180 | EPIC-G1 | G1 | epic, prio:critical, service:ledger, source:goursi_ | Bloc 1 (§7) |
| #181 | GOURSI-020a | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-020 |
| #182 | GOURSI-020b | G2 | prio:critical, security, service:api-core, source:goursi_ | GOURSI-020 |
| #183 | GOURSI-020c | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-020 (acceptance) |
| #184 | GOURSI-020d | G2 | prio:high, docs, service:api-core, source:goursi_ | GOURSI-020 (acceptance) |
| #185 | GOURSI-021a | G2 | prio:critical, area:database, service:api-core, source:goursi_ | §4.4 |
| #186 | GOURSI-021b | G2 | prio:critical, area:auth, service:api-core, source:goursi_ | GOURSI-021 (acceptance) |
| #187 | GOURSI-021c | G2 | prio:critical, security, area:auth, service:api-core, source:goursi_ | GOURSI-021 (acceptance) |
| #188 | GOURSI-021d | G2 | prio:critical, area:auth, service:api-core, source:goursi_ | GOURSI-021 (acceptance) |
| #189 | GOURSI-021e | G2 | prio:critical, area:auth, service:api-core, source:goursi_ | GOURSI-021 |
| #190 | GOURSI-021f | G2 | prio:high, area:auth, service:api-core, source:goursi_ | GOURSI-021 |
| #191 | GOURSI-021g | G2 | prio:critical, testing, service:api-core, source:goursi_ | GOURSI-021 (acceptance) |
| #192 | GOURSI-022a | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-022 |
| #193 | GOURSI-022b | G2 | prio:high, testing, service:api-core, source:goursi_ | GOURSI-022 (acceptance) |
| #194 | GOURSI-023a | G2 | prio:critical, area:database, service:api-core, source:goursi_ | §4.4 |
| #195 | GOURSI-023b | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-023 (acceptance) |
| #196 | GOURSI-023c | G2 | prio:high, service:api-core, source:goursi_ | §4.3 (FeesService, LimitsService) |
| #197 | GOURSI-023d | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-023 |
| #198 | GOURSI-023e | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-023 |
| #199 | GOURSI-023f | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-023 |
| #200 | GOURSI-023g | G2 | prio:high, service:api-core, source:goursi_ | GOURSI-023 |
| #201 | GOURSI-023h | G2 | prio:critical, service:api-core, source:goursi_ | GOURSI-023 |
| #202 | GOURSI-023i | G2 | prio:critical, testing, service:api-core, source:goursi_ | GOURSI-023 (acceptance) |
| #203 | GOURSI-024a | G2 | prio:critical, service:kyc, source:goursi_ | GOURSI-024 |
| #204 | GOURSI-024b | G2 | prio:critical, service:kyc, source:goursi_ | GOURSI-024 |
| #205 | GOURSI-024c | G2 | prio:high, testing, service:kyc, source:goursi_ | GOURSI-024 (acceptance) |
| #206 | GOURSI-025a | G2 | prio:critical, service:aml, source:goursi_ | GOURSI-025 |
| #207 | GOURSI-025b | G2 | prio:critical, security, service:aml, source:goursi_ | GOURSI-025 |
| #208 | GOURSI-025c | G2 | prio:critical, service:aml, source:goursi_ | GOURSI-025 (acceptance) |
| #209 | GOURSI-025d | G2 | prio:high, security, service:api-core, source:goursi_ | §6 (aml.events → api-core) |
| #210 | GOURSI-026a | G2 | prio:critical, service:notification, source:goursi_ | GOURSI-026 |
| #211 | GOURSI-026b | G2 | prio:high, service:notification, source:goursi_ | GOURSI-026 (acceptance) |
| #212 | GOURSI-026c | G2 | prio:high, service:notification, source:goursi_ | GOURSI-026 (acceptance) |
| #213 | GOURSI-026d | G2 | prio:high, service:notification, source:goursi_ | GOURSI-026 (acceptance) |
| #214 | GOURSI-027a | G2 | prio:critical, service:ussd, source:goursi_ | GOURSI-027 |
| #215 | GOURSI-027b | G2 | prio:critical, service:ussd, source:goursi_ | GOURSI-027 (acceptance) |
| #216 | GOURSI-027c | G2 | prio:critical, service:ussd, source:goursi_ | GOURSI-027 (acceptance) |
| #217 | GOURSI-027d | G2 | prio:high, testing, service:ussd, source:goursi_ | GOURSI-027 (acceptance) |
| #218 | GOURSI-030a | G3 | prio:critical, service:business, source:goursi_ | GOURSI-030 (acceptance) |
| #219 | GOURSI-030b | G3 | prio:critical, service:business, source:goursi_ | GOURSI-030 |
| #220 | GOURSI-030c | G3 | prio:critical, service:business, source:goursi_ | GOURSI-030 (acceptance) |
| #221 | GOURSI-030d | G3 | prio:high, testing, service:business, source:goursi_ | GOURSI-030 (acceptance) |
| #222 | GOURSI-031a | G3 | prio:critical, service:business, source:goursi_ | GOURSI-031 (acceptance) |
| #223 | GOURSI-031b | G3 | prio:critical, area:webhooks, service:business, source:goursi_ | GOURSI-031 (acceptance) |
| #224 | GOURSI-031c | G3 | prio:high, service:business, source:goursi_ | GOURSI-031 (acceptance) |
| #225 | GOURSI-032a | G3 | prio:high, service:business, source:goursi_ | GOURSI-032 (acceptance) |
| #226 | GOURSI-032b | G3 | prio:high, service:business, source:goursi_ | GOURSI-032 (acceptance) |
| #227 | GOURSI-032c | G3 | prio:high, service:business, source:goursi_ | GOURSI-032 (acceptance) |
| #228 | GOURSI-033a | G3 | prio:high, service:reconciliation, source:goursi_ | GOURSI-033 |
| #229 | GOURSI-033b | G3 | prio:high, service:reconciliation, source:goursi_ | GOURSI-033 (acceptance) |
| #230 | GOURSI-033c | G3 | prio:medium, testing, service:reconciliation, source:goursi_ | GOURSI-033 (acceptance) |
| #231 | EPIC-G2 | G3 | epic, prio:critical, service:api-core, source:goursi_ | Bloc 2 (§7) |
| #232 | EPIC-G3 | G3 | epic, prio:high, service:business, source:goursi_ | Bloc 3 (§7) |
| #233 | GOURSI-040a | G4 | prio:critical, app:mobile-customer, source:goursi_ | GOURSI-040 |
| #234 | GOURSI-040b | G4 | prio:critical, app:mobile-customer, source:goursi_ | GOURSI-040 (acceptance) |
| #235 | GOURSI-040c | G4 | prio:critical, app:mobile-customer, source:goursi_ | GOURSI-040 (acceptance) |
| #236 | GOURSI-040d | G4 | prio:critical, app:mobile-customer, source:goursi_ | GOURSI-040 (acceptance) |
| #237 | GOURSI-040e | G4 | prio:high, app:mobile-customer, source:goursi_ | GOURSI-040 (acceptance) |
| #238 | GOURSI-040f | G4 | prio:medium, app:mobile-customer, source:goursi_ | GOURSI-040 (acceptance) |
| #239 | GOURSI-040g | G4 | prio:high, testing, app:mobile-customer, source:goursi_ | GOURSI-040 (acceptance) |
| #240 | GOURSI-041a | G4 | prio:critical, app:mobile-agent, source:goursi_ | GOURSI-041 |
| #241 | GOURSI-041b | G4 | prio:critical, app:mobile-agent, source:goursi_ | GOURSI-041 (acceptance) |
| #242 | GOURSI-041c | G4 | prio:critical, app:mobile-agent, source:goursi_ | GOURSI-041 (acceptance) |
| #243 | GOURSI-041d | G4 | prio:critical, app:mobile-agent, source:goursi_ | GOURSI-041 (acceptance) |
| #244 | GOURSI-041e | G4 | prio:high, app:mobile-agent, source:goursi_ | GOURSI-041 (acceptance) |
| #245 | GOURSI-042a | G4 | prio:critical, app:web-admin, source:goursi_ | GOURSI-042 |
| #246 | GOURSI-042b | G4 | prio:high, app:web-admin, source:goursi_ | GOURSI-042 (acceptance) |
| #247 | GOURSI-042c | G4 | prio:high, app:web-admin, source:goursi_ | GOURSI-042 (acceptance) |
| #248 | GOURSI-042d | G4 | prio:critical, app:web-admin, source:goursi_ | GOURSI-042 (acceptance) |
| #249 | GOURSI-042e | G4 | prio:critical, app:web-admin, source:goursi_ | GOURSI-042 (acceptance) |
| #250 | GOURSI-042f | G4 | prio:high, app:web-admin, source:goursi_ | GOURSI-042 (acceptance) |
| #251 | GOURSI-043a | G4 | prio:high, app:web-business, source:goursi_ | GOURSI-043 |
| #252 | GOURSI-043b | G4 | prio:high, app:web-business, source:goursi_ | GOURSI-043 (acceptance) |
| #253 | GOURSI-043c | G4 | prio:high, app:web-business, source:goursi_ | GOURSI-043 (acceptance) |
| #254 | GOURSI-043d | G4 | prio:medium, app:web-business, source:goursi_ | GOURSI-043 (acceptance) |
| #255 | GOURSI-050a | G5 | prio:critical, service:dev-gateway, source:goursi_ | GOURSI-050 |
| #256 | GOURSI-050b | G5 | prio:critical, service:dev-gateway, source:goursi_ | GOURSI-050 (acceptance) |
| #257 | GOURSI-050c | G5 | prio:high, area:webhooks, service:dev-gateway, source:goursi_ | GOURSI-050 (acceptance) |
| #258 | GOURSI-051a | G5 | prio:high, service:dev-gateway, source:goursi_ | GOURSI-051 (acceptance) |
| #259 | GOURSI-051b | G5 | prio:high, service:dev-gateway, source:goursi_ | GOURSI-051 (acceptance) |
| #260 | GOURSI-051c | G5 | prio:medium, docs, DX, source:goursi_ | GOURSI-051 (acceptance) |
| #261 | GOURSI-QA1 | G6 | prio:critical, testing, source:goursi_ | §8.4 |
| #262 | GOURSI-QA2 | G6 | prio:high, testing, security, source:goursi_ | §8.4 |
| #263 | GOURSI-QA3 | G6 | prio:high, security, testing, source:goursi_ | §8.4 (zap-baseline) |
| #264 | GOURSI-QA4 | G6 | prio:high, testing, source:goursi_ | §8.5 |
| #265 | GOURSI-QA5 | G6 | prio:high, docs, source:goursi_ | Transversal |
| #266 | GOURSI-QA6 | G6 | prio:medium, DX, source:goursi_ | GOURSI-003 (complément) |
| #267 | GOURSI-ADR1 | G6 | prio:high, docs, source:goursi_ | REVUE-CONSTITUTION.md §4 |
| #268 | GOURSI-QA7 | G6 | prio:high, docs, source:goursi_ | Transversal |
| #269 | EPIC-G4 | G6 | epic, prio:high, app:web-admin, source:goursi_ | Bloc 4 (§7) |
| #270 | EPIC-G5 | G6 | epic, prio:medium, service:dev-gateway, source:goursi_ | Bloc 5 (§7) |
| #271 | EPIC-G6 | G6 | epic, prio:high, testing, source:goursi_ | §8 |
