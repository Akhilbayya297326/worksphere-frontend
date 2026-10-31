# Frontend on Vercel, backend on Render

Deploy the backend first using its [Render guide](https://github.com/Akhilbayya297326/worksphere-backend/blob/main/DEPLOYMENT.md). Copy its actual HTTPS service URL and check `/api/health/ready` returns HTTP 200 with a connected database.

1. Open [Vercel New Project](https://vercel.com/new) and import `Akhilbayya297326/worksphere-frontend`, branch `main`.
2. Leave Root Directory empty: the application is already at the repository root. Select Vite, Node.js 24, install command `npm ci`, build command `npm run build`, and output directory `dist`. These build settings are also in `vercel.json`.
3. Add the following public environment variables for Production, and Preview if previews should use this backend:

   ```dotenv
   VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
   VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com
   ```

   Replace the placeholder hostname with the actual Render service URL. The API value includes `/api`; the socket value does not. Override any older Railway values. Never put MongoDB, Gemini, GitHub, or Jira secrets in `VITE_*` variables, because these values are included in the public browser build.

4. Deploy and copy the actual Vercel production origin.
5. Set Render `CORS_ORIGINS` to that exact HTTPS origin without a trailing slash; save and wait for the backend to become healthy. Multiple allowed origins can be comma-separated. Each preview deployment requires its own exact allowed origin; wildcard preview patterns are not implemented.
6. Open the Vercel URL, log in with an existing employee account's actual password, and check that browser API/socket requests use Render. The `vercel.json` rewrite handles SPA deep links; Socket.IO connects directly to Render.

Vite replaces environment values at build time. After changing Vercel environment variables, redeploy. The previous Railway production fallback is retained until Render values are provided so an existing deployment is not redirected prematurely; it is not the Render migration target. Local development continues using Vite's proxy to port 5000 when these variables are unset.

## Checks and common errors

Run `npm test`, `npm run lint`, and `npm run build` before publishing. The output is `dist/`; do not upload `node_modules`, local `.env` files, or backend credentials.

- If requests still go to Railway, update Vercel's Production variables and rebuild.
- If requests go to the Vercel origin's `/api`, check the configured public backend URL and rebuild.
- For CORS errors, compare the browser's exact origin with Render's allowed origins.
- For failed login or persistence, verify Render's database readiness endpoint and logs.
- A sleeping Render Free backend can take about a minute to wake; retry after it starts.

### Socket connection errors

The client starts with WebSocket and tries HTTP polling if that connection is rejected. Automatic reconnect uses a backoff; restarting Render or deploying a new version can still briefly disconnect live updates. Persisted chat history is reloaded after reconnection.

If an HTTP 400 response contains `{"code":1,"message":"Session ID unknown"}`, the request is using a session the receiving backend no longer knows. This can happen after a restart or when polling requests reach different service instances. WebSocket-first avoids the polling-to-WebSocket upgrade during normal connections. Polling fallback still needs session affinity if multiple instances serve the app; do not scale the current single-process/local-upload setup without addressing that requirement.

Keep `VITE_SOCKET_URL` at the Render origin, without `/api` or `/socket.io`. After a frontend update reaches Vercel, reload the page to discard any old in-memory socket session. If errors continue, inspect the failed request's JSON response and the corresponding Render restart/deploy logs.

The current authentication remains a prototype, and some integrations are demonstration-only or unavailable. Use demonstration data until server-verified authorization and password hashing are implemented. This configuration does not create a MongoDB database or a paid hosting plan.

References: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json), [Vercel Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vite environment variables](https://vite.dev/guide/env-and-mode.html).
