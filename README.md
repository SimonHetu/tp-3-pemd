# Trivia LU

Application Docker multi-services pour un quiz de trivia infini avec des liens Wikipedia.
Les questions repondues peuvent etre sauvegardees comme faits dans MongoDB et affichees dans une liste persistante.

## Stack

- Frontend React avec Vite
- API Node.js + Express
- Database MongoDB
- Reverse proxy nginx
- Environnements de development et de production avec Docker Compose

## Structure du projet

- `client/` — application React et configuration de build de production
- `api/` — API Express et model MongoDB
- `nginx/` — configuration du reverse proxy
- `docker-compose.yml` — environnement de development
- `docker-compose.prod.yml` — environnement de production
- `.env.example` — exemple de variables d'environnement

## Lancement en development

L'environnement de development lance le client Vite, l'API, MongoDB et le reverse proxy nginx.

```bash
docker compose up --build
```

Ouvrir : `http://localhost:3000`

## Lancement en production

Construire les images de production et lancer le stack optimise :

```bash
docker compose -f docker-compose.prod.yml up --build
```

Ouvrir : `http://localhost`

## Routes API

- `GET /api/health`
- `GET /api/trivia`
- `GET /api/items`
- `POST /api/items`
- `DELETE /api/items/:id`

## Variables d'environnement

Copier `.env.example` vers `.env` si un fichier d'environnement local est necessaire pour configurer les services.

- `PORT` — port de l'API, valeur par defaut : `4000`
- `MONGO_URL` — connection string MongoDB utilisee par l'API

## Probleme rencontre

Le navigateur ne peut pas appeler directement les noms de services Docker comme `http://api:4000`, parce que ces noms existent seulement dans le Docker network.
La solution est d'utiliser nginx et des requetes relatives vers `/api` dans le client, afin que nginx route les appels API vers le bon container.

## Notes

- En development, le client React est servi par Vite sur `client:5173` et passe par nginx.
- En production, le client est build et servi comme static assets, pendant que nginx route `/api` vers le service API.
