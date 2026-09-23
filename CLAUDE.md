# Consignes pour Claude — projet compta Kalonia

## Communication avec Benoît
- Répondre en français, simplement, sans jargon technique inutile.
- Discuter et faire valider avant de construire une fonctionnalité nouvelle ou de toucher à la fiscalité.
- Toute affirmation fiscale ou juridique : dire clairement si elle est vérifiée sur une source officielle, sourcée par des sites secondaires, ou non vérifiée — et renvoyer vers Cerfrance quand ce n'est pas certain.

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
Voir `docs/MISE-EN-PRODUCTION.md` (liste priorisée).
