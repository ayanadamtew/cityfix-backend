const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { register, getMe } = require('../controllers/authController');
const requireAuth = require('../middlewares/requireAuth');
const validate = require('../middlewares/validate');

// POST /api/auth/register
router.post(
    '/auth/register',
    [
        body('fullName').notEmpty().withMessage('fullName is required.'),
        body('role')
            .optional()
            .isIn(['CITIZEN', 'SECTOR_ADMIN', 'SUPER_ADMIN'])
            .withMessage('Invalid role.'),
        body('department')
            .if(body('role').equals('SECTOR_ADMIN'))
            .notEmpty()
            .isIn(['Water', 'Waste', 'Road', 'Electricity'])
            .withMessage('department is required for SECTOR_ADMIN.'),
    ],
    validate,
    register
);

// GET /api/users/me
router.get('/users/me', requireAuth, getMe);

module.exports = router;
