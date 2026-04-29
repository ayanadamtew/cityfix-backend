const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const ASSIGNMENT_STATUSES = ['Assigned', 'In Progress', 'Waiting Verification', 'Resolved', 'Rejected'];

class Assignment extends Model {}

Assignment.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // issueId, technicianId, assignedById are added as FK associations in models/index.js
        priority: {
            type: DataTypes.ENUM(...PRIORITIES),
            allowNull: false,
            defaultValue: 'Medium',
        },
        deadline: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(...ASSIGNMENT_STATUSES),
            allowNull: false,
            defaultValue: 'Assigned',
        },
    },
    {
        sequelize,
        modelName: 'Assignment',
        tableName: 'assignments',
        timestamps: true,
    }
);

module.exports = Assignment;
