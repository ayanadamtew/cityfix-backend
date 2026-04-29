const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

const VERIFICATION_STATUSES = ['Pending', 'Approved', 'Rejected'];

class CompletionProof extends Model {}

CompletionProof.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        // assignmentId, technicianId, verifiedById are added as FK associations in models/index.js
        beforePhotoUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        afterPhotoUrl: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        submittedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        verificationStatus: {
            type: DataTypes.ENUM(...VERIFICATION_STATUSES),
            allowNull: false,
            defaultValue: 'Pending',
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: 'CompletionProof',
        tableName: 'completion_proofs',
        timestamps: true,
    }
);

module.exports = CompletionProof;
