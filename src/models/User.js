const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/db');

const DEPARTMENTS = ['Water', 'Waste', 'Road', 'Electricity'];
const ROLES = ['CITIZEN', 'SECTOR_ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'];

class User extends Model {}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        firebaseUid: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        role: {
            type: DataTypes.ENUM(...ROLES),
            allowNull: false,
            defaultValue: 'CITIZEN',
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: 'users_email_unique',
            validate: { isEmail: true },
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        department: {
            type: DataTypes.ENUM(...DEPARTMENTS),
            allowNull: true,
        },
        fcmToken: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
        },
        isDisabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        specialization: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
        },
        averageRating: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.0,
        },
        ratingCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
    }
);

module.exports = User;
