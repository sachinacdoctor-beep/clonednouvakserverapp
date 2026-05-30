const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    technicianId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Technician',
        required: true,
    },
    startDate: {
        type: Date,
        // required: true,
    },
     endDate: {
        type: Date,
        // required: true,
    },
    halfDay: {
        type: Boolean,
        default: false
    },
    whichHalf: {
        type: String,
        enum: ['FIRST_HALF', 'SECOND_HALF'],
        default: null
    },
    leaveType: {
        type: String,
        enum: ['SICK_LEAVE', 'CASUAL_LEAVE', 'PAID_LEAVE'],
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    reason: {
        type: String,
        default: ''
    },
}, { timestamps: true });

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
