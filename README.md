# Scoreboard (Docker Compose)

## Lancer
```bash
docker compose up --build -d
```
Ouvrir :
- Display  : http://localhost/display
- Control  : http://localhost/control
- Config   : http://localhost/config

Arrêt
```bash
docker compose down
```
Données: `./data` (persistant). PIN par défaut: `0000` (modifiez-le dans Config).