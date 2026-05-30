const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    // senderId: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: ''},
    text: { type: String, default: '' },
    isChecked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false},

}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
