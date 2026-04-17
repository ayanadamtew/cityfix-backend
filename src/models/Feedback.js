const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Feedback extends Model {}

Feedback.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // issueId and citizenId are added as FK associations in models/index.js
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 },
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'Feedback',
        tableName: 'feedbacks',
        timestamps: true,
        updatedAt: false,
        indexes: [
            // One feedback per citizen per issue
            { unique: true, fields: ['issueId', 'citizenId'] },
        ],
    }
);

module.exports = Feedback;
