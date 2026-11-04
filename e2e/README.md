# BrainSpace end-to-end tests

Playwright journeys through the real stack: the built API (`backend/dist`), the built web app
(`vite preview`, same origin) and the Python AI worker with its test-only provider stub.

```bash
npm ci --prefix backend && npm run build --prefix backend
npm ci --prefix frontend && npm run build --prefix frontend
npm ci --prefix e2e && npx --prefix e2e playwright install chromium
E2E_MONGODB_URI=mongodb://127.0.0.1:27017 npm test --prefix e2e
```

`E2E_MONGODB_URI` must point at a **disposable** MongoDB; each run creates a uniquely named database.
Ports 8800 (API) and 4300 (web) must be free. Traces and screenshots of failures are kept in
`test-results/`.
