# Vite React + Nginx + Node Express + MongoDB

This project is a full-stack application scaffolded with:

- React frontend built with Vite
- Nginx to serve frontend assets and proxy API requests
- Node.js + Express backend
- MongoDB database
- Docker Compose for local development
- Trivia game with Wikipedia links for answer exploration

## Run locally

1. Install Docker Desktop.
2. From the project root, run:
   ```bash
   docker compose up --build
   ```
3. Open http://localhost:3000

## API

The backend API is available at `http://localhost:4000/api` and the frontend proxies requests through Nginx.
