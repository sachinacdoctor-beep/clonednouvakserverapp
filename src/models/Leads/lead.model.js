const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    leadId: { type: String, trim: true, default: "" },
    place: { type: String, trim: true, default: "" },
    quantity: { type: Number, default: 0 },
    comment: { type: String, trim: true },
    username: { type: String, trim: true, required: false },
    phoneNumber: { type: String, trim: true, required: false },
    user_id: { type: mongoose.Types.ObjectId, ref: "User", required: true },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    enquiryId:{
      type: mongoose.Types.ObjectId
    },
    acDetails: [
      {
        acType: {
          type: String,
          trim: true,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  { timestamps: true }
);

const lead = mongoose.model('Lead', leadSchema);

module.exports = lead;
