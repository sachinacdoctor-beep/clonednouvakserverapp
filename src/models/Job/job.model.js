const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    enquiry_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Enquiry',
        required: true
    },
    assignment_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    technician_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Technician',
        required: true
    },
    instructions: [{
        type: String,
        trim: true,
        default: ''
    }],
    status: {
        type: String,
        enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_SHOW', 'PENDING'],
        required: true,
        default: 'ASSIGNED',
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
        default: null
    },
    remarks: {
        type: String,
        trim: true,
        default: ''
    },
    schedule: {
        slot: {
            type: String,
            enum: ['FIRST_HALF', 'SECOND_HALF'],
            required: true
        },
        date: { type: Date, required: true },
    },
    // serviceReport: {
    //     photosBefore: [{ type: String }],
    //     photosAfter: [{ type: String }],
    //     inspectionNotes: { type: String, trim: true, default: '' },
    //     workDone: { type: String, trim: true, default: '' },
    // },
}, { timestamps: true });

// Create indexes for better query performance
jobSchema.index({ booking_id: 1 });
jobSchema.index({ assignment_id: 1 });
jobSchema.index({ technician_id: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ startedAt: 1 });

// Validation: completedAt should be after startedAt if both exist
jobSchema.pre('save', function(next) {
    if (this.startedAt && this.completedAt && this.completedAt < this.startedAt) {
        next(new Error('Completed date cannot be before started date'));
    }
    next();
});

// Method to calculate job duration
jobSchema.methods.getDuration = function() {
    if (this.startedAt && this.completedAt) {
        return Math.floor((this.completedAt - this.startedAt) / (1000 * 60)); // Duration in minutes
    }
    return null;
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;