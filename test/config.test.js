import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveServiceUrls } from '../src/services/config.js';

test('local development keeps HTTP and sockets on the Vite proxy', () => {
    assert.deepEqual(resolveServiceUrls({ origin: 'http://localhost:5173' }), {
        apiBaseUrl: '/api', socketUrl: 'http://localhost:5173',
    });
});

test('production builds retain the existing hosted backend without extra deployment variables', () => {
    assert.deepEqual(resolveServiceUrls({ production: true, origin: 'https://frontend.example.com' }), {
        apiBaseUrl: 'https://worksphere-backend-production-e720.up.railway.app/api',
        socketUrl: 'https://worksphere-backend-production-e720.up.railway.app',
    });
});

test('custom API host also selects its socket origin unless explicitly overridden', () => {
    assert.deepEqual(resolveServiceUrls({ apiUrl: 'https://custom.example.com/api/', origin: 'https://frontend.example.com' }), {
        apiBaseUrl: 'https://custom.example.com/api', socketUrl: 'https://custom.example.com',
    });
    assert.equal(resolveServiceUrls({ apiUrl: 'https://custom.example.com/api', socketUrl: 'https://socket.example.com', origin: 'https://frontend.example.com' }).socketUrl,
        'https://socket.example.com');
});

test('production can explicitly use same-origin API routing', () => {
    assert.deepEqual(resolveServiceUrls({ apiUrl: '/api/', production: true, origin: 'https://app.example.com' }), {
        apiBaseUrl: '/api', socketUrl: 'https://app.example.com',
    });
});
