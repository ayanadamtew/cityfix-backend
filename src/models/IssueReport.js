const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

const CATEGORIES = ['Water', 'Waste', 'Road', 'Electricity'];
const STATUSES = ['Pending', 'In Progress', 'Resolved'];

class IssueReport extends Model {
    /**
     * Returns the nested location object expected by the API consumers.
     * Call this when serialising to JSON manually.
     */
    toLocationObject() {
        return {
            latitude: this.latitude,
            longitude: this.longitude,
            address: this.address,
            kebele: this.kebele,
        };
    }

    /**
     * Override toJSON so route responses automatically present `location`
     * as a nested object and rename `id` consistently.
     */
    toJSON() {
        const values = { ...this.get() };
        values.location = {
            latitude: values.latitude,
            longitude: values.longitude,
            address: values.address,
            kebele: values.kebele,
        };
        delete values.latitude;
        delete values.longitude;
        delete values.address;
        delete values.kebele;
        return values;
    }
}

IssueReport.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // citizenId and assignedAdminId are added as FK associations in models/index.js
        category: {
            type: DataTypes.ENUM(...CATEGORIES),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        photoUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
        },
        // Flattened location fields
        latitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
        },
        longitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        kebele: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(...STATUSES),
            allowNull: false,
            defaultValue: 'Pending',
        },
        urgencyCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        commentCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        draftedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
        },
    },
    {
        sequelize,
        modelName: 'IssueReport',
        tableName: 'issue_reports',
        timestamps: true,
        indexes: [
            { fields: ['kebele'] },
            { fields: ['urgencyCount'] },
            { fields: ['createdAt'] },
        ],
    }
);

module.exports = IssueReport;
