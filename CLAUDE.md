# Consignes pour Claude — projet compta Kalonia

## Communication avec Benoît
- Répondre en français, simplement, sans jargon technique inutile.
- Discuter et faire valider avant de construire une fonctionnalité nouvelle ou de toucher à la fiscalité.
- Ne jamais modifier une fonctionnalité existante (Recettes, Dépenses, etc.) sans avoir demandé à Benoît.
- Toute affirmation fiscale ou juridique : dire clairement si elle est vérifiée sur une source officielle, sourcée par des sites secondaires, ou non vérifiée — et renvoyer vers Cerfrance quand ce n'est pas certain.
- Ne jamais modifier un texte juridique du site kerbooth360.fr (CGV, politique de confidentialité, mentions légales) sans avoir d'abord montré le nouveau texte à Benoît et obtenu son accord.
- Quand une même erreur revient deux fois, ajouter ici une consigne courte et vérifiable qui l'empêche, et le signaler à Benoît.

## Mémoire du projet
- Avant de travailler, lire le sommaire de `docs/DECISIONS.md` (journal de toutes les décisions prises avec Benoît) et la section utile.
- Chaque décision validée par Benoît est ajoutée à `docs/DECISIONS.md` (numéro, date, décision, statut de vérification) **dans le même commit que le code**. Une décision n'est jamais effacée : on la marque « remplacée par D-xx ».
- Jamais de secret (clé API, mot de passe) dans ces fichiers.

## Redéploiement
À chaque fois qu'un changement doit être déployé, donner les trois commandes habituelles, une par bloc (le terminal de Benoît colle mal les commandes sur plusieurs lignes) :

```
cd ~/compta-ferme
```
```
git pull origin claude/nice-allen-01aafu
```
```
docker compose up -d --build
```

Puis, pour vérifier : `docker compose logs -f app` (attendre `Ready`, quitter avec `Ctrl+C`).

## Reste à faire
Voir `docs/MISE-EN-PRODUCTION.md` (liste priorisée). Décisions : `docs/DECISIONS.md`.
