# MadMatch

MadMatch MVP - Tilbudsoversigt

## Epic 1 - Tilbudsoversigt

Implementation af Issue #1 (Epic 1) med følgende features:

- ✅ Vis minimum 10-15 tilbud fra mock JSON-data
- ✅ Hver vare viser: navn, butik, normalpris, tilbudspris, rabat%
- ✅ Filtrering på butik og kategori
- ✅ Responsivt design (desktop + mobil)

## Teknisk Stack

- **Frontend**: React 18
- **Backend**: Node.js/Express
- **Data**: JSON-filer (ingen database i MVP)
- **Hosting**: Lokal server på port 4001

## Projektstruktur

```
MadMatch/
├── backend/
│   ├── data/
│   │   └── tilbud.json       # Mock data (15 tilbud)
│   ├── server.js             # Express API server
│   ├── server.test.js        # Backend tests
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── TilbudCard.js
│   │   │   ├── TilbudCard.css
│   │   │   ├── FilterBar.js
│   │   │   └── FilterBar.css
│   │   ├── services/
│   │   │   └── tilbudService.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── App.test.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Kom i gang

### 1. Backend

```bash
cd backend
npm install
npm start
```

Backend kører på `http://localhost:4001`

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend kører på `http://localhost:3000`

## API Endpoints

- `GET /api/tilbud` - Hent alle tilbud (optional query params: butik, kategori)
- `GET /api/tilbud/:id` - Hent specifikt tilbud
- `GET /api/butikker` - Hent liste af butikker
- `GET /api/kategorier` - Hent liste af kategorier
- `GET /health` - Health check

## Testing

### Backend

```bash
cd backend
npm test
```

### Frontend

```bash
cd frontend
npm test
```

## Features

### Tilbudsoversigt
- Viser 15 forskellige tilbud fra 3 butikker (Rema 1000, Netto, Føtex)
- 9 forskellige kategorier (Kød, Mejeri, Frugt, Drikkevarer, Fisk, Brød, Grøntsager, Tørvarer, Snacks)
- Beregnet rabat% og besparelse

### Filtrering
- Filter på butik via dropdown
- Filter på kategori via dropdown
- Nulstil-knap til at fjerne alle filtre
- Dynamisk opdatering af tilbudsliste

### Responsivt Design
- Desktop: Grid layout med 3-4 kolonner
- Tablet: 2 kolonner
- Mobil: 1 kolonne
- Touch-friendly UI elementer

## Observability

Backend logger alle requests med:
- Timestamp
- HTTP method
- Path
- Antal returnerede tilbud ved filtrering

## Migration & Rollback

Ikke relevant for MVP - ingen database migrations.

## Correlation ID

`ZHC-MadMatch-20260226-001`

## License

MIT
