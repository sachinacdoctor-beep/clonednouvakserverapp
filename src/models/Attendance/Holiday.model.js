const mongoose = require('mongoose');

const holidayModel = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true,
    },
    type: {
        type: String,
        enum: ['PUBLIC_HOLIDAY', 'FESTIVAL', 'COMPANY_HOLIDAY'],
        required: true
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Holiday = mongoose.model('Holiday', holidayModel);

module.exports = Holiday;
