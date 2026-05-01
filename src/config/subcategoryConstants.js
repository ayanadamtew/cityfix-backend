/**
 * Central definition of category → subcategory mappings.
 * Used across API validation, technician specialization, and analytics.
 */
const SUBCATEGORIES = {
    Water: [
        'Pipe Leakage',
        'Water Supply Interruption',
        'Drainage Blockage',
        'Sewer Overflow',
        'Broken Water Pipe',
        'Low Water Pressure',
    ],
    Road: [
        'Pothole',
        'Road Crack',
        'Road Blockage',
        'Damaged Sidewalk',
        'Broken Traffic Sign',
        'Flooded Road',
    ],
    Electricity: [
        'Street Light Failure',
        'Power Outage',
        'Exposed Wire',
        'Damaged Electric Pole',
        'Transformer Issue',
        'Electrical Hazard',
    ],
    Waste: [
        'Uncollected Garbage',
        'Overflowing Bin',
        'Illegal Dumping',
        'Blocked Waste Channel',
        'Dead Animal Removal',
        'Recycling Issue',
    ],
};

/**
 * Flat list of all valid subcategory strings.
 */
const ALL_SUBCATEGORIES = Object.values(SUBCATEGORIES).flat();

/**
 * All valid category names.
 */
const ALL_CATEGORIES = Object.keys(SUBCATEGORIES);

module.exports = { SUBCATEGORIES, ALL_SUBCATEGORIES, ALL_CATEGORIES };
