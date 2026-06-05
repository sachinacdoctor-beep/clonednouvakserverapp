const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    type: {
        type: Number
    },
    role: {
        type: String,
        default: 'FOUNDER',
    },
    department: {
        type: String,
        enum: ['MARKETING_SALES', 'SERVICE_OPS', null],
        default: null,
    },
    useCustomPermissions: {
        type: Boolean,
        default: false,
    },
    customPermissions: {
        modules: {
            view:   { type: [String], default: [] },
            create: { type: [String], default: [] },
            edit:   { type: [String], default: [] },
            delete: { type: [String], default: [] },
        },
    },
    refreshToken: {
        type: String,
    },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
