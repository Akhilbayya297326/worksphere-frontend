import axios from 'axios';
import { resolveServiceUrls } from './config';

const urls = resolveServiceUrls({
    apiUrl: import.meta.env.VITE_API_URL,
    socketUrl: import.meta.env.VITE_SOCKET_URL,
    production: import.meta.env.PROD,
    origin: window.location.origin,
});
export const API_BASE_URL = urls.apiBaseUrl;
export const SOCKET_URL = urls.socketUrl;

const API = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

API.interceptors.request.use((req) => {
    const token = localStorage.getItem('auth_token');
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
});

export default API;
