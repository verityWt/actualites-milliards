# Influence — architecture et méthodes (26 novembre 2026)

## Contenus mis en production avec cette évolution
- Tableaux descriptifs : origines de fortune (`self`, `herit`, `mix`, non renseigné), pays, âge, secteurs ; nombre de personnes et dénominateur affichés.
- Graphe SVG interactif de groupe économique → personnalités ; toutes les relations demeurent accessibles aussi comme liens HTML.
- Jusqu'à neuf cartes d'entreprise avec logo SVG lorsqu'une référence de marque a été identifiée ; monogramme en remplacement pendant le chargement ou si le logo manque.
- 14 pages individuelles de groupes économiques, avec titres et descriptions partageables, fichiers dans `/influence/reseaux/<groupe>/`.
- Exports SVG de graphes avec marque Actualites.fr et référence au classement Forbes 2026.
- Liens partageables et réseaux sauvegardés dans `localStorage` sur l'appareil (pas de surveillance e-mail).
- Trois études de décisions publiques documentées : Bill Gates (annonce de dépenses de sa fondation), Elon Musk (projet d'acquisition Twitter 2022), Katharina von Baumbach (activité indépendante KB Design). Références primaires visibles.
- Intelligence Pro : page de découverte, comparaison entre fonctions publiques utilisables et modules prévus ; lien de demande d'accès anticipé via e-mail.

## Calculs et restrictions
- Source des personnes et fortunes : classement Forbes World’s Billionaires 2026 et profils `curated.json`.
- Chaque personne compte une fois dans les répartitions démographiques, selon le pays et le secteur principal du corpus.
- Parts par origine : dénominateur = personnes dont l'origine est **renseignée**. La case « non renseignée » reste visible sur le graphique portant sur la totalité des 207 personnes.
- Un lien groupe-personne provient du **nom d'entreprise indiqué dans la fiche**. Ce n'est pas un titre de propriété vérifié, ni une relation familiale ou un mandat de direction. Les associations s'appuient sur les noms, pas sur une base d'actionnariat complète.
- Les fortunes exprimées en milliards de dollars correspondent à des **estimations datées**, sans addition des participations corporatives ni prétention de liquidités.
- Pas de scores d'intelligence, maladies mentales, infidélité, diagnostics de personnalité, ou risque psychologique individuel.

## Psycho et décisions
Les questions sont formulées sur les décisions et communications publiques : horizons temporels, allocations de capital, succession, modalités de gouvernance. L'objectif est de restituer les documents et contraintes qui permettent au lecteur de réfléchir aux mécanismes de décision. Les travaux généraux en psychologie sociale ne peuvent pas servir à diagnostiquer une personne depuis deux phrases.

Références : Keltner, Gruenfeld & Anderson, *Power, Approach, and Inhibition*, Psychological Review (2003) https://pubmed.ncbi.nlm.nih.gov/12747524/ ; Galinsky et al., *Power and Perspectives Not Taken*, Psychological Science (2006) https://pubmed.ncbi.nlm.nih.gov/17201789/ ; contre-épreuve de réplication https://forrt.org/flora-replication-atlas/doi/10.1111/j.1467-9280.2006.01824.x/ .

## Étude des bibliothèques GitHub
- `cytoscape/cytoscape.js` (MIT) : bon candidat pour un graphe multi-couches et large volume de relations. Non intégré ici car la démo doit rester sans dépendance de rendu distante ni impliquer un graphe de liens juridiques non validés.
- `chartjs/Chart.js` (MIT) : utile si comparaisons temporelles enrichies plus tard ; diagrammes actuels en HTML/CSS pour permettre la lecture sans JavaScript et préserver leurs dénominateurs.
- `simple-icons/simple-icons` : icônes SVG de marques utilisées au cas par cas avec retour monogramme. Les marques restent celles de leurs propriétaires. Pour Walmart, le symbole utilisé est rattaché au fichier Wikimedia Commons « Walmart spark (2025).svg ».
- `dlatk/dlatk` : boîte à outils d'analyse linguistique appropriée à des corpus importants, pas aux deux phrases anciennement analysées. Non installée / non exécutée ici.

## Viralité réelle, sans faux chiffres
L'acquisition est soutenue par 14 pages de réseaux indexables, des liens partageables, une sélection interactive, un graphique exportable en SVG et des accès directs à toutes les biographies. Aucune mesure de croissance, CTR ou conversion n'est encore collectée ou revendiquée.

## Situation payante et Stripe
Le compte Stripe connecté est « VITOO LC », uniquement en mode test. Rien n'établit qu'il constitue le compte commercial de ce nouveau produit Actualites.fr. Les tarifs évoqués historiquement (dont 99 €/mois pour une ancienne offre Actualites Pro et 199 €/mois envisagés pour Intelligence Pro dans le repositionnement milliardaires) ne sont pas publiés comme des prix définitifs.
Pas de Checkout activé, d'abonnement récurrent, de webhook déployé ni d'entitlement premium validé pour ce nouveau site. Une mise en vente demandera un compte Stripe autorisé pour Actualites.fr, un stockage serveur des droits d'accès, un webhook signé, un portail client et la livraison réelle des alertes.

## Vérification
- Compilation Cloudflare Pages en préproduction : **à vérifier après dernier commit**.
- Tests locaux isolés : fonctions d'agrégation et générateur de rendu exécutés avec données de démonstration ; trois études, quatre graphiques et contrôles de partage observés.
- Audit navigateur : tableaux et graphe visibles sur 1920 px et 390 px, sans débordement horizontal. Réseau Google sélectionné, URL mise à jour, sélection conservée localement.
- GitHub Actions : toujours non exécutable pour ce dépôt en raison du problème de facturation déjà identifié.
