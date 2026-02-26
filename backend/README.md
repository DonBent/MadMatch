# Backend

Node.js/Express API serving tilbud data.

## Setup

```bash
cd backend
npm install
npm start
```

Server runs on port 4001.

## Endpoints

- `GET /api/tilbud` - All tilbud (optional query params: butik, kategori)
- `GET /api/tilbud/:id` - Specific tilbud
- `GET /api/butikker` - List of stores
- `GET /api/kategorier` - List of categories
- `GET /health` - Health check

## Testing

```bash
npm test
```
