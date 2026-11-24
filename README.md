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
