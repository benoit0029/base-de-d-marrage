# Dossier partenaire Kerbooth (jour J)

Ce dossier garde les documents du zip « jour J » pour le partenaire
Kerbooth, pour qu'ils ne dépendent d'aucune conversation :

- `GUIDE-DEPLOIEMENT-PARTENAIRE.md` : installation de son appli, pas à pas ;
- `MEMO-STATUT-JURIDIQUE-DEUX-ASSOCIES.md` : mémo « statut à deux », à
  faire valider par Cerfrance / un juriste.

## Régénérer le zip (quand Benoît le demande)
1. Mettre à jour la référence du commit en tête du guide (`git rev-parse
   --short HEAD`) et ce qui a changé depuis.
2. Dossier `kerbooth-partenaire/` contenant ces deux fichiers et
   `code-source/` = `git archive HEAD`, **sans** `CLAUDE.md`,
   `docs/MISE-EN-PRODUCTION.md`, `docs/DECISIONS.md` ni `docs/partenaire/`
   (documents propres à Benoît).
3. Zipper en `kerbooth-partenaire-jourJ.zip` et l'envoyer à Benoît.
