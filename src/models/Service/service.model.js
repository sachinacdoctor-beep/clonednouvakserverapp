const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const serviceSchema = new Schema({
    name: { type: String, index: true },
    icon: { type: String, },
    isActive: { type: Number, default: 1 },
    orderBy: { type: Number, default: 0 },
    description: [{}],
    terms: [{}],
    banner_images: [{
        type: { type: String },
        url: { type: String },
    }],
    category: {
        type: String,
        enum: ['BASIC', 'COPPER_PIPING', 'AMC', 'OTHER'],
    },
    key: String,
    position: { type: Number, default: -1 },
    // Used by the Nouvak User App cart flow — price per unit for this service
    unitPrice: { type: Number, default: 0 },
    // Optional icon URL for dashboard/home-screen display
    iconUrl: { type: String, default: '' },
}, { timestamps: true });

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
