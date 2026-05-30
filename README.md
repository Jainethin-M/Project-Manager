# DevVault

DevVault is a self-hosted developer project control center. It stores project metadata, local dev details, hosting information, environment mappings, commands, links, and notes in MongoDB.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- MongoDB

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Set these environment variables before starting the app:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=devvault
```

## Optional demo data

```bash
npm run seed
```

## Reset project data

```bash
npm run db:reset
```

## JSON backup

Use the header actions in the app, or call:

- `GET /api/backup/export`
- `POST /api/backup/import`

## Notes

Env values marked `Encrypted` are stored as hashes, not plaintext. This project still has no authentication layer by default, so add your own auth before exposing it publicly.
