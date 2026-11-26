# Photo Intelligence — récupération automatique Wikimedia, 26 novembre 2026

## Raison

Les 207 fiches comportent 211 URL candidates dans le corpus photo actuel. Les images sont souvent issues de pages de presse, parfois anciennes, mal cadrées, d'accès incertain ou sans droits de republication documentés. Une sélection manuelle de toutes les pages ne peut pas servir de mécanisme de maintenance.

## Nouveau moteur exécuté sur Cloudflare

Le Worker existant `actualites-wealth-research`, déjà programmé `*/15 * * * *`, lance maintenant une troisième tâche indépendante : `runPortraitCycle` dans `workers/portrait-auto.mjs`.

- Une personne sélectionnée par rotation **toutes les 15 minutes** : un passage sur 207 personnes prend environ 51 h 45 sans interruption.
- Lecture du profil de recherche existant dans KV.
- Refus de la correspondance si la fiche encyclopédique ne contient pas un QID Wikidata et un libellé de personne correspondant exactement au nom de la fiche après normalisation des accents.
- Recherche des données du QID : l'élément doit être un humain (P31 = Q5), son libellé être cohérent et contenir une image P18.
- Lecture des données **directement chez Wikimedia Commons** pour cette image : taille, auteur (si renseigné), licence, URL du fichier et page de description.
- Seules les photos d'au moins **640 × 640 pixels**, hébergées sur `upload.wikimedia.org` et sous licence reconnue CC BY/CC BY-SA/CC0/domaine public sont déclarées admissibles.
- Si l'identité documentaire, la photo ou la licence manque : aucune image automatique n'est sélectionnée.
- Résultat par profil dans KV sous `photo:<slug>` avec provenance. Les correspondances ne sont jamais présentées comme une vérification biométrique indépendante.

**Coût maximal estimé :** 1 écriture KV par déclenchement si la fiche doit être actualisée, soit 96 écritures par jour au maximum. Cache d'une semaine pour les fiches déjà examinées ; la rotation réessaie les personnes sans image lors d'un passage ultérieur.

## Publication sur le site

Les fiches individuelles interrogent `https://actualites-biography-discovery.actualites-fr-next.workers.dev/photos/<slug>` via `src/portrait-auto.js`. Si une image éligible existe, le navigateur la précharge et substitue cette image au portrait principal préexistant ; la source, le photographe et la licence sont visibles sur la photographie. La photo initiale reste dans la liste des replis. Le fichier ne modifie pas `data/photos.json`, pour préserver la traçabilité du catalogue de départ.

**Exception explicite :** une photo éditoriale dont la priorité est d'au moins 100, comme celle sélectionnée par l'éditeur pour Jean-Louis van der Velde, reste prioritaire et n'est pas remplacée par le robot.

## Contrôle et limites

- API `/photos/status` : nombre de personnes inspectées et cadence.
- API `/photos/<slug>` : résultat, source, licence et dimensions pour un profil ; lecture seule.
- Dashboard `/photos-a-verifier/` : progression de la collecte et décisions humaines exportables.
- Aucun téléchargement massif de Google Images ou LinkedIn : l'accès public à un moteur de recherche n'accorde pas les droits de republication.
- Le robot n'effectue ni reconnaissance faciale ni vérification indépendante par deux photographies de la même personne. Wikidata peut contenir des erreurs. Les résultats dont les preuves sont insuffisantes restent exclus.
- Pas de certificat de licence : les champs Wikimedia restent des déclarations à contrôler lorsqu'une publication commerciale l'exige, notamment pour l'identité, les droits de la personnalité ou un retrait.
- Les fiches sans P18 fiable restent sur leur image précédente, avec fallback sur les autres sources puis monogramme.
- L'automatisation est dépendante du bon fonctionnement du Cron existant, des quotas Cloudflare et de l'accès aux API Wikimedia.

## Vérification d'intégration

Le Worker en préproduction a compilé avec le module `portrait-auto.mjs`. Une requête réelle sur Bill Gates a renvoyé un portrait de 642 × 962 pixels avec attribution Wikimedia Commons et licence CC BY 4.0. Ce résultat valide le chemin de collecte et les contrôles de métadonnées ; il ne valide pas 207 identités ni une inspection visuelle intégrale.

## Travaux ultérieurs

La base publique gagnerait à stocker les portraits approuvés dans R2 avec leur licence et une copie de la page source au moment de la vérification, sous réserve d'autorisation de republication. Un détecteur de doublons perceptuels et un contrôleur de visage centré pourraient compléter le contrôle de cadrage mais ne sauraient établir seuls l'identité d'une personne.
