const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
    enquiry_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Enquiry',
        required: true
    },
    type: {
        type: String,
        enum: ['BUYBACK', 'SERVICE'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'INR',
        trim: true
    },
    status: {
        type: String,
        enum: ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        default: 'SENT',
        required: true
    }
}, { timestamps: true });

// Create indexes for better query performance
quoteSchema.index({ service_intent_id: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ valid_till: 1 });
quoteSchema.index({ quote_type: 1 });

// Add a method to check if quote has expired
quoteSchema.methods.isExpired = function() {
    return new Date() > this.valid_till;
};

// Pre-save middleware to auto-expire quotes
quoteSchema.pre('find', function() {
    this.where({ valid_till: { $gte: new Date() } });
});

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;