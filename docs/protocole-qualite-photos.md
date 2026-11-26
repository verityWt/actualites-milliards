# Protocole photo Actualites.fr — 26 novembre 2026

Le fichier `data/photos.json` comporte **207 fiches** et **210 candidatures photographiques** au début de cette révision. La première photo était automatiquement choisie, même si son cadrage, sa netteté, sa date et son identité n'étaient pas évalués.

## Correction déployée

- La propriété `editorial_priority` désigne la préférence visuelle de l'éditeur et détermine l'image utilisée dans les cartes et sur la fiche. Cela ne vaut pas vérification de l'identité ni acquisition de droits.
- La fiche Jean-Louis van der Velde utilise désormais l'URL Hearst transmise par l'éditeur, qui s'est chargée en navigateur (769 × 768 px). L'ancienne photographie Indodax reste dans les références secondaires.
- Les portraits externes bloqués sont remplacés par des initiales, sans déformation de mise en page.
- Le build produit `data/photo-audit.json` avec une **file exhaustive des profils à revoir**, triée par nombre de vérifications manquantes.

## File de vérification

Pour chaque personne :
1. Recherche Google Images associant nom complet et portrait, puis recherche LinkedIn/organisations officielles. L'outil publie les **requêtes à effectuer** : il ne prétend pas avoir analysé les résultats.
2. Examiner au moins deux sources indépendantes pour éviter la confusion entre homonymes, dirigeants portant le même prénom, partenaires et dirigeants historiques.
3. Vérifier la lisibilité à petite taille (64 px), la résolution, le visage réellement visible et le cadrage.
4. Identifier l'éditeur, l'auteur, la date et les conditions de réutilisation. Une image accessible n'est pas nécessairement librement reproductible.
5. Conserver des fichiers de preuves et inscrire les champs `identity_verified`, `publication_autorisee`, `visual_reviewed_at`, `image_width`, `image_height` après vérification effective.
6. Si la photographie est refusée ou ne se charge pas, utiliser la variante autorisée ou un portrait typographique.

Les photos acquises sous licence, celles des organisations avec droits explicites et les images compatibles de Wikimedia Commons peuvent être hébergées localement. Éviter la dépendance prolongée à un service externe et les reprises sans autorisation.

## État réel

Les 210 photos initiales étaient toutes dépourvues de confirmation d'identité enregistrée ; 203 avaient une licence non renseignée. Cela n'établit pas qu'elles représentent la mauvaise personne. Les données photographiques ne sont **pas encore entièrement révisées**. La file d'audit suit le travail restant.

Pour consulter la file : `https://actualites.fr/data/photo-audit.json`.
