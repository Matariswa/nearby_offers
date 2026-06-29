# Nearby Offers

Location-based web application for discovering nearby shops and their latest offers.

## Getting Started

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Project Structure

```
app/              Next.js App Router pages
components/       Reusable UI and layout components
firebase/         Firebase client configuration
hooks/            Custom React hooks
lib/              Shared utilities
services/         API / data service layer
styles/           Global styles
types/            TypeScript type definitions
utils/            Helper functions
public/           Static assets
```

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS 4
- Firebase (Auth, Firestore, Storage)
- ESLint + Prettier
