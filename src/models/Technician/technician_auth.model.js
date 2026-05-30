const { required } = require('joi');
const mongoose = require('mongoose');

const technicianAuthSchema = new mongoose.Schema(
  {
    technician_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
    },
    countryCode: {
      type: String,
      default: "+91",
      required: true,
    },
    phoneNumber: {
      //saves with countrycode.
      type: String,
      required: true,
      length: 12,
      unique: true,
    },
    otp: {
      type: Number,
    },
    otpExpiryTime: {
      type: Number, // timestamp
    },
  },
  { timestamps: true }
);

const TechnicianAuth = mongoose.model('TechnicianAuth', technicianAuthSchema);

module.exports = TechnicianAuth;
