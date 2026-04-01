const validate = require('../../src/middlewares/validate');
const { validationResult } = require('express-validator');

jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));

describe('Validate Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next() if there are no validation errors', () => {
        validationResult.mockReturnValue({
            isEmpty: () => true
        });

        validate(mockReq, mockRes, mockNext);

        expect(validationResult).toHaveBeenCalledWith(mockReq);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 422 with errors if validation errors exist', () => {
        const errorsArray = [{ msg: 'Invalid email format' }];
        validationResult.mockReturnValue({
            isEmpty: () => false,
            array: () => errorsArray
        });

        validate(mockReq, mockRes, mockNext);

        expect(validationResult).toHaveBeenCalledWith(mockReq);
        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith({ errors: errorsArray });
        expect(mockNext).not.toHaveBeenCalled();
    });
});
