# Behavioral Lab — protocole expérimental et informations personnelles

Version : 2026-11-25. Ce document décrit le périmètre expérimental, pas des résultats obtenus.

## Ce qui peut être étudié sur des personnalités publiques
- Discours et interviews **attribués** : évolution des thèmes, fréquence lexicale, cadrage, degré de certitude exprimé dans un texte, sentiment *du texte*, sujets traités et changement de vocabulaire.
- Décisions économiques **documentées** : annonces, chronologies, transactions, positions publiques et écarts entre déclarations datées. Les motivations ne sont pas déduites.
- Comportements **publiquement observés** : déclarations et actions concrètes, avec les circonstances et les contre-exemples.
- Famille et vie sentimentale : seulement faits explicitement annoncés ou établis par des sources publiques fiables, sans extrapolation sur la situation présente.
- Goûts, loisirs, sports et préférences : déclarations explicites, datées et attribuées. Éviter les généralisations à partir d'une seule interview.

## Expériences possibles
| Méthode | Bibliothèque candidate | Mesure | Limite |
|---|---|---|---|
| Lexique et fréquence | Code interne / Empath | Occurrences, thèmes lexicaux | Sensible au contexte et aux traductions |
| Classification de ton | TweetNLP | Ton d'un extrait | Les modèles peuvent diverger ; un ton n'est pas un état mental |
| Émotions dans un texte | pysentimiento | Étiquettes produites par un modèle | Conditions de licence non commerciale à vérifier ; aucune inférence clinique |
| Thèmes de discours | BERTopic | Regroupement d'extraits par thèmes | Dépend du corpus et des hyperparamètres |
| Similarité de propos | sentence-transformers | Distance entre formulations | Proximité sémantique ne prouve ni accord ni collaboration |
| Expérience de sensibilité | Code interne | Variation des comptes selon le prétraitement | Aucun pouvoir psychométrique |

Le tableau présente des candidats techniques. Aucun de ces modèles externes n'est encore exécuté ou intégré à la production.

## Publications interdites par la méthode
Ne pas produire des probabilités ou des classements individuels de : sexualité ou pratiques intimes ; addiction sexuelle ; fidélité ou infidélité ; troubles mentaux ; orientation sexuelle ; vulnérabilités relationnelles ; « dangerosité sexuelle » ; probabilité de divorce ; secrets sentimentaux. Un avertissement « expérimental » ne transforme pas ces inférences non étayées en informations publiables.

Ne pas créer de fausses affirmations sur la vie privée, même à titre de simulation. Les essais purement synthétiques peuvent utiliser des personnages fictifs clairement désignés.

## Tests avant exposition de résultats de modèles
1. Corpus daté avec URL canonique, transcription fidèle, langue, auteur de la déclaration et contexte.
2. Distinguer citation exacte, traduction et commentaire journalistique.
3. Consigner version, paramètres, licence, coût et reproductibilité de chaque modèle.
4. Comparer au moins deux méthodes et un témoin lexical simple sur un jeu annoté indépendant.
5. Publier par extrait les divergences et erreurs connues, sans score psychologique d'une personne.
6. Contrôle éditorial humain et procédure de correction. Un doute laisse le champ vide.

## Source des assertions
Les données d'une fiche doivent être reliées à une source consultable ; dates d'événement et dates de publication sont distinctes ; aucun lien relationnel ou fait personnel ne doit être inféré d'une simple cooccurrence.
