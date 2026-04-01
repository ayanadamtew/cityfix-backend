const { Server } = require('socket.io');
const { initSocket, getIo } = require('../../src/services/socketService');

jest.mock('socket.io');

describe('Socket Service', () => {
    let mockOn;
    
    beforeEach(() => {
        mockOn = jest.fn();
        Server.mockClear();
        Server.mockImplementation(() => {
            return {
                on: mockOn
            };
        });
    });

    it('should throw an error if getIo is called before initSocket', () => {
        expect(() => getIo()).toThrow('Socket.io is not initialized!');
    });

    it('should initialize socket and register connection events', () => {
        const mockServer = {};
        const io = initSocket(mockServer);
        
        expect(Server).toHaveBeenCalledWith(mockServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
            },
        });
        
        expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
        
        // Ensure getIo returns the initialized io instance
        expect(getIo()).toBe(io);
    });
});
