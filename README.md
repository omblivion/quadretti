# quadretti

React app for drawing geometric shapes on graph paper, with live symmetry and PDF export.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview the production build |

## Docker

```bash
docker compose up --build
```

The app is served at [http://localhost](http://localhost). Override the host port with `HOST_PORT=8080 docker compose up --build`.

See [DESIGN.md](DESIGN.md) for product and interaction details.
