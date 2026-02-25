const { validationResult } = require('express-validator');

/**
 * Reads express-validator results and returns 422 if any errors exist.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }
    next();
};

module.exports = validate;
