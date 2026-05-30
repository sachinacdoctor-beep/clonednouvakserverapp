const mongoose = require('mongoose');

const promotionalSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
    },
    type: {
        type: String, default: "Promotion"
    }
}, { timestamps: true });

const PromotionalNotification = mongoose.model('PromotionalNotification', promotionalSchema);

module.exports = PromotionalNotification;
