import axios from 'axios';

// 🚀 LIVE RAILWAY PRODUCTION URL
const BACKEND_URL = 'https://worksphere-backend-production-e720.up.railway.app';

// Create a centralized Axios instance
const API = axios.create({
    baseURL: `${BACKEND_URL}/api`, 
    headers: {
        'Content-Type': 'application/json'
    }
});

// Enterprise Interceptor for Authentication Tokens
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
}, (error) => {
    return Promise.reject(error);
});

// Intercept responses to handle global errors
API.interceptors.response.use((res) => res, (error) => {
    if (error.response && error.response.status === 401) {
        console.warn("Unauthorized access. Token may be expired.");
    }
    return Promise.reject(error);
});

export default API;