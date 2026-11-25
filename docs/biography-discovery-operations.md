# Enrichissement continu des 207 biographies

Version : 26 novembre 2026. Le moteur est hébergé sur Cloudflare et fonctionne hors de la conversation ChatGPT.

## Flux automatique déployé

- **Déclencheur** : `actualites-wealth-research`, Cron `*/15 * * * *`. Il conserve sa collecte générale et lance en parallèle `discoverBatch` via la liaison `BIOGRAPHY`. Le quota Workers Free de cinq déclencheurs Cron reste respecté.
- **Inventaire** : 207 profils dérivés du classement Top 200 Forbes 2026 et de 7 profils supplémentaires.
- **Lot** : 4 profils à chaque déclenchement. Une rotation théorique couvre 207 entrées en 52 quarts d'heure, soit environ 13 heures, en l'absence de défaillance. Un échec est journalisé et retenté à un cycle ultérieur.
- **Identité** : recherche Wikidata avec filtrage des homonymes ; correspondance des libellés, occupations et suffixes familiaux `Sr.`/`Jr.`. Si l'identité est ambiguë, aucun extrait individuel n'est associé.
- **Encyclopédie** : récupération des introductions Wikipédia FR/EN, jusqu'à cinq extraits thématiques, de leurs URL canoniques et de leurs références de presse/institutions externes. Les liens de référence sont des pistes documentaires **non relues**.
- **Affichage** : les 207 pages de Cloudflare Pages comprennent un bloc `data-wiki-profile`, chargé par `assets/wiki-live.js`. Au premier accès, l'API complète à la demande les sources absentes.
- **Attribution** : passages clairement identifiés comme extraits Wikipédia, lien article et licence CC BY-SA 4.0. Aucun texte n'est présenté comme un article original d'Actualites.fr.
- **Stockage** : Cloudflare KV `actualites-biography-discovery-v1`, liaison `BIOGRAPHY` dans le worker Cron et `RESEARCH` dans le worker public. Succès mis en cache sept jours ; recherches infructueuses réessayées après dix minutes. Le cache KV est éventuellement cohérent et les mises à jour ne sont pas instantanées dans tous les centres de données.
- **API** : `https://actualites-biography-discovery.actualites-fr-next.workers.dev/status` ; `/profiles/<slug>`. L'API est en lecture HTTP GET mais peut déclencher une collecte sur un cache manquant pour les seuls slugs autorisés.

## Ce qui est réellement automatisé

Recherche d'identifiants, récupération de documents encyclopédiques et de liens complémentaires, rotation, cache, disponibilité par fiche et affichage client. Le statut `encyclopedic_sources_found` indique une collecte réussie, **pas** une corroboration indépendante des assertions.

## Ce qui ne l'est pas encore

- Rédaction de plusieurs articles originaux pour chaque personne à partir d'un corpus de plusieurs sources.
- Analyse des contradictions, vérification des affiliations à partir de plusieurs documents primaires, actualisation automatique des anciennes informations contradictoires.
- Exécution de nouveaux modèles de langage comportemental ou validation psychométrique.
- Réindexation SEO systématique des textes importés par JavaScript : les pages statiques conservent leur contenu initial pour les robots ne chargeant pas le JavaScript.

## Contrôles réalisés

- Test isolé du Worker de préproduction : profils Bill Gates (homonymes distincts), Sergey Brin, Elon Musk, Larry Ellison et Bernard Arnault.
- Production vérifiée : API sur Bill Gates et Larry Ellison, avec articles Wikipédia et passages thématiques.
- Déclencheur Cron et bindings KV vérifiés avec l'API Cloudflare.
- Compilation Cloudflare Pages vérifiée sur la branche de travail avant fusion.
- Tests `npm run test:all` disponibles dans le dépôt. Un job GitHub Actions a été tenté, mais GitHub a refusé de le lancer **avant l'exécution de toute étape**, signalant un problème de facturation. Le workflow a été retiré pour éviter un échec permanent ; ces tests restent exécutables localement ou par un autre système CI.
- L'exécution d'un cycle complet de 207 fiches et le contrôle visuel navigateur complet ne sont pas encore confirmés.

## Risques à surveiller

Quota HTTP et disponibilité Wikimedia, homonymes, changements de contenu Wikipédia, actualité des données, licence des reproductions et limites de l'indexation des textes chargés par JavaScript. Les nouveaux faits personnels sensibles ne sont pas inférés par le moteur.
