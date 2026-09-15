# quadretti — applicazione React

Questo archivio contiene il progetto completo del sito **quadretti**, realizzato con React 19, TypeScript e Vinext/Next.

## Requisiti

- Node.js 22.13 o successivo
- pnpm 11 o successivo

## Avvio in locale

```bash
pnpm install
pnpm dev
```

Aprire quindi l'indirizzo mostrato nel terminale, normalmente `http://localhost:5173`.

## Build di produzione

```bash
pnpm build
```

## File principali

- `app/page.tsx`: logica dell'editor, disegno, simmetria e riempimenti
- `app/globals.css`: interfaccia e stile grafico
- `app/layout.tsx`: struttura e metadati della pagina
- `DESIGN.md`: specifiche funzionali e di design

L'applicazione non richiede un backend per le funzionalità attuali. Il foglio parte vuoto e tutto il disegno viene gestito nel browser.
