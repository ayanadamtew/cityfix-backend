const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class ReportedPost extends Model {}

ReportedPost.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // issueId and citizenId are added as FK associations in models/index.js
        reason: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'ReportedPost',
        tableName: 'reported_posts',
        timestamps: true,
        updatedAt: false,
    }
);

module.exports = ReportedPost;
