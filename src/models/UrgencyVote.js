const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class UrgencyVote extends Model {}

UrgencyVote.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // issueId and citizenId are added as FK associations in models/index.js
    },
    {
        sequelize,
        modelName: 'UrgencyVote',
        tableName: 'urgency_votes',
        timestamps: true,
        updatedAt: false,
        indexes: [
            // One vote per citizen per issue
            { unique: true, fields: ['issueId', 'citizenId'] },
        ],
    }
);

module.exports = UrgencyVote;
