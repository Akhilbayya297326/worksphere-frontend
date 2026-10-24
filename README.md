# WorkSphere frontend

React and Vite workspace UI for WorkSphere. It requires the separate [WorkSphere backend](https://github.com/Akhilbayya297326/worksphere-backend) for login, persistence, chat, uploads, and AI features.

## Run locally

Use Node.js 22.12 or later. In this repository:

```sh
npm ci
npm run dev
```

Start the backend separately on port `5000`, then open the URL printed by Vite. Vite proxies `/api` and `/socket.io` to `http://127.0.0.1:5000`, including WebSocket traffic. The preview server uses the same proxy.

## Configure hosting

Production builds default to the existing Railway backend: API requests use `https://worksphere-backend-production-e720.up.railway.app/api` and Socket.IO uses the same backend origin, `https://worksphere-backend-production-e720.up.railway.app`. Local development uses Vite's `/api` and `/socket.io` proxies. These environment variables are optional; to use a different backend, copy `.env.example` to `.env.local` and set:

```dotenv
VITE_API_URL=https://api.example.com/api
VITE_SOCKET_URL=https://api.example.com
```

`VITE_API_URL` must include the backend's `/api` prefix; `VITE_SOCKET_URL` is the backend origin. Configure backend `CORS_ORIGINS` to permit the frontend origin. Environment values are embedded at build time, so rebuild after changes. All `VITE_*` values are public: never put database credentials, provider keys, or access tokens in them.

For same-origin production hosting, set `VITE_API_URL=/api`, set `VITE_SOCKET_URL` to the frontend origin, and configure the web server to forward `/api` and `/socket.io` to the backend, including WebSocket upgrades.

## Verify and build

```sh
npm test
npm run lint
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static web host. Vite's preview command is for checking the build locally. The development proxy is not part of the deployed assets; production hosting must provide the proxy or the public backend URLs described above.

Roll out the updated backend before the frontend. Chat now waits for the backend's persistence acknowledgement, so an older backend cannot satisfy the updated send contract. The backend requires a persistent Node.js service such as the existing Railway deployment for Socket.IO connections.

## Current limitations

- Login and persisted workflows depend on a reachable MongoDB database. The last verification encountered a backend MongoDB SRV DNS failure.
- GitHub and Jira depend on valid backend credentials and repository/site settings. The last verification found invalid or missing GitHub configuration and an unavailable Jira endpoint.
- Enterprise document/code retrieval, content extraction, deployment/repository diagnostics, and some workspace connectors remain incomplete. Unavailable operations return errors; sample context, filename-based vault analysis, and ROI demonstration data are not live enterprise integrations.
- Authentication remains a prototype. Signed sessions, server-verified route/socket permissions, and password hashing are required before production use.

Backend provider credentials and connectivity must be configured in the backend repository. No secrets are needed in this frontend repository.
