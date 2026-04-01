const errorHandler = require('../../src/middlewares/errorHandler');

describe('Error Handler Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let consoleSpy;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        // Silence console.error to keep test output clean
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('should return 500 and default message if error has no status or message', () => {
        const err = new Error();
        
        errorHandler(err, mockReq, mockRes, mockNext);
        
        expect(consoleSpy).toHaveBeenCalledWith(err.stack);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    });

    it('should return error status and message if provided', () => {
        const err = new Error('Custom Validation Error');
        err.statusCode = 400;
        
        errorHandler(err, mockReq, mockRes, mockNext);
        
        expect(consoleSpy).toHaveBeenCalledWith(err.stack);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Custom Validation Error' });
    });
});
