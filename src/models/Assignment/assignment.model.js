const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    enquiry_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Enquiry',
        required: true
    },
    technician_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Technician',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true,
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    unassignedAt: {
        type: Date,
        default: null
    },
    reason: {
        type: String,
        trim: true,
        default: ''
    },
    type: {
        type: String,
        enum: ['INSPECTION', 'WORK'],
        required: true
    }
}, { timestamps: true });

// Create indexes for better query performance
assignmentSchema.index({ enquiry_id: 1 });
assignmentSchema.index({ technician_id: 1 });
assignmentSchema.index({ isActive: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;