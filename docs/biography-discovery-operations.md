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

## Mise à jour du 26 novembre 2026 : revue de presse liée aux biographies

Le Worker de découverte récupère désormais, lorsque les sites le permettent, les métadonnées éditoriales des articles cités dans la bibliographie Wikipédia. Le code conserve au maximum deux cartes de presse par personne : titre attribué à l'éditeur, description issue de la page (limitée à 280 caractères), date si présente et URL originale. Les contenus bloqués, non HTML ou sans titre exploitable sont ignorés.

La rotation actuelle est de 4 profils par déclenchement Cron (15 min). La nouvelle implémentation `researchOne` sauvegarde la recherche et l'enrichissement en une seule écriture KV par personne. Les dossiers récents sont réutilisés pendant 24 h ; `batch:last` est écrit à chaque déclenchement, `batch:history` une fois par heure.

### Estimation de capacité

- 96 déclenchements théoriques par jour.
- Au plus 4 écritures de dossier et 1 écriture de synthèse par passage ; une écriture d'historique supplémentaire par heure. À charge maximale, 4 × 96 + 96 + 24 = 504 écritures biographiques quotidiennes, hors rafraîchissements déclenchés par les visites. Le service général de veille peut ajouter environ 192 écritures par jour.
- Environ 36 requêtes réseau externes maximum pour 4 profils entièrement enrichis, plus le collecteur général GDELT (1 requête) : sous le plafond de 50 requêtes externes par invocation des Workers Free, tant que la logique des collecteurs ne change pas.
- Cloudflare KV Free est limité à 1 000 écritures quotidiennes au niveau du plan ; les visites, changements futurs et autres services doivent rester surveillés.

Ces valeurs sont des **estimations calculées à partir du code**, pas des statistiques de facturation Cloudflare. Le moteur conserve les résultats déjà connus si les éditeurs bloquent l'accès.

L'application affiche ces métadonnées comme **articles complémentaires**, jamais comme de nouveaux articles originaux rédigés par Actualites.fr. Les articles de fond autonomes ne sont pas encore automatiquement générés.

### Vérifications de développement

- Tests locaux isolés de l'extraction de métadonnées, du rejet des domaines non autorisés et du cache.
- Test simulé sur 4 fiches : rotation sans doublons, nombre d'écritures KV borné.
- La compilation du Worker en préproduction Cloudflare est confirmée.
- Le contrôle visuel complet dans un navigateur n'est pas encore réalisé.
- GitHub Actions reste bloqué par un incident de facturation du compte, signalé le 25 novembre 2026.
