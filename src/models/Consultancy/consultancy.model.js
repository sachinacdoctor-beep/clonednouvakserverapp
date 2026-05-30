const mongoose = require('mongoose');

const consultancySchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    enquiryId: { type: mongoose.Types.ObjectId, required: true },
    brandId: { type: mongoose.Types.ObjectId, ref: 'Brand', required: true },
    quantity: {
        type: String, default: '',
    },
    comment: { type: String, default: '' },
    place: { type: String, default: '' },
    consultancyId: { type: String, default: '' },
    serviceName: [{}],
    addressDetails: {},
    slot: {
        type: String,
        enum: ['FIRST_HALF', 'SECOND_HALF'],
        required: true
    },
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: [
            'BOOKED', 'COMPLETE', 'CANCELLED', 'CLOSED'
        ],
        default: 'BOOKED',
        required: true
    },
    documentURL: { type: String, default: '' },
    alternatePhone: { type: String, default: '' },

}, { timestamps: true });

const Consultancy = mongoose.model('Consultancy', consultancySchema);

module.exports = Consultancy;
