# Protocole d'investigation pour les 207 biographies — version du 26 novembre 2026

**Objectif :** produire des dossiers humains réellement intéressants, avec des assertions contrôlables, et empêcher que l'absence de page Wikipédia rende une personnalité invisible.

## 1. Détection systématique des dossiers insuffisants

À chaque compilation, `scripts/research-backlog.mjs` produit `dist/data/research-backlog.json` avec la liste exhaustive des profils, le nombre de chapitres, d'événements et de domaines sources distincts. Trois classes sont calculées sans score de crédibilité : zéro chapitre, un à trois chapitres, quatre chapitres ou plus.

La file prioritaire classe les dossiers sans chapitre avant les autres. **Un chapitre ne prouve pas une vérification indépendante** : les domaines sont inventoriés seulement pour mesurer la diversité documentaire. Les biographies sans article sont un défaut de couverture à corriger, pas un état acceptable en production.

## 2. Recherche multi-langues, avec repli obligatoire

Chaque entrée possède un plan de recherches utilisant au minimum le nom complet et la société source de fortune. Les requêtes sont déclinées dans les langues du pays, en anglais et en français.

Sources à rechercher, dans cet ordre selon le sujet :
- Sources primaires : société exploitée par la personne, registre commercial, rapports annuels, communiqués institutionnels, site professionnel et déclarations personnelles publiques.
- Presse nationale et **régionale du pays d'origine** : agences nationales, médias économiques, presse locale sur la carrière et les événements de la personne.
- Forbes et autres classements patrimoniaux datés, en distinguant patrimoine estimé, liquidités personnelles et résultats de l'entreprise.
- Wikipédia/Wikidata comme index vers d'autres documents, jamais comme condition préalable au droit d'avoir une biographie.
- Médias internationaux, langues secondaires et archives avec plusieurs graphies du nom, patronymes composés et translittérations.

La tâche Cloudflare `discoverBatch` continue à traiter quatre profils toutes les quinze minutes. Un module de secours `press-discovery.mjs` interroge **Google News RSS en allemand**, quand Wikipédia ne fournit pas de dossier. Il conserve les titres, médias, dates et liens comme **candidats documentaires**. Le support d'autres langues est prévu dans `queryPlan`, mais leur interrogation automatique n'est pas encore implémentée. Une personne sans candidat Wikidata est réessayée, et non bloquée durablement.

## 3. Reconstitution d'une biographie

Chercher, lorsque les sources le permettent : formation, premiers emplois, création d'entreprises, droits de propriété, origine de la fortune, événements économiques, publications, engagements, loisirs publiquement déclarés, relations familiales et sentimentales rendues publiques, controverses et actualités récentes.

Construire **des sections narratives** décrivant les faits, avec dates, changements et contexte. Préférer une distinction éditorialement utile (par exemple date d'immatriculation vs début d'une activité) à un inventaire de mots. Aucun bilan psychologique à partir de déclarations trop courtes.

Les informations de groupe sont utiles pour décrire le milieu économique d'un héritier ; elles ne doivent pas être présentées comme des fonctions exécutives, des décisions ou des revenus personnels non démontrés.

## 4. Recoupements et contradictions

Chaque affirmation doit rester reliée à une source navigable. Lorsqu'il existe deux versions d'une date ou d'un rôle, dater les sources et préciser si elles parlent d'événements différents. Les accords de reprise d'une seule dépêche ne sont pas plusieurs confirmations indépendantes.

Pour les personnes sans présence médiatique régulière, consulter **les registres et les sites officiels** peut être plus utile que des centaines d'articles généralistes. Les homonymes, graphies proches, titres nobiliaires et prénoms composites doivent être contrôlés avant la publication.

Le moteur peut publier les liens et titres de pistes documentaires comme références à explorer. Il ne présente pas automatiquement ces liens comme des articles lus, des faits confirmés ou des biographies rédigées.

## 5. Contrôles de publication

- Biographie datée et attribuée à chaque dossier enrichi.
- Événements datés et URL sources, sans fusion artificielle de dates.
- Vérification syntaxique des sections par `validateResearchProfiles`.
- Tests de régression des recherches RSS, noms homonymes et contrôle des requêtes.
- Backlog exhaustif des dossiers manquants.
- La compilation du site ne doit pas échouer lorsqu'un dossier reste incomplet : son absence doit **apparaître dans le backlog** et être poursuivie par la collecte.

## 6. Limites actuelles de l'automatisation

**En fonctionnement :** rotation 207 profils, recherche Wikidata/Wikipédia, source links, documents de presse issus des bibliographies, recherche de secours par Google News RSS pour les dossiers introuvables, cache KV, monitoring de lots, file de dossiers insuffisants à chaque build.

**Pas encore automatisé :** lecture intégrale des articles payants, analyse rédactionnelle indépendante de chaque source externe, traduction des sources avec contrôle de citations, génération de neuf chapitres originaux pour les 207 personnes. La fiche de Katharina von Baumbach a été rédigée après recherche documentaire spécifique, et sert de cas de régression.

## 7. Cas de test Katharina von Baumbach

Sources recoupées :
- Forbes : héritière de Boehringer Ingelheim, fortune estimée.
- Site `kb-design.de/about-us` : activité actuelle, KB Bags depuis 2020, lieux de travail, rôle de dirigeante.
- Mentions légales `kb-design.de/imprint-kb-design` et registres de Munich : société KB Design GmbH, immatriculation en 2021.
- Abendzeitung Munich : études, Käfer, activité événementielle à partir de 2025.
- SWR / Tagesschau, agence dpa : fiançailles annoncées le 20 octobre 2026.
- Communiqué Boehringer Ingelheim du 15 juillet 2026 : ventes et activité du groupe, sans les attribuer personnellement à Katharina.

Le dossier compte neuf chapitres, six événements datés et plusieurs rubriques personnelles publiques. Un test empêche sa disparition du corpus éditorial.
