import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import API, { SOCKET_URL } from '../services/api';
import { mergeMessages } from '../services/messages';
import { createWorkspaceSocket } from '../services/socket';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [user, updateUser] = useState(null);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatError, setChatError] = useState('');
    const userId = user?._id;

    const setUser = (nextUser) => {
        if (nextUser) API.defaults.headers.common['x-user-role'] = nextUser.role;
        else {
            delete API.defaults.headers.common['x-user-role'];
            localStorage.removeItem('auth_token');
        }
        updateUser(nextUser);
    };

    useEffect(() => {
        if (!userId) return;
        const controller = new AbortController();
        let active = true;
        const newSocket = createWorkspaceSocket(SOCKET_URL);
        setSocket(newSocket);

        const fetchHistory = async () => {
            try {
                const { data } = await API.get('/chat', { signal: controller.signal });
                if (active && data.success) {
                    setChatMessages(previous => mergeMessages(data.messages || [], previous));
                    setChatError('');
                }
            } catch (error) {
                if (active && error.code !== 'ERR_CANCELED') setChatError('Chat history could not be loaded. Reconnect to retry.');
            }
        };
        newSocket.on('connect', () => {
            setIsConnected(true);
            fetchHistory();
        });
        newSocket.on('disconnect', () => setIsConnected(false));
        newSocket.on('connect_error', () => {
            setIsConnected(false);
            setChatError('Chat connection is unavailable. Reconnecting...');
        });
        newSocket.on('receive_message', message => {
            setChatMessages(previous => mergeMessages(previous, [message]));
        });
        newSocket.connect();
        fetchHistory();

        return () => {
            active = false;
            controller.abort();
            newSocket.disconnect();
            setSocket(null);
            setIsConnected(false);
            setChatMessages([]);
            setChatError('');
        };
    }, [userId]);

    const addChatMessage = useCallback(async (message) => {
        if (!socket?.connected) {
            setChatError('Message was not sent. Wait for the chat connection to recover.');
            return false;
        }
        const outgoing = {
            author: user?.name || 'Staff',
            role: user?.role || 'Staff',
            ...message,
            timestamp: new Date().toISOString(),
            clientId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        return new Promise(resolve => {
            socket.timeout(15000).emit('send_message', outgoing, (error, response) => {
                if (error || !response?.success) {
                    setChatError(response?.error || 'Message delivery could not be confirmed. Check chat history before retrying.');
                    resolve(false);
                    return;
                }
                setChatMessages(previous => mergeMessages(previous, [response.message]));
                setChatError('');
                resolve(true);
            });
        });
    }, [socket, user]);

    return (
        <AppContext.Provider value={{ user, setUser, socket, isConnected, chatMessages, chatError, addChatMessage }}>
            {children}
        </AppContext.Provider>
    );
};

// The hook shares the provider's context by design.
// eslint-disable-next-line react/only-export-components
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};
