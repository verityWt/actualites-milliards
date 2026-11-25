# Actualites.fr, le monde des milliards

Site statique généré par `node build.mjs` dans `dist/` (aucune dépendance).

- `data/forbes2026-top200.psv` : rang, nom, fortune (Md$), âge, pays, secteur. Source : Forbes, World's Billionaires 2026 (données au 1er mars 2026).
- `data/details-fr.psv` : entreprises, rôle, fait clé (réécrit en français), origine de la fortune.
- `data/curated.json` : biographies vérifiées, séparations annoncées (Billion Singles) avec source et date, fiches hors top 200.
- `src/` : accueil (quiz, Billionaire Dream, Billion Singles), styles, rosaces guillochées, calculateur.

## Déploiement
Cloudflare Pages, branché sur ce dépôt : commande de build `npm run build`, dossier de sortie `dist`. Chaque push sur `main` est mis en ligne.

## Règles éditoriales
Chiffres datés et sourcés. Situation sentimentale publiée seulement si annoncée publiquement, avec source. Aucune adresse, aucun lieu fréquenté, aucun moyen de contact.


## Wealth Research (en cours de validation)
La branche de développement `feat/research-evidence-enrichment-20261125` ajoute la classification de candidats documentaires, le rapprochement d'entités par nom complet, le regroupement de titres semblables et une temporisation en cas de quota GDELT.

- `npm run test:research` : tests locaux (non encore validés par GitHub Actions).
- `workers/wealth-research.mjs` : Worker Cloudflare avec déclencheur programmé et endpoint `/status`.
- `workers/research-intelligence.mjs` : classifications documentaires. Aucune mention d'une personne ne constitue une preuve.
- `docs/wealth-research-operations.md` : suivi de la mise en production et critères de contrôle.

Une version de préproduction a été déployée sur le Worker isolé `actualites-wealth-research-staging`, lié à un KV indépendant. La production n'est pas modifiée. Les résultats de GDELT restent en attente de vérification et aucune chronologie ni profil ne doit être alimenté automatiquement à partir des seuls titres.
