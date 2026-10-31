import { io } from 'socket.io-client';

export function createWorkspaceSocket(url) {
    return io(url, {
        // Register listeners before opening a connection. Starting with WebSocket
        // avoids reusing a polling session during a load-balancer upgrade.
        autoConnect: false,
        transports: ['websocket', 'polling'],
        tryAllTransports: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
    });
}
