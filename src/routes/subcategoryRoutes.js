const express = require('express');
const router = express.Router();
const { SUBCATEGORIES, ALL_CATEGORIES } = require('../config/subcategoryConstants');

/**
 * GET /api/subcategories
 * Returns the full category → subcategory mapping.
 */
router.get('/', (req, res) => {
    res.json({ categories: ALL_CATEGORIES, subcategories: SUBCATEGORIES });
});

/**
 * GET /api/subcategories/:category
 * Returns the subcategories for a specific category.
 */
router.get('/:category', (req, res) => {
    const { category } = req.params;
    const subs = SUBCATEGORIES[category];

    if (!subs) {
        return res.status(404).json({ message: `Category "${category}" not found.` });
    }

    res.json({ category, subcategories: subs });
});

module.exports = router;
