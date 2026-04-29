const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class StatusHistory extends Model {}

StatusHistory.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // issueId, changedById are added as FK associations in models/index.js
        fromStatus: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        toStatus: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'StatusHistory',
        tableName: 'status_histories',
        timestamps: true,
    }
);

module.exports = StatusHistory;
