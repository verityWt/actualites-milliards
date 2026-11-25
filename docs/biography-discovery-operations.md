# Veille biographique continue — état opérationnel

**Activation vérifiée : 25 novembre 2026, 22:45 UTC.**

## Ressources
- **Générateur de site** : `build.mjs`, Cloudflare Pages `actualites-milliardaires`. Le site statique **n'est pas** automatiquement enrichi à chaque passage.
- **Liste** : 207 fiches — Top 200 Forbes 2026 et fiches supplémentaires du corpus `curated.json`.
- **Worker déclencheur** : `actualites-wealth-research`, Cron `*/15 * * * *`, déjà présent avant cette évolution. Sa fonction `collect` demeure active.
- **Nouveau traitement** : `workers/biography-discovery.mjs`, appelé en parallèle de `collect` via `Promise.allSettled`. Un échec d'une tâche ne bloque pas l'autre.
- **Worker lecture seule** : `actualites-biography-discovery`, exposé sur `actualites-biography-discovery.actualites-fr-next.workers.dev`, chemins `/status` et `/profiles/<slug>`.
- **KV original** : `actualites-wealth-research-v1` (identifiant `76fe5058389e4f6d9781a5595e683a1d`).
- **KV biographique distinct** : `actualites-biography-discovery-v1` (identifiant `efa49ac39e834b1ca83773e11c5aba98`).

## Fonctionnement
1. À chaque déclenchement, un index déterministe sélectionne une fiche. Aucun curseur KV partagé n'est modifié. Chaque personne apparaît une fois dans un cycle de 207 déclenchements.
2. Une recherche Wikidata `wbsearchentities` renvoie jusqu'à cinq entités candidates. Ce sont uniquement des **propositions d'identité**, pas des confirmations, des biographies, des relations ou des analyses psychologiques.
3. Le résultat est conservé dans `profile:<slug>`; le dernier passage dans `latest` et `run:<slot>` ; les erreurs dans `error:<slug>`.
4. En cas de panne fournisseur, l'erreur est enregistrée ; le prochain déclenchement traite la fiche suivante, et la fiche échouée sera retentée au cycle suivant.

**Capacité théorique** : 207 × 15 minutes = 51 h 45 par cycle, à condition que les déclenchements surviennent et que les recherches réussissent. Le Cron n'est pas une garantie de temps exact.

## Première preuve de fonctionnement
Lecture Cloudflare KV du 25 novembre 2026, 22:45:30 UTC :
- fiche : `israel-englander`, rang 98 ;
- état : `candidate_found` ;
- Wikidata candidat : `Q16120832`, libellé `Israel Englander` ;
- `verifiedFacts:0`, `analysisStatus:not_executed`, `editorialStatus:pending_independent_review`.

## Étapes restant à automatiser
- Résolution d'identité : pays, entreprises, identifiants et homonymes ; revue des faux positifs.
- Recherche multi-source : déclarations réglementaires, sites des entreprises, rapports annuels, archives de presse ; conserver URI, date, passage précis et droits.
- Extraction de faits et graphe : corroboration indépendante, contradictions apparentes, correction des déclarations périmées.
- Corpus de discours : uniquement documents originaux, attribution vérifiée, dates, versions de transcription, comparaison de modèles et tests.
- Publication : processus de revue et regeneration du site ; aucune publication automatique d'allégations non vérifiées, d'analyses intimes ou d'inférences cliniques.
- Suivi : taux de réussite par cycle, source indisponible, erreurs, retard, nombre de dossiers documentés et dates de dernière validation.

## Quotas
Le compte Cloudflare gratuit était à la limite de cinq déclencheurs Cron. La solution **réutilise** celui du Worker de veille patrimoniale : aucun nouveau déclencheur n'a été ajouté et aucun Cron existant n'a été supprimé. Un passage déclenche désormais deux tâches réseau ; observer les coûts et les limitations des fournisseurs.

## Tests
`npm run test:discovery` exécute les tests déterministes de rotation, dépôt de candidats, erreur fournisseur et lecture seule. Ces tests ont été ajoutés mais leur exécution dans GitHub Actions n'est pas encore confirmée. Le déploiement de modules Cloudflare et le premier passage de production ont été vérifiés.

## Distinguer les états
- `candidate_found` = identifiant Wikidata proposé ; **non confirmé**.
- `verifiedFacts:0` = aucune vérification individuelle menée par ce service.
- `analysisStatus:not_executed` = aucun modèle de comportement exécuté par ce Worker.
- Le contenu statique de la fiche peut avoir été enrichi manuellement par ailleurs et ne doit pas être confondu avec les résultats de cette veille.
