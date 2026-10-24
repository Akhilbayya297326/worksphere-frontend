// Preserve the backend already used by the hosted frontend; deployments can override it.
const PRODUCTION_BACKEND = 'https://worksphere-backend-production-e720.up.railway.app';

export function resolveServiceUrls({ apiUrl, socketUrl, production = false, origin }) {
    const apiBaseUrl = (apiUrl || (production ? `${PRODUCTION_BACKEND}/api` : '/api')).replace(/\/+$/, '');
    return {
        apiBaseUrl,
        socketUrl: socketUrl || new URL(apiBaseUrl, origin).origin,
    };
}
