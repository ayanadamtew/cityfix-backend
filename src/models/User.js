const mongoose = require('mongoose');

const DEPARTMENTS = ['Water', 'Waste', 'Road', 'Electricity'];
const ROLES = ['CITIZEN', 'SECTOR_ADMIN', 'SUPER_ADMIN'];

const userSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        role: {
            type: String,
            enum: ROLES,
            required: true,
            default: 'CITIZEN',
        },
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        phoneNumber: { type: String, trim: true },
        department: {
            type: String,
            enum: DEPARTMENTS,
            required: function () {
                return this.role === 'SECTOR_ADMIN';
            },
        },
        // Firebase Cloud Messaging token for push notifications (set by mobile on login)
        fcmToken: { type: String, default: null },
        isDisabled: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
