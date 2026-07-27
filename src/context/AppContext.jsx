import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import API from '../services/api';

const AppContext = createContext();

// 🚀 HARDCODED LIVE RENDER URL
const BACKEND_URL = 'https://worksphere-backend-thoi.onrender.com';

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [socket, setSocket] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);

    useEffect(() => {
        // 1. Fetch Permanent Chat History from Database
        const fetchHistory = async () => {
            try {
                const { data } = await API.get('/chat');
                if (data.success) {
                    setChatMessages(data.messages);
                }
            } catch (error) {
                console.error("Failed to load global chat history", error);
            }
        };
        fetchHistory();

        // 2. Initialize WebSocket Connection with robust transport fallbacks
        const newSocket = io(BACKEND_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });

        setSocket(newSocket);

        // Listen for incoming messages from ANY user or system trigger
        newSocket.on('receive_message', (msg) => {
            setChatMessages((prev) => {
                // Prevent duplicate UI rendering if the sender already optimistically added it
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => newSocket.disconnect();
    }, []);

    // 🚀 Enterprise Chat Notification Engine
    const addChatMessage = (msg) => {
        // Create the message object
        const enrichedMsg = { 
            ...msg, 
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        
        // Optimistically update the UI instantly for the sender
        setChatMessages(prev => [...prev, enrichedMsg]);
        
        // Emit to backend to save in DB and broadcast to team
        if (socket) {
            socket.emit('send_message', enrichedMsg);
        }
    };

    return (
        <AppContext.Provider value={{ user, setUser, socket, chatMessages, addChatMessage }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within an AppProvider");
    return context;
};