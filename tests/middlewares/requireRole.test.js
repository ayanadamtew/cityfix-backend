const requireRole = require('../../src/middlewares/requireRole');

describe('requireRole middleware', () => {
    const makeReq = (role) => ({ user: role ? { role } : undefined });
    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    it('calls next() when user role is in allowed list', () => {
        const req = makeReq('SUPER_ADMIN');
        const res = mockRes();
        const next = jest.fn();
        requireRole(['SUPER_ADMIN', 'SECTOR_ADMIN'])(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('returns 403 when user role is not in allowed list', () => {
        const req = makeReq('CITIZEN');
        const res = mockRes();
        const next = jest.fn();
        requireRole(['SUPER_ADMIN'])(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when req.user is undefined', () => {
        const req = makeReq(undefined);
        const res = mockRes();
        const next = jest.fn();
        requireRole(['CITIZEN'])(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows multiple roles', () => {
        const req = makeReq('SECTOR_ADMIN');
        const res = mockRes();
        const next = jest.fn();
        requireRole(['SECTOR_ADMIN', 'SUPER_ADMIN'])(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('403 message includes the required roles', () => {
        const req = makeReq('CITIZEN');
        const res = mockRes();
        requireRole(['SUPER_ADMIN'])(req, res, jest.fn());
        const jsonArg = res.json.mock.calls[0][0];
        expect(jsonArg.message).toContain('SUPER_ADMIN');
    });
});
