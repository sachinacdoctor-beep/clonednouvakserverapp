const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    booking_id: {
        type: mongoose.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    item_list: [{
        description: String,
        amount: mongoose.Schema.Types.Decimal128,
        required: true
    }],
    payment_status: {
        type: String,
        enum: ['SETTLED', 'PENDING', 'FAILED'],
        default: 'PENDING'
    },
    technician_settlement_status: {
        type: String,
        enum: ['SETTLED', 'PENDING', 'FAILED'],
        default: 'PENDING'
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
