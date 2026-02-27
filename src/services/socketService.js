const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        // Optional: allow clients to join a specific issue room to receive comment updates 
        // without broadcasting to everyone, though simple broadcast works for a small app.
        socket.on('join_issue', (issueId) => {
            socket.join(`issue_${issueId}`);
            console.log(`[Socket.io] Socket ${socket.id} joined room issue_${issueId}`);
        });

        socket.on('leave_issue', (issueId) => {
            socket.leave(`issue_${issueId}`);
            console.log(`[Socket.io] Socket ${socket.id} left room issue_${issueId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIo };
