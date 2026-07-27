// File: frontend/src/services/api.js
import axios from 'axios';

// Create a centralized Axios instance
const API = axios.create({
    baseURL: 'http://localhost:5000/api', // Points directly to your Express backend
    headers: {
        'Content-Type': 'application/json'
    }
});

// Optional: Enterprise Interceptor for Authentication Tokens
// If you add JWT authentication later, this automatically attaches the token to every request.
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
}, (error) => {
    return Promise.reject(error);
});

// Intercept responses to handle global errors (like 401 Unauthorized)
API.interceptors.response.use((res) => res, (error) => {
    if (error.response && error.response.status === 401) {
        console.warn("Unauthorized access. Token may be expired.");
        // window.location.href = '/login'; // Redirect to login if needed
    }
    return Promise.reject(error);
});

export default API;