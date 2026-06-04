# CBCNexus Web

Next.js + TypeScript frontend for the CBCNexus platform.

## Run locally

```bash
cd web
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the Node API, usually `http://localhost:4000`.

## Routes

- `/` platform map
- `/login` auth entry point
- `/<role>` live dashboard, where role is `hq`, `school`, `principal`, `teacher`, `student`, `parent`, `finance`, or `shared`
- `/notifications` unified inbox
- `/forgot-password` password recovery
- `/first-login` setup flow for new accounts
