const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        couponCode: {
            type: String,
            required: true,
            trim: true,
        },
        image: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        discount: {
            type: Number,
            required: true,
            min: 0,
        },
        minValue: {
            type: Number,
            required: true,
            min: 0,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        description: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
