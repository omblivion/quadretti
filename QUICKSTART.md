# quadretti — applicazione React

Progetto Vite + React 19 + TypeScript. Il disegno vive interamente nel browser: non serve un backend.

## Requisiti

- Node.js 20 o successivo
- npm

## Avvio in locale

```bash
npm install
npm run dev
```

Aprire [http://localhost:5173](http://localhost:5173).

## Build di produzione

```bash
npm run build
```

## Docker

```bash
docker compose up --build
```

L'interfaccia è disponibile su [http://localhost](http://localhost).

## File principali

- `src/App.tsx`: logica dell'editor, disegno, simmetria e riempimenti
- `src/index.css`: interfaccia e stile grafico
- `src/main.tsx`: ingresso React
- `DESIGN.md`: specifiche funzionali e di design

Il foglio parte vuoto e tutto il disegno viene gestito nel browser.
