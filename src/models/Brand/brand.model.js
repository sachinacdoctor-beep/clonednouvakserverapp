const mongoose = require('mongoose');

const errorCodeSchema = new mongoose.Schema({
    code: { type: String, trim: true, default: '' },
    acType: { type: String, trim: true, default: '' },
    models: { type: String, trim: true, default: '' },
    solution: [{ type: String, trim: true }],
    category: {
        type: String,
        enum: ['INVERTOR', 'NON_INVERTOR'],
        default: 'NON_INVERTOR'
    },
    description: { type: String, trim: true, default: ''},
});


const brandSchema = new mongoose.Schema({
    name: { type: String, trim: true, default: '' },
    brandLogoUrl: {type: String, trim: true, default: ''},
    isActive: { type: Number, default: 1 },
    globalErrorCodes: [errorCodeSchema]
}, { timestamps: true });

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;

