# Compta ferme & activités

Outil de comptabilité auto-hébergé, piloté par IA, pour un exploitant en
micro-BA (maraîchage, avec TVA et 1 salarié) et deux activités micro-BIC
(revente de fruits/légumes, location de photobooth Kerbooth 360°).

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack technique, schéma
  de données, décisions et ajustements pris phase par phase.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — développement local et
  déploiement sur le VPS (Docker, Caddy, sauvegardes).
- [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — guide de test avec des
  données réelles, avant de se passer d'un expert-comptable.
- [`n8n/workflows/README.md`](n8n/workflows/README.md) — import et
  vérification des workflows n8n (capture email, alertes, rapports).

## Démarrage rapide (développement local)

Voir `docs/DEPLOYMENT.md` — en résumé :

```bash
cd apps/web
cp ../../.env.example .env   # puis ajuster les valeurs
npm install
docker compose -f ../../docker-compose.yml up -d db
npm run db:migrate
npm run dev
```
