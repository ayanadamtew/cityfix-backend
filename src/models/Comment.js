const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

class Comment extends Model {}

Comment.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // issueId and authorId are added as FK associations in models/index.js
        text: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'Comment',
        tableName: 'comments',
        timestamps: true,
        updatedAt: false,
    }
);

module.exports = Comment;
